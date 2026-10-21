import {createClient} from '@supabase/supabase-js';
import {NextRequest,NextResponse} from 'next/server';
import catalog from '../../../reference/legacy-photos.json';
export async function GET(req:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const authorization=req.headers.get('authorization');
 if(!url||!key||!authorization?.startsWith('Bearer '))return NextResponse.json({error:'로그인이 필요합니다.'},{status:401});
 const db=createClient(url,key,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
 const {data,error}=await db.auth.getUser(authorization.slice(7));
 if(error||!data.user)return NextResponse.json({error:'로그인이 필요합니다.'},{status:401});
 const allowed=await db.rpc('is_allowed');
 if(allowed.error||allowed.data!==true)return NextResponse.json({error:'접근 권한이 없습니다.'},{status:403});
 return NextResponse.json(catalog,{headers:{'Cache-Control':'private, no-store'}});
}
