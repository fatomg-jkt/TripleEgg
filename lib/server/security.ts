import 'server-only';
import {timingSafeEqual} from 'node:crypto';
import type {NextRequest} from 'next/server';

type Bucket={count:number;resetAt:number};
const buckets=new Map<string,Bucket>();
export function rateLimited(keys:string[],limit=5,windowMs=15*60*1000){const now=Date.now();let blocked=false;for(const key of keys){const current=buckets.get(key);const bucket=!current||current.resetAt<=now?{count:0,resetAt:now+windowMs}:current;bucket.count++;buckets.set(key,bucket);if(bucket.count>limit)blocked=true}return blocked}
export function clientIp(request:NextRequest){return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||request.headers.get('x-real-ip')||'unknown'}
export function isSameOrigin(request:NextRequest){const origin=request.headers.get('origin');if(!origin)return true;try{const a=Buffer.from(new URL(origin).host),b=Buffer.from(request.nextUrl.host);return a.length===b.length&&timingSafeEqual(a,b)}catch{return false}}
