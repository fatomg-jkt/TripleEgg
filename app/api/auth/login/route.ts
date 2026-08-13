import bcrypt from 'bcryptjs';
import {NextResponse} from 'next/server';
import {createSession,SESSION_COOKIE} from '@/lib/auth';
import {jsonError,serverError} from '@/lib/api';
import {publicUser,users} from '@/lib/users';

export async function POST(request:Request){try{
  const body=await request.json().catch(()=>null) as {email?:string;password?:string}|null;
  if(!body?.email||!body.password)return jsonError('Email dan password wajib diisi.',400);
  const user=await users.findByEmail(body.email);
  if(user?.status==='Pending Activation')return jsonError('Akun belum diaktifkan. Silakan buat password menggunakan OTP yang dikirim ke email Anda.',403);
  if(!user||!(await bcrypt.compare(body.password,user.passwordHash)))return jsonError('Email atau password salah.',401);
  if(user.status!=='Active')return jsonError('Akun Anda dinonaktifkan. Hubungi administrator.',403);
  await users.updateLastLogin(user.id);
  const token=await createSession(user);
  const response=NextResponse.json({user:publicUser({...user,lastLogin:new Date().toISOString()})});
  response.cookies.set(SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*7});
  return response;
}catch(error){return serverError(error,'Terjadi kesalahan saat login. Silakan coba lagi.')}}
