'use client';
import {useState} from 'react';
import {AppSidebar} from '@/components/sidebar';
import {TopHeader} from '@/components/header';
import {FinancialProvider} from '@/lib/financial-store';
import {RbacProvider} from '@/lib/rbac-client';
import {RestaurantProvider,useRestaurant} from '@/lib/restaurant-client';
function Workspace({children}:{children:React.ReactNode}){const [open,setOpen]=useState(false),{activeRestaurant,loading}=useRestaurant();if(loading)return <div className="grid min-h-screen place-items-center text-slate-400">Menyiapkan dashboard…</div>;if(!activeRestaurant)return <div className="grid min-h-screen place-items-center text-red-300">Akun ini belum memiliki akses restoran. Hubungi administrator.</div>;return <FinancialProvider key={activeRestaurant.slug} restaurant={activeRestaurant}><div><AppSidebar mobileOpen={open} onClose={()=>setOpen(false)}/><div className="min-h-screen md:ml-[250px]"><TopHeader onMenu={()=>setOpen(true)}/><main className="p-4 md:p-6 xl:p-7">{children}</main></div></div></FinancialProvider>}
export function ClientShell({children}:{children:React.ReactNode}){return <RbacProvider><RestaurantProvider><Workspace>{children}</Workspace></RestaurantProvider></RbacProvider>}
