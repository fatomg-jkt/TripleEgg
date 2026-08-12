'use client';
import {Bell,Menu,Search} from 'lucide-react';
import {Avatar} from './ui';
import {useAuth} from './auth-provider';
import type {Role} from '@/lib/schema';

const roles:Role[]=['Super Admin','Finance Manager','Accounting','Staff','Viewer'];

export function TopHeader({onMenu}:{onMenu:()=>void}){
  const {user,switchRole}=useAuth();
  return <header className="sticky top-0 z-30 flex h-[74px] min-w-0 items-center justify-between gap-3 border-b border-[#203047] bg-[#07111f]/95 px-4 backdrop-blur md:px-6">
    <div className="flex min-w-0 items-center gap-3">
      <button onClick={onMenu} className="md:hidden"><Menu/></button>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">Financial & Accounting Triple Egg</div>
        <div className="mt-1 text-[10px] text-slate-500">Jumat, 17 Juli 2026</div>
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-2 md:gap-3">
      <label className="relative hidden xl:block">
        <Search size={14} className="absolute left-3 top-3 text-slate-500"/>
        <input className="field w-48 pl-9 2xl:w-56" placeholder="Cari laporan..."/>
      </label>
      <button className="relative hidden h-9 w-9 items-center justify-center rounded-lg border border-[#203047] text-slate-400 sm:flex"><Bell size={16}/><i className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-blue-500"/></button>
      <div className="hidden sm:block"><Avatar small/></div>
      <label className="block">
        <span className="sr-only">Demo user</span>
        <select aria-label="Demo user switcher" value={user.role} onChange={e=>switchRole(e.target.value as Role)} className="field w-[132px] text-[11px] sm:w-40 sm:text-xs">
          {roles.map(role=><option key={role}>{role}</option>)}
        </select>
      </label>
    </div>
  </header>;
}
