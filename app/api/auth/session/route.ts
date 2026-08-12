import {NextResponse} from 'next/server';import {sessionUser} from '@/lib/auth';import {serverError} from '@/lib/api';
export async function GET(){try{const user=await sessionUser();return user?NextResponse.json({user}):NextResponse.json({error:'Sesi tidak valid.'},{status:401})}catch(e){return serverError(e)}}
