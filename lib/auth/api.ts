import {NextRequest,NextResponse} from 'next/server';
import {currentSession} from './session';import {userRepository} from './users';
export function sameOrigin(request:NextRequest){const origin=request.headers.get('origin');return !origin||origin===request.nextUrl.origin}
export async function requireUser(admin=false,allowPendingPassword=false){const session=currentSession();if(!session)return null;const user=await userRepository.findById(session.userId);if(!user||user.status!=='Active'||user.requirePasswordChange&&!allowPendingPassword||(admin&&user.role!=='Super Admin'))return null;return user}
export const unauthorized=()=>NextResponse.json({error:'Unauthorized'},{status:401});
