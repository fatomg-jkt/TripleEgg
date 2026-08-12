import type {Action,MenuId,PermissionMap} from './permissions';
import {defaultRolePermissions} from './permissions';
import type {Role} from './schema';

export interface UserScope{companies:string[];departments:string[];costCenters:string[]}
export interface AppUser{id:string;name:string;email:string;role:Role;status:'Active'|'Disabled';lastLogin:string;scope:UserScope;permissions?:PermissionMap}
export type RolePermissionSet=Record<Role,PermissionMap>;

export function canAccess(user:AppUser|undefined,menu:MenuId,action:Action,rolePermissions:RolePermissionSet=defaultRolePermissions){
 if(!user||user.status==='Disabled')return false;
 const override=user.permissions?.[menu]?.[action];
 return override??Boolean(rolePermissions[user.role]?.[menu]?.[action]);
}
export function isInScope(user:AppUser,company:string,department:string,costCenter:string){
 if(user.role==='Super Admin')return true;
 const match=(allowed:string[],value:string)=>!allowed.length||allowed.includes(value);
 return match(user.scope.companies,company)&&match(user.scope.departments,department)&&match(user.scope.costCenters,costCenter);
}
