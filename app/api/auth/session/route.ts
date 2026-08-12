import {NextResponse} from 'next/server';import {requireUser,unauthorized} from '@/lib/auth/api';import {sanitize} from '@/lib/auth/users';
export const dynamic='force-dynamic';export async function GET(){const user=await requireUser(false,true);return user?NextResponse.json({user:sanitize(user)}):unauthorized()}
