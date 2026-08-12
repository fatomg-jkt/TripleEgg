import {NextRequest,NextResponse} from 'next/server';
const publicPaths=['/login','/forgot-password','/reset-password'];
export function middleware(request:NextRequest){const {pathname}=request.nextUrl;if(pathname.startsWith('/api/')||pathname.startsWith('/_next/')||pathname.includes('.'))return NextResponse.next();const isPublic=publicPaths.some(p=>pathname===p||pathname.startsWith(`${p}/`));const hasSession=request.cookies.has('tripleegg_session');if(!isPublic&&!hasSession){const url=new URL('/login',request.url);url.searchParams.set('next',pathname);return NextResponse.redirect(url)}return NextResponse.next()}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
