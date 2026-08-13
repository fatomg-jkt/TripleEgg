import {NextResponse} from 'next/server';
export function jsonError(message:string,status=500){return NextResponse.json({error:message},{status})}
export function serverError(error:unknown,message='Terjadi kesalahan server. Silakan coba lagi.') {console.error(error);return jsonError(message,500)}
