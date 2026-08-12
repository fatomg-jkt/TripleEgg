import {NextRequest,NextResponse} from 'next/server';import {clearSession} from '@/lib/auth/session';import {sameOrigin} from '@/lib/auth/api';
export async function POST(request:NextRequest){if(!sameOrigin(request))return NextResponse.json({error:'Invalid origin'},{status:403});clearSession();return NextResponse.json({ok:true})}
