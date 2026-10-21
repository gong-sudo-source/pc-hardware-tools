import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {z} from 'zod';
import {categories} from '../../../lib/domain';
export const runtime='nodejs';
const requestSchema=z.object({name:z.string().trim().min(1).max(200),category:z.enum(categories)}).strict();
export async function POST(req:NextRequest){
 const reply=(error:string,status:number)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return reply('Supabase 설정이 필요합니다.',503);
 const bearer=req.headers.get('authorization');
 if(!bearer?.startsWith('Bearer '))return reply('로그인이 필요합니다.',401);
 const client=createClient(url,key,{global:{headers:{Authorization:bearer}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.getUser(bearer.slice(7));
 if(error||!data.user)return reply('세션이 만료되었습니다. 다시 로그인하세요.',401);
 if(process.env.ALLOWED_EMAIL&&data.user.email?.toLowerCase()!==process.env.ALLOWED_EMAIL.toLowerCase())return reply('허용되지 않은 계정입니다.',403);
 const allowed=await client.rpc('is_allowed');
 if(allowed.error||allowed.data!==true)return reply('허용되지 않은 계정입니다.',403);
 const raw=await req.text();if(raw.length>2048)return reply('요청이 너무 큽니다.',413);
 try{requestSchema.parse(JSON.parse(raw))}catch{return reply('분류와 모델명을 확인하세요.',400)}
 // Server-only integration boundary. Do not invent market prices without a
 // verified pricing source, persistent rate limiting and a validated response.
 if(!process.env.OPENAI_API_KEY)return reply('AI API 키가 없습니다. 추천가를 직접 입력할 수 있습니다.',503);
 return reply('AI 가격추천은 준비 단계입니다. 시세 출처·요청 한도 설정 후 서버에서 활성화하세요. 추천가를 직접 입력할 수 있습니다.',503);
}
