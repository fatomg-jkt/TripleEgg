'use client';
import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {canAccess,isInScope,type AppUser} from '@/lib/auth';
import type {Action,MenuId} from '@/lib/permissions';
import type {Role} from '@/lib/schema';

const scope={companies:['PT Triple Egg'],departments:['Finance'],costCenters:['CC-001']};
export const demoUsers:AppUser[]=[
 {id:'1',name:'Raisa Admin',email:'admin@tripleegg.id',role:'Super Admin',status:'Active',lastLogin:'11 Agu 2026, 08:30',scope:{companies:[],departments:[],costCenters:[]}},
 {id:'2',name:'Fajar Manager',email:'finance@tripleegg.id',role:'Finance Manager',status:'Active',lastLogin:'11 Agu 2026, 08:12',scope},
 {id:'3',name:'Ayu Accounting',email:'accounting@tripleegg.id',role:'Accounting',status:'Active',lastLogin:'10 Agu 2026, 17:45',scope},
 {id:'4',name:'Dimas Staff',email:'staff@tripleegg.id',role:'Staff',status:'Active',lastLogin:'10 Agu 2026, 16:20',scope},
 {id:'5',name:'Vina Viewer',email:'viewer@tripleegg.id',role:'Viewer',status:'Active',lastLogin:'9 Agu 2026, 14:05',scope}
];
type AuthContextValue={user:AppUser;users:AppUser[];switchRole:(role:Role)=>void;can:(menu:MenuId,action:Action)=>boolean;inScope:(company:string,department:string,costCenter:string)=>boolean};
const Context=createContext<AuthContextValue|null>(null);
export function AuthProvider({children}:{children:React.ReactNode}){const [role,setRole]=useState<Role>('Super Admin');useEffect(()=>{const saved=localStorage.getItem('tripleegg.demo.role') as Role|null;if(saved&&demoUsers.some(x=>x.role===saved))setRole(saved)},[]);const user=demoUsers.find(x=>x.role===role)!;const value=useMemo(()=>({user,users:demoUsers,switchRole:(next:Role)=>{setRole(next);localStorage.setItem('tripleegg.demo.role',next)},can:(menu:MenuId,action:Action)=>canAccess(user,menu,action),inScope:(c:string,d:string,cc:string)=>isInScope(user,c,d,cc)}),[user]);return <Context.Provider value={value}>{children}</Context.Provider>}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('AuthProvider is required');return value}
export function PermissionGuard({menu,action,children,fallback=null}:{menu:MenuId;action:Action;children:React.ReactNode;fallback?:React.ReactNode}){return useAuth().can(menu,action)?<>{children}</>:<>{fallback}</>}
export function AccessDenied(){return <div className="grid min-h-[65vh] place-items-center text-center"><div><div className="text-7xl font-black text-red-500">403</div><h1 className="mt-4 text-2xl font-bold">Access Denied</h1><p className="mt-2 text-sm text-slate-400">Anda tidak memiliki akses ke halaman ini.</p></div></div>}
