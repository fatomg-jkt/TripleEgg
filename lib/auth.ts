import {cookies} from 'next/headers';
import {SignJWT,jwtVerify} from 'jose';
import {grantsForUser,hasPermission} from './rbac';
import type {PermissionAction} from './schema';
import {users,publicUser} from './users';

export const SESSION_COOKIE='tripleegg_session';
function key(){const value=process.env.AUTH_SECRET;if(!value)throw new Error('AUTH_SECRET belum dikonfigurasi di environment server.');return new TextEncoder().encode(value)}
export async function createSession(user:{id:string;sessionVersion:number}){return new SignJWT({sv:user.sessionVersion}).setProtectedHeader({alg:'HS256'}).setSubject(user.id).setIssuedAt().setExpirationTime('7d').sign(key())}
export async function sessionUser(){const token=cookies().get(SESSION_COOKIE)?.value;if(!token)return null;try{const {payload}=await jwtVerify(token,key());const user=await users.findById(String(payload.sub));if(!user||user.status!=='Active'||user.sessionVersion!==payload.sv)return null;return {...publicUser(user),permissions:await grantsForUser(user)}}catch{return null}}

export async function authorize(resource:string,action:PermissionAction){const user=await sessionUser();return user&&await hasPermission(user,resource,action)?user:null}
