'use client';
import {useEffect,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {db,configured} from '../lib/supabase';
import {backupSchema,pcSchema,type PC} from '../lib/domain';
import {convertLegacy} from '../lib/legacy-import';
import Ledger,{type LibraryPhoto} from '../components/ledger';
import {download,makeBackup,portableHtml,readImport,uploadDataImage} from '../lib/backup';
import './legacy.css';
export default function Home(){
 const [session,setSession]=useState<Session|null>(null),[loading,setLoading]=useState(true),[pcs,setPcs]=useState<PC[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState('');
 useEffect(()=>{if(!db){setLoading(false);return;}db.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});const {data}=db.auth.onAuthStateChange((_e,s)=>{setSession(s);setPcs([])});return()=>data.subscription.unsubscribe()},[]);
 async function reload(){const {data,error}=await db!.from('pcs').select('*').order('purchase_date',{ascending:false});if(error)throw error;setPcs((data??[]).map(p=>pcSchema.parse(p)));}
 useEffect(()=>{if(session)reload().catch(e=>setMessage(e.message))},[session]);
 async function run(fn:()=>Promise<void>){setBusy(true);setMessage('');try{await fn()}catch(e){setMessage(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 async function save(raw:PC){const pc=pcSchema.parse(raw);const {updated_at,...record}=pc;const query=updated_at?db!.from('pcs').update(record).eq('id',pc.id).eq('updated_at',updated_at):db!.from('pcs').insert({...record,user_id:session!.user.id});const {data,error}=await query.select().single();if(error){if(error.code==='PGRST116')throw Error('다른 기기에서 변경된 기록입니다. 입력값을 보관하고 새로고침 후 다시 열어주세요.');throw error;}const saved=pcSchema.parse(data);setPcs(list=>[saved,...list.filter(p=>p.id!==saved.id)].sort((a,b)=>b.purchase_date.localeCompare(a.purchase_date)));return saved;}
 async function remove(pc:PC){const {error}=await db!.from('pcs').delete().eq('id',pc.id).eq('updated_at',pc.updated_at!).select().single();if(error)throw error;setPcs(list=>list.filter(p=>p.id!==pc.id));}
 async function library():Promise<LibraryPhoto[]>{const r=await fetch('/api/legacy-photos',{headers:{Authorization:`Bearer ${session!.access_token}`}});const data=await r.json();if(!r.ok)throw Error(data.error);return data;}
 async function upload(file:File){if(file.size>5242880||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('JPG·PNG·WebP 사진을 5MB 이하로 선택하세요.');const path=`${session!.user.id}/${crypto.randomUUID()}`;const {error}=await db!.storage.from('pc-photos').upload(path,file,{contentType:file.type});if(error)throw error;return path;}
 async function restore(file:File){
  const raw=await readImport(file);const uploaded:string[]=[];let records:PC[];
  const isV2=Boolean(raw&&typeof raw==='object'&&'version' in raw&&(raw as {version:unknown}).version===2);
  const converted=isV2?null:convertLegacy(raw);const parsed=isV2?backupSchema.parse(raw):null;
  records=parsed?.pcs??converted!.pcs;const warnings=converted?.warnings??[];
  if(!confirm(`${records.length}대 PC를 기존 기록을 유지하며 추가할까요?${warnings.length?'\n'+warnings.slice(0,5).join('\n'):''}\n여러 번 가져오면 중복 기록이 생깁니다.`))return;
  try{
   records=records.map(p=>({...p,id:crypto.randomUUID(),updated_at:undefined,parts:p.parts.map(x=>({...x,id:crypto.randomUUID()})),photo_path:p.photo_path?.startsWith(session!.user.id+'/')?p.photo_path:null}));
   if(converted?.images.length){const photos=await library();for(const item of converted.images){let image=item.image;const ref=photos.find(p=>p.id===item.photoRef);if(!image&&ref){image=ref.image;records[item.index].photo_crop={y:ref.y,width:ref.width,height:ref.height,originalHeight:ref.originalHeight};}if(image){const path=await uploadDataImage(image,upload);uploaded.push(path);records[item.index].photo_path=path;}}}
   if(parsed?.photos){for(let i=0;i<parsed.pcs.length;i++){const oldPath=parsed.pcs[i].photo_path;if(oldPath&&parsed.photos[oldPath]){const path=await uploadDataImage(parsed.photos[oldPath],upload);uploaded.push(path);records[i].photo_path=path;}}}
   const {error}=await db!.rpc('restore_pcs',{records});if(error)throw error;
  }catch(e){if(uploaded.length)await db!.storage.from('pc-photos').remove(uploaded);throw e;}
  await reload();setMessage(`${records.length}대 PC를 가져왔습니다.${warnings.length?` 날짜 확인이 필요한 항목 ${warnings.length}개가 있습니다.`:''}`);
 }
 async function exportFile(html=false){const backup=await makeBackup(pcs);download(html?portableHtml(backup):JSON.stringify(backup,null,2),`pc-flip-v2-${new Date().toISOString().slice(0,10)}.${html?'html':'json'}`,html?'text/html':'application/json');setMessage(html?'기록·사진이 포함된 열람용 HTML을 저장했습니다.':'기록·사진이 포함된 JSON 백업을 저장했습니다.');}
 if(loading)return <main className="p-10">불러오는 중…</main>;
 if(!configured)return <main className="mx-auto max-w-xl p-10"><h1 className="text-2xl">당근 컴퓨터 쌀먹 V2</h1><p className="mt-5">Supabase 연결 설정이 필요합니다. README에 따라 .env.local을 작성하고 앱을 다시 실행하세요.</p></main>;
 if(!session)return <main className="mx-auto max-w-md p-6 pt-20"><p className="text-orange-600">나만의 PC 거래 장부</p><h1 className="my-4 text-3xl font-bold">당근 컴퓨터 쌀먹 <small>V2</small></h1><form className="card space-y-5" onSubmit={e=>{e.preventDefault();run(async()=>{const {error}=await db!.auth.signInWithPassword({email,password});if(error)throw error;})}}><label>이메일<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>비밀번호<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="primary w-full" disabled={busy}>로그인</button><small>장부용 계정으로 로그인하세요.</small><p role="alert">{message}</p></form></main>;
 return <Ledger pcs={pcs} email={session.user.email??''} message={message} busy={busy} onSave={save} onRemove={remove} onReload={()=>run(reload)} onLogout={()=>run(async()=>{const {error}=await db!.auth.signOut();if(error)throw error;})} onImport={file=>run(()=>restore(file))} onExport={html=>run(()=>exportFile(html))} onUpload={upload} onLibrary={library}/>;
}

