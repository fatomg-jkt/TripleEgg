import {cookies} from 'next/headers';
import {SignJWT,jwtVerify} from 'jose';
import {grantsForUser,hasPermission} from './rbac';
import type {PermissionAction} from './schema';
import {users,publicUser} from './users';
import {activeRestaurantFor,canAccessRestaurant} from './restaurants';

export const SESSION_COOKIE='tripleegg_session';
function key(){const value=process.env.AUTH_SECRET;if(!value)throw new Error('AUTH_SECRET belum dikonfigurasi di environment server.');return new TextEncoder().encode(value)}
export async function createSession(user:{id:string;sessionVersion:number}){return new SignJWT({sv:user.sessionVersion}).setProtectedHeader({alg:'HS256'}).setSubject(user.id).setIssuedAt().setExpirationTime('7d').sign(key())}
export async function sessionUser(){const token=cookies().get(SESSION_COOKIE)?.value;if(!token)return null;try{const {payload}=await jwtVerify(token,key());const user=await users.findById(String(payload.sub));if(!user||user.status!=='Active'||user.sessionVersion!==payload.sv)return null;return {...publicUser(user),permissions:await grantsForUser(user)}}catch{return null}}

export async function authorize(resource:string,action:PermissionAction){const user=await sessionUser();return user&&await hasPermission(user,resource,action)?user:null}
/** Use this guard on every restaurant-scoped API route; access is never trusted from the client. */
export async function authorizeRestaurant(resource:string,action:PermissionAction,requestedSlug?:string){const user=await authorize(resource,action);if(!user)return null;const active=requestedSlug?requestedSlug:activeRestaurantFor(user)?.slug;if(!active||!canAccessRestaurant(user,active))return null;return {user,restaurant:activeRestaurantFor({...user,restaurantSlugs:[active]})!}}
