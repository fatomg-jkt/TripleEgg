/** Backend-ready domain contracts. These mirror the planned database entities. */
export type Role='Super Admin'|'Finance Manager'|'Accounting'|'Staff'|'Viewer';
export type PermissionAction='view'|'upload'|'edit'|'delete'|'export'|'approve';
export type Permission=PermissionAction;
export const rolePermissions:Record<Role,PermissionAction[]>={'Super Admin':['view','upload','edit','delete','export','approve'],'Finance Manager':['view','upload','approve','export'],Accounting:['view','upload','edit'],Staff:['view','upload'],Viewer:['view']};
export interface UploadedFile{id:string;file_name:string;original_file_name:string;file_type:'xlsx'|'xls'|'csv'|'pdf';file_size:number;module:string;company_id:string;department_id?:string;cost_center_id?:string;period:string;year:number;status:'Uploading'|'Processing'|'Success'|'Failed';uploaded_by:string;uploaded_at:string;processed_at?:string;error_message?:string}
export type AccountType='asset'|'liability'|'equity'|'revenue'|'expense'|'cash'|'receivable'|'inventory'|'payable';
export type StatementType='balance-sheet'|'income-statement'|'cash-flow'|'journal';
export interface FinancialTransaction{id:string;transaction_date:string;account_code:string;account_name:string;account_type:AccountType;debit:number;credit:number;company_id:string;department_id:string;cost_center_id:string;period:string;month:number;year:number;description:string;source_file_id:string;created_at:string;statement_type?:StatementType;report_category?:string}
export interface ImportRecord extends UploadedFile{rows_imported:number;rows_failed:number;raw_data?:string;statement_type?:StatementType}
export interface BudgetRecord{id:string;period:string;month:number;year:number;company_id:string;department_id:string;cost_center_id:string;account_code:string;account_name:string;category:string;budget:number;source_file_id:string;created_at:string}
export interface DashboardFilters{period:string;month:string;year:string;company_id:string;department_id:string;cost_center_id:string;source_file_id:string}
export type EntityName='users'|'companies'|'departments'|'cost_centers'|'chart_of_accounts'|'financial_transactions'|'budgets'|'uploaded_files'|'upload_logs'|'financial_periods';
