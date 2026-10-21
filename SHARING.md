# 다른 컴퓨터에서 편집하기

이 소스 묶음은 비밀번호/환경설정 실값, 거래 DB, 개인 사진 카탈로그, 실측 매물 JSON과 HTML, 스크린샷을 포함하지 않습니다. reference/legacy-photos.json은 빈 배열로 대체했습니다. 원본 프로젝트는 변경하지 않았습니다. 실제 Supabase 연결 설정은 별도로 안전하게 설정하세요. 기존 DB에는 초기 SQL을 다시 실행하지 마세요.

2026-10-21 현재 GitHub 커밋의 Vercel 배포 성공이 확인됐습니다. 코드를 올린 후에는 커밋의 Vercel 상태를 확인하세요.

새 컴퓨터에서 실행하려면 Node.js 20.9 이상을 준비하고, 저장소를 내려받아 npm install을 실행한 뒤 .env.example을 .env.local로 복사해 기존 Supabase 연결 설정을 넣고 npm run dev를 실행합니다. 비밀 설정 파일은 GitHub에 올리지 마세요.

환경변수를 넣기 전 연결 안내 화면이 나오는 것은 정상입니다. GitHub 저장소 주소 자체는 장부 웹사이트 주소가 아닙니다. 장부 사용 주소는 https://carrot-pc-ledger.vercel.app/ 입니다.
