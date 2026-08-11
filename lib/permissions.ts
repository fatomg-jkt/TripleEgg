import type {Role} from './schema';

export const actions=['view','upload','edit','delete','export','approve'] as const;
export type Action=typeof actions[number];
export const menuIds=['dashboard','neraca','laba-rugi','arus-kas','ringkasan-budget','budget-vs-actual','budget-department','budget-account','upload-budget','rasio','trend','profitabilitas','chart-of-account','department','cost-center','company','jurnal-umum','account-payable','account-receivable','financial-report','management-report','custom-report','users','roles-permissions'] as const;
export type MenuId=typeof menuIds[number];
export type PermissionMap=Partial<Record<MenuId,Partial<Record<Action,boolean>>>>;

const grant=(menus:readonly MenuId[],allowed:readonly Action[]):PermissionMap=>Object.fromEntries(menus.map(menu=>[menu,Object.fromEntries(allowed.map(action=>[action,true]))]));
const reports:MenuId[]=['dashboard','neraca','laba-rugi','arus-kas','ringkasan-budget','budget-vs-actual','budget-department','budget-account','upload-budget','rasio','trend','profitabilitas','financial-report','management-report','custom-report'];
const operational:MenuId[]=menuIds.filter(x=>!['users','roles-permissions'].includes(x));

export const defaultRolePermissions:Record<Role,PermissionMap>={
 'Super Admin':grant(menuIds,actions),
 'Finance Manager':grant(reports,['view','upload','edit','export','approve']),
 Accounting:grant(operational,['view','upload','edit','export']),
 Staff:grant(['dashboard','jurnal-umum','account-payable'],['view','upload']),
 Viewer:grant(operational,['view','export'])
};
