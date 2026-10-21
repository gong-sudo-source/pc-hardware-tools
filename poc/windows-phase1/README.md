# Windows 11 Phase 1

기존 V2는 Next.js/TypeScript/React + Supabase Auth/Postgres/Storage/RLS이며 Vercel에 배포되어 있습니다. 재작성하지 않습니다. 이 환경은 DB 연결·키·거래 기록을 수정하지 않는 독립 PoC입니다.

작업 폴더: `C:\DaangnWatcher`. Python 가상환경: `.venv`. Chrome 확장: `extension`.

## 확장 설치/실행

1. Chrome에서 `chrome://extensions`를 엽니다.
2. 개발자 모드 → 압축해제된 확장 프로그램 로드 → `C:\DaangnWatcher\extension` 선택.
3. 이전 PoC 확장이 설치되어 있다면 둘을 동시에 사용하지 마세요. **설치 경로가 바뀌면 로컬 저장소가 별개일 수 있으므로 기존 JSON을 먼저 저장**하세요. 기존 폴더에서 계속 사용할 수도 있습니다. 소스 버전은 동일합니다.
4. 직접 검색페이지를 연 후 확장 → 현재 목록 추출. 직접 상세페이지를 연 후 현재 상세 추출.
5. 최종 결과 JSON 저장. 확장 외부로 자동 전송하지 않습니다. URL만 저장하며 사진 파일을 다운로드하지 않습니다.

## Python 실행 (PowerShell)

```powershell
cd C:\DaangnWatcher
.\.venv\Scripts\python.exe main.py check-env
.\.venv\Scripts\python.exe main.py automation-status
.\.venv\Scripts\python.exe main.py report samples\latest-session.json --output reports\latest-summary.json
.\.venv\Scripts\python.exe main.py audit-template samples\latest-session.json --output reports\manual-audit.csv
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

활성화 스크립트를 사용하지 않아 PowerShell 실행 정책 변경이 필요 없습니다. Python은 현재 호스트의 번들 Python 3.12 기반이므로 다른 미니 PC에 가상환경을 복사하지 마세요. 그 PC에 공식 Python을 설치한 뒤 `python -m venv .venv`, `.\.venv\Scripts\python.exe -m pip install -r requirements.txt`로 다시 구성하세요.

report는 매물별 최신 관측 기준 **필드 존재율**을 계산합니다. 확장 팝업은 과거 실패를 포함한 전체 관측 기준이므로 수치가 다를 수 있습니다. 실제 정확도는 CSV의 원문 대조를 완료하기 전 null입니다. 목록 30개와 상세 4개 실측이 있습니다. 상세 30개 및 24시간 안정성 시험 완료를 의미하지 않습니다.

Playwright 패키지는 설치하고 import만 검사했습니다. 당근 자동 수집·로그인·원격 디버깅 연결·브라우저 자동 실행·스케줄러는 없습니다. config를 바꿔도 자동 수집이 켜지지 않습니다. 현재 정책 적합성을 확인하지 못했기 때문입니다. Phase 2~6은 이번 범위에 포함하지 않았습니다.
