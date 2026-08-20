import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
import {sessionUser} from '@/lib/auth';
import {accessibleRestaurants,activeRestaurantFor} from '@/lib/restaurants';
import {jsonError,serverError} from '@/lib/api';
export async function GET(){try{const user=await sessionUser();if(!user)return jsonError('Tidak terautentikasi.',401);return NextResponse.json({restaurants:accessibleRestaurants(user),activeRestaurant:activeRestaurantFor(user)})}catch(e){return serverError(e)}}
