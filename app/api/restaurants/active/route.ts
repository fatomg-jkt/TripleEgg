import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
import {sessionUser} from '@/lib/auth';
import {ACTIVE_RESTAURANT_COOKIE,canAccessRestaurant} from '@/lib/restaurants';
import {restaurants} from '@/lib/schema';
import {jsonError,serverError} from '@/lib/api';
export async function POST(req:Request){try{const user=await sessionUser();if(!user)return jsonError('Tidak terautentikasi.',401);const body=await req.json().catch(()=>null) as {slug?:string}|null;if(!body?.slug||!restaurants.some(r=>r.slug===body.slug))return jsonError('Restoran tidak valid.',400);if(!canAccessRestaurant(user,body.slug))return jsonError('Anda tidak memiliki akses ke restoran ini.',403);cookies().set(ACTIVE_RESTAURANT_COOKIE,body.slug,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*7});return NextResponse.json({activeRestaurant:restaurants.find(r=>r.slug===body.slug)})}catch(e){return serverError(e)}}
