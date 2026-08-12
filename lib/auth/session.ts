import 'server-only';
import {createHmac,randomBytes,timingSafeEqual} from 'crypto';
import {cookies} from 'next/headers';

export const SESSION_COOKIE='tripleegg_session';
const secret=()=>process.env.AUTH_SECRET||'development-only-change-this-auth-secret';
const sign=(value:string)=>createHmac('sha256',secret()).update(value).digest('base64url');
export function createSessionValue(userId:string,remember=false){const payload=Buffer.from(JSON.stringify({userId,exp:Date.now()+(remember?30:1)*86400000,nonce:randomBytes(8).toString('hex')})).toString('base64url');return `${payload}.${sign(payload)}`}
export function parseSession(value?:string){if(!value)return null;const [payload,signature]=value.split('.');if(!payload||!signature)return null;const expected=Buffer.from(sign(payload)),actual=Buffer.from(signature);if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return null;try{const data=JSON.parse(Buffer.from(payload,'base64url').toString()) as {userId:string;exp:number};return data.exp>Date.now()?data:null}catch{return null}}
export function setSession(userId:string,remember=false){cookies().set(SESSION_COOKIE,createSessionValue(userId,remember),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:(remember?30:1)*86400})}
export function clearSession(){cookies().set(SESSION_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0})}
export function currentSession(){return parseSession(cookies().get(SESSION_COOKIE)?.value)}
