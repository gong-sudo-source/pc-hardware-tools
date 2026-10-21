"""Phase 1 offline verifier. No browser navigation, network, DB writes or API calls."""
import argparse
import csv
import importlib.metadata
import json
import platform
from pathlib import Path

FIELDS = ('title', 'price', 'region', 'canonical_url', 'representative_image', 'description')


def present(item, field):
    if field == 'price':
        value = item.get('price', {}).get('amount')
        return type(value) is int and value >= 0
    return bool(item.get(field))


def summarize(session):
    if session.get('schema_version') != '1.0' or not isinstance(session.get('attempts'), list):
        raise ValueError('지원하지 않는 세션입니다.')
    result = {'session_id': session.get('session_id'), 'basis': 'latest observation per ID per mode',
              'accuracy': None, 'accuracy_note': '필드 존재율은 정답률이 아닙니다. 별도 원문 대조 필요.'}
    for mode in ('list', 'detail'):
        attempts = [a for a in session['attempts'] if a.get('mode') == mode]
        latest = {}
        for a in attempts:
            for item in a.get('items', []):
                if not isinstance(item.get('id'), str):
                    raise ValueError('매물 ID 누락')
                latest[item['id']] = item
        items = list(latest.values())
        fields = FIELDS if mode == 'detail' else FIELDS[:-1]
        n = len(items)
        def rate(count):
            return {'success': count, 'total': n, 'percent': round(count / n * 100, 2) if n else None}
        result[mode] = {'attempts': len(attempts), 'page_errors': sum(bool(a.get('error')) or not a.get('items') for a in attempts),
                        'unique_listings': n,
                        'field_presence': {f: rate(sum(present(i, f) for i in items)) for f in fields},
                        'complete': rate(sum(all(present(i, f) for f in fields) for i in items)),
                        'versions': sorted({i.get('provenance', {}).get('extractor_version', 'unknown') for i in items})}
    return result


def read_session(path):
    if path.stat().st_size > 20 * 1024 * 1024:
        raise ValueError('20MB 이하의 검증 JSON만 지원합니다.')
    return json.loads(path.read_text(encoding='utf-8-sig'))


def main():
    parser = argparse.ArgumentParser(description='당근 Phase 1: 로컬 JSON 검증 전용, 자동 수집 비활성화')
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('check-env')
    sub.add_parser('automation-status')
    report = sub.add_parser('report')
    report.add_argument('file', type=Path)
    report.add_argument('--output', type=Path)
    audit = sub.add_parser('audit-template')
    audit.add_argument('file', type=Path)
    audit.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    if args.command == 'check-env':
        from playwright.sync_api import sync_playwright  # import only; never launch
        result = {'os': platform.system(), 'python': platform.python_version(),
                  'playwright': importlib.metadata.version('playwright'), 'playwright_import_ok': bool(sync_playwright),
                  'browser_launched': False, 'automatic_collection_enabled': False}
    elif args.command == 'automation-status':
        result = json.loads(Path(__file__).with_name('config.json').read_text(encoding='utf-8'))
        # Cannot enable collection by editing a flag: collector does not exist in Phase 1.
        result.update(automatic_collection_enabled=False, collector_implemented=False)
    elif args.command == 'report':
        result = summarize(read_session(args.file))
        if args.output:
            args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    else:
        session = read_session(args.file)
        latest = {}
        for a in session['attempts']:
            for i in a.get('items', []):
                latest[(a['mode'], i['id'])] = i
        with args.output.open('w', encoding='utf-8-sig', newline='') as f:
            columns = ['mode', 'id', 'url', 'title_correct', 'price_correct', 'region_correct',
                       'description_correct', 'representative_photo_correct', 'all_gallery_photos_verified', 'notes']
            writer = csv.DictWriter(f, fieldnames=columns)
            writer.writeheader()
            for (mode, identity), item in latest.items():
                writer.writerow({'mode': mode, 'id': identity, 'url': item['canonical_url']})
        result = {'audit_rows': len(latest), 'accuracy': None, 'note': '빈 대조표입니다. pass/fail/unverified를 원문 확인 후 기입하세요.'}
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
