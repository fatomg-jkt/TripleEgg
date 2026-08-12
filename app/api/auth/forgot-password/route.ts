import {NextRequest,NextResponse} from 'next/server';
import {GENERIC_FORGOT_MESSAGE,normalizeEmail} from '@/lib/server/password-reset/service';
import {passwordResetService} from '@/lib/server/password-reset/runtime';
import {clientIp,isSameOrigin,rateLimited} from '@/lib/server/security';

export const runtime='nodejs';
export async function POST(request:NextRequest){
 if(!isSameOrigin(request))return NextResponse.json({message:GENERIC_FORGOT_MESSAGE},{status:403});
 let email='';try{email=normalizeEmail(String((await request.json() as {email?:string}).email||''))}catch{}
 const limited=rateLimited([`forgot:ip:${clientIp(request)}`,`forgot:email:${email}`]);
 if(!limited&&email){try{await passwordResetService().request(email)}catch(error){console.error('Password reset email request failed safely:',error instanceof Error?error.message:'unknown error')}}
 return NextResponse.json({message:GENERIC_FORGOT_MESSAGE});
}
