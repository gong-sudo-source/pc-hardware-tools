const fs=require('node:fs'),C=require('./extension/core.js');
if(!process.argv[2]){console.error('사용법: node summarize.cjs export.json');process.exit(1)}
const session=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(session.schema_version!=='1.0'||!Array.isArray(session.attempts))throw Error('지원하지 않는 검증 파일입니다.');
console.log(JSON.stringify({session_id:session.session_id,metrics:C.metrics(session.attempts),note:'관측 단위 필드 존재율입니다. 원문 정답률은 수동 대조가 필요합니다.'},null,2));
