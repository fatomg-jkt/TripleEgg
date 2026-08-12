'use client';
import {usePathname} from 'next/navigation';
import {AccessDenied,useAuth} from './auth-provider';
import {menuIdForPath} from '@/lib/data';
export function RouteGuard({children}:{children:React.ReactNode}){const path=usePathname();const {can}=useAuth();return can(menuIdForPath(path),'view')?<>{children}</>:<AccessDenied/>}
