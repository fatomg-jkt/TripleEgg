import {NextRequest,NextResponse} from 'next/server';
import {INVALID_TOKEN_MESSAGE} from '@/lib/server/password-reset/service';
import {passwordResetService} from '@/lib/server/password-reset/runtime';
import {clientIp,isSameOrigin,rateLimited} from '@/lib/server/security';
export const runtime='nodejs';
export async function GET(request:NextRequest){try{return NextResponse.json({valid:await passwordResetService().validate(request.nextUrl.searchParams.get('token')||'')})}catch{return NextResponse.json({valid:false})}}
export async function POST(request:NextRequest){
 if(!isSameOrigin(request))return NextResponse.json({error:INVALID_TOKEN_MESSAGE},{status:403});
 if(rateLimited([`reset:ip:${clientIp(request)}`],10))return NextResponse.json({error:'Terlalu banyak percobaan. Silakan coba lagi nanti.'},{status:429});
 try{const {token,password,confirmation}=await request.json() as Record<string,string>;const result=await passwordResetService().reset(token||'',password||'',confirmation||'');return NextResponse.json(result,{status:result.ok?200:400})}catch(error){console.error('Password reset failed safely:',error instanceof Error?error.message:'unknown error');return NextResponse.json({error:INVALID_TOKEN_MESSAGE},{status:400})}
}
