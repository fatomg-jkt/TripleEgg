'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {ChevronDown,LayoutDashboard,PanelLeftClose,PanelLeftOpen,X} from 'lucide-react';
import {menu} from '@/lib/data';

export function AppSidebar({mobileOpen,onClose}:{mobileOpen:boolean;onClose:()=>void}){
  const path=usePathname();
  const [collapsed,setCollapsed]=useState(false);
  const [open,setOpen]=useState<string[]>(menu.map(x=>x.title));
  const toggle=(x:string)=>setOpen(o=>o.includes(x)?o.filter(v=>v!==x):[...o,x]);

  return <>
    <div onClick={onClose} className={`${mobileOpen?'block':'hidden'} fixed inset-0 z-40 bg-black/60 md:hidden`}/>
    <aside className={`${mobileOpen?'translate-x-0':'-translate-x-full'} ${collapsed?'md:w-[78px]':'md:w-[250px]'} fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col border-r border-[#203047] bg-[#071321] transition-all md:translate-x-0`}>
      <div className={`${collapsed?'md:flex-col md:justify-center md:gap-1 md:px-2':'px-4'} flex h-[86px] items-center justify-between border-b border-[#203047]`}>
        <div className={`${collapsed?'md:w-12':'w-24'} flex h-14 shrink-0 items-center transition-all`}>
          {/* A plain img is intentional: this portable vector must not use the Next image pipeline. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/triple-egg-logo.svg" alt="Triple Egg" className="h-auto max-h-14 w-full object-contain object-left md:object-center"/>
        </div>
        <button onClick={()=>setCollapsed(!collapsed)} aria-label={collapsed?'Expand sidebar':'Collapse sidebar'} className="hidden text-slate-500 hover:text-white md:block">{collapsed?<PanelLeftOpen size={16}/>:<PanelLeftClose size={19}/>}</button>
        <button onClick={onClose} aria-label="Close sidebar" className="md:hidden"><X size={19}/></button>
      </div>

      <nav className="scrollbar flex-1 overflow-y-auto p-3">
        <Link onClick={onClose} href="/administration/users" className={`${path==='/administration/users'?'bg-blue-600 text-white':'text-slate-400 hover:bg-white/5'} mb-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold`}>Users</Link>
        <div className={`${collapsed?'md:hidden':''} label mb-2 px-3 pt-2`}>Workspace</div>
        {menu.map((group,i)=>group.items?
          <div key={group.title} className="mb-1">
            <button onClick={()=>toggle(group.title)} className={`${collapsed?'md:justify-center':''} flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white`}>
              <span className="flex items-center gap-3"><span className="flex h-5 w-5 items-center justify-center text-[10px] font-bold text-slate-500">0{i+2}</span><span className={`${collapsed?'md:hidden':''}`}>{group.title}</span></span>
              <ChevronDown size={14} className={`${open.includes(group.title)?'rotate-180':''} ${collapsed?'md:hidden':''} transition`}/>
            </button>
            {open.includes(group.title)&&<div className={`${collapsed?'md:hidden':''} ml-[22px] border-l border-[#203047] pl-3`}>
              {group.items.map(([label,href])=><Link onClick={onClose} key={href} href={href} className={`${path===href?'bg-blue-600/15 text-blue-400 before:bg-blue-500':'text-slate-500 before:bg-transparent'} relative flex items-center rounded-lg px-3 py-2 text-[11px] font-medium before:absolute before:-left-[14px] before:h-4 before:w-[2px] hover:text-white`}>{label}</Link>)}
            </div>}
          </div>
          :<Link key={group.title} href="/" className={`${path==='/'?'bg-blue-600 text-white':'text-slate-400 hover:bg-white/5'} mb-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold`}><LayoutDashboard size={17}/><span className={`${collapsed?'md:hidden':''}`}>Dashboard</span></Link>)}
      </nav>
    </aside>
  </>;
}
