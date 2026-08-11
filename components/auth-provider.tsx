'use client';
import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {canAccess,isInScope,type AppUser,type RolePermissionSet} from '@/lib/auth';
import {defaultRolePermissions,type Action,type MenuId,type PermissionMap} from '@/lib/permissions';
import type {Role} from '@/lib/schema';

const scope={companies:['PT Triple Egg'],departments:['Finance'],costCenters:['CC-001']};
export const demoUsers:AppUser[]=[
 {id:'1',name:'Raisa Admin',email:'admin@tripleegg.id',role:'Super Admin',status:'Active',lastLogin:'11 Agu 2026, 08:30',scope:{companies:[],departments:[],costCenters:[]}},
 {id:'2',name:'Fajar Manager',email:'finance@tripleegg.id',role:'Finance Manager',status:'Active',lastLogin:'11 Agu 2026, 08:12',scope},
 {id:'3',name:'Ayu Accounting',email:'accounting@tripleegg.id',role:'Accounting',status:'Active',lastLogin:'10 Agu 2026, 17:45',scope},
 {id:'4',name:'Dimas Staff',email:'staff@tripleegg.id',role:'Staff',status:'Active',lastLogin:'10 Agu 2026, 16:20',scope},
 {id:'5',name:'Vina Viewer',email:'viewer@tripleegg.id',role:'Viewer',status:'Active',lastLogin:'9 Agu 2026, 14:05',scope}
];
const clonePermissions=():RolePermissionSet=>JSON.parse(JSON.stringify(defaultRolePermissions));
type AuthContextValue={
 user:AppUser;users:AppUser[];rolePermissions:RolePermissionSet;switchRole:(role:Role)=>void;
 can:(menu:MenuId,action:Action)=>boolean;inScope:(company:string,department:string,costCenter:string)=>boolean;
 addUser:(user:AppUser)=>void;updateUser:(id:string,patch:Partial<AppUser>)=>void;disableUser:(id:string)=>void;resetUserAccess:(id:string)=>void;
 setRolePermission:(role:Role,menu:MenuId,action:Action,value:boolean)=>void;resetRolePermissions:(role:Role)=>void;
};
const Context=createContext<AuthContextValue|null>(null);
export function AuthProvider({children}:{children:React.ReactNode}){
 const [role,setRole]=useState<Role>('Super Admin');
 const [users,setUsers]=useState<AppUser[]>(demoUsers);
 const [rolePermissions,setRolePermissions]=useState<RolePermissionSet>(clonePermissions);
 useEffect(()=>{
  const savedRole=localStorage.getItem('tripleegg.demo.role') as Role|null;
  const savedUsers=localStorage.getItem('tripleegg.rbac.users');
  const savedPermissions=localStorage.getItem('tripleegg.rbac.rolePermissions');
  if(savedRole&&demoUsers.some(x=>x.role===savedRole))setRole(savedRole);
  if(savedUsers)try{setUsers(JSON.parse(savedUsers))}catch{}
  if(savedPermissions)try{setRolePermissions(JSON.parse(savedPermissions))}catch{}
 },[]);
 const persistUsers=(next:AppUser[])=>{setUsers(next);localStorage.setItem('tripleegg.rbac.users',JSON.stringify(next))};
 const persistRolePermissions=(next:RolePermissionSet)=>{setRolePermissions(next);localStorage.setItem('tripleegg.rbac.rolePermissions',JSON.stringify(next))};
 const user=users.find(x=>x.role===role&&x.status==='Active')||users.find(x=>x.role===role)||demoUsers.find(x=>x.role===role)!;
 const value=useMemo<AuthContextValue>(()=>({
  user,users,rolePermissions,
  switchRole:(next:Role)=>{setRole(next);localStorage.setItem('tripleegg.demo.role',next)},
  can:(menu,action)=>canAccess(user,menu,action,rolePermissions),
  inScope:(c,d,cc)=>isInScope(user,c,d,cc),
  addUser:(newUser)=>persistUsers([...users,newUser]),
  updateUser:(id,patch)=>persistUsers(users.map(item=>item.id===id?{...item,...patch}:item)),
  disableUser:(id)=>persistUsers(users.map(item=>item.id===id?{...item,status:item.status==='Active'?'Disabled':'Active'}:item)),
  resetUserAccess:(id)=>persistUsers(users.map(item=>item.id===id?{...item,permissions:undefined}:item)),
  setRolePermission:(targetRole,menu,action,checked)=>{const next={...rolePermissions,[targetRole]:{...rolePermissions[targetRole],[menu]:{...rolePermissions[targetRole]?.[menu],[action]:checked}}};persistRolePermissions(next)},
  resetRolePermissions:(targetRole)=>{const next={...rolePermissions,[targetRole]:JSON.parse(JSON.stringify(defaultRolePermissions[targetRole]||{})) as PermissionMap};persistRolePermissions(next)}
 }),[user,users,rolePermissions]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('AuthProvider is required');return value}
export function PermissionGuard({menu,action,children,fallback=null}:{menu:MenuId;action:Action;children:React.ReactNode;fallback?:React.ReactNode}){return useAuth().can(menu,action)?<>{children}</>:<>{fallback}</>}
export function AccessDenied(){return <div className="grid min-h-[65vh] place-items-center text-center"><div><div className="text-7xl font-black text-red-500">403</div><h1 className="mt-4 text-2xl font-bold">Access Denied</h1><p className="mt-2 text-sm text-slate-400">Anda tidak memiliki akses ke halaman ini.</p></div></div>}
