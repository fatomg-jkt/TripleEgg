/** Backend-ready domain contracts. These mirror the planned database entities. */
export type Role='Super Admin'|'Finance Manager'|'Accounting'|'Staff'|'Viewer';
export type Permission='view'|'upload'|'approve'|'export'|'edit';
export const rolePermissions:Record<Role,Permission[]>={'Super Admin':['view','upload','approve','export','edit'],'Finance Manager':['view','upload','approve','export'],Accounting:['view','upload','edit'],Staff:['view','upload'],Viewer:['view']};
export interface UploadedFile{id:string;file_name:string;original_file_name:string;file_type:'xlsx'|'xls'|'csv'|'pdf';file_size:number;module:string;company_id:string;department_id?:string;cost_center_id?:string;period:string;year:number;status:'Uploading'|'Processing'|'Success'|'Failed';uploaded_by:string;uploaded_at:string;processed_at?:string;error_message?:string}
export type EntityName='users'|'companies'|'departments'|'cost_centers'|'chart_of_accounts'|'financial_transactions'|'budgets'|'uploaded_files'|'upload_logs'|'financial_periods';
