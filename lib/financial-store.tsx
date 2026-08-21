'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import type {AccountType,BudgetRecord,DashboardFilters,FinancialTransaction,ImportRecord,Restaurant} from './schema';

const LEGACY_TX_KEY='tripleegg.financial_transactions.v1',LEGACY_FILE_KEY='tripleegg.uploaded_files.v1',LEGACY_BUDGET_KEY='tripleegg.budgets.v1';
export const emptyFilters:DashboardFilters={period:'all',month:'all',year:'all',company_id:'all',department_id:'all',cost_center_id:'all',source_file_id:'all'};
const monthNames=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
export {monthNames};
export const accountType=(value:string,name=''):AccountType=>{const v=`${value} ${name}`.toLowerCase();if(/kas|bank|cash/.test(v))return'cash';if(/piutang|receivable/.test(v))return'receivable';if(/persediaan|inventory/.test(v))return'inventory';if(/hutang usaha|account payable|payable/.test(v))return'payable';if(/aset|asset/.test(v))return'asset';if(/liabil|kewajiban|liability/.test(v))return'liability';if(/ekuitas|modal|equity/.test(v))return'equity';if(/pendapatan|revenue|income/.test(v))return'revenue';return'expense'};

type Store={transactions:FinancialTransaction[];budgets:BudgetRecord[];files:ImportRecord[];filters:DashboardFilters;setFilters:(v:DashboardFilters)=>void;importData:(t:FinancialTransaction[],f:ImportRecord)=>Promise<void>;importBudget:(b:BudgetRecord[],f:ImportRecord)=>Promise<void>;deleteFile:(id:string)=>Promise<void>;deleteFiltered:(f:DashboardFilters)=>Promise<void>;ready:boolean;storageError:string};
const Context=createContext<Store|null>(null);

type StoredFile=ImportRecord&{is_active?:boolean;version?:number};
type Payload={transactions:FinancialTransaction[];budgets:BudgetRecord[];files:StoredFile[]};
async function requestJson(url:string,init?:RequestInit){const response=await fetch(url,{cache:'no-store',...init});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Permintaan database gagal.');return data}
const fileKey=(file:ImportRecord)=>`${file.company_id}::${file.module==='Budget'?'budget':file.statement_type||'journal'}::${file.period}`;

export function FinancialProvider({children,restaurant}:{children:React.ReactNode;restaurant:Restaurant}){
  const TX_KEY=`restaurants.${restaurant.slug}.financial_transactions.v2`,FILE_KEY=`restaurants.${restaurant.slug}.uploaded_files.v2`,BUDGET_KEY=`restaurants.${restaurant.slug}.budgets.v2`;
  const MIGRATION_KEY=`restaurants.${restaurant.slug}.postgres_migrated.v2`;
  const restaurantId=restaurant.id;
  const [transactions,setTransactions]=useState<FinancialTransaction[]>([]),[budgets,setBudgets]=useState<BudgetRecord[]>([]),[files,setFiles]=useState<ImportRecord[]>([]),[filters,setFilters]=useState(emptyFilters),[ready,setReady]=useState(false),[storageError,setStorageError]=useState('');

  const applyPayload=useCallback((data:Payload)=>{setTransactions(data.transactions||[]);setBudgets(data.budgets||[]);setFiles(data.files||[])},[]);
  const refresh=useCallback(async()=>{const data=await requestJson('/api/financial-data') as Payload;applyPayload(data);return data},[applyPayload]);

  useEffect(()=>{let cancelled=false;(async()=>{
    setReady(false);setStorageError('');setTransactions([]);setBudgets([]);setFiles([]);setFilters(emptyFilters);
    try{
      let data=await refresh();
      if(cancelled)return;
      const alreadyMigrated=localStorage.getItem(MIGRATION_KEY)==='1';
      if(!alreadyMigrated){
        const legacyTransactions=JSON.parse(localStorage.getItem(TX_KEY)||restaurant.slug==='triple-egg'&&localStorage.getItem(LEGACY_TX_KEY)||'[]') as FinancialTransaction[];
        const legacyBudgets=JSON.parse(localStorage.getItem(BUDGET_KEY)||restaurant.slug==='triple-egg'&&localStorage.getItem(LEGACY_BUDGET_KEY)||'[]') as BudgetRecord[];
        const legacyFiles=JSON.parse(localStorage.getItem(FILE_KEY)||restaurant.slug==='triple-egg'&&localStorage.getItem(LEGACY_FILE_KEY)||'[]') as ImportRecord[];
        const databaseIds=new Set(data.files.map(file=>file.id));
        const activeDatabaseKeys=new Set(data.files.filter(file=>file.is_active!==false).map(fileKey));
        let migrated=false;
        for(const file of legacyFiles){
          if(databaseIds.has(file.id)||activeDatabaseKeys.has(fileKey(file)))continue;
          const isBudget=file.module==='Budget';
          const rows=isBudget?legacyBudgets.filter(row=>row.source_file_id===file.id):legacyTransactions.filter(row=>row.source_file_id===file.id);
          if(!rows.length)continue;
          await requestJson('/api/financial-data',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind:isBudget?'budget':'financial',file,rows})});
          migrated=true;
          activeDatabaseKeys.add(fileKey(file));
        }
        if(migrated)data=await refresh();
        localStorage.setItem(MIGRATION_KEY,'1');
      }
      if(!cancelled)applyPayload(data);
    }catch(error){if(!cancelled)setStorageError(error instanceof Error?error.message:'Database keuangan tidak dapat dimuat.')}finally{if(!cancelled)setReady(true)}
  })();return()=>{cancelled=true}},[BUDGET_KEY,FILE_KEY,MIGRATION_KEY,TX_KEY,applyPayload,refresh,restaurant.slug]);

  const persist=useCallback(async(kind:'financial'|'budget',file:ImportRecord,rows:FinancialTransaction[]|BudgetRecord[])=>{
    setStorageError('');
    try{await requestJson('/api/financial-data',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind,file,rows})});await refresh()}
    catch(error){setStorageError(error instanceof Error?error.message:'Data gagal disimpan ke database.');await refresh().catch(()=>undefined);throw error}
  },[refresh]);

  const importData=useCallback(async(rows:FinancialTransaction[],file:ImportRecord)=>{rows=rows.map(row=>({...row,restaurant_id:restaurantId}));file={...file,restaurant_id:restaurantId};await persist('financial',file,rows)},[persist,restaurantId]);
  const importBudget=useCallback(async(rows:BudgetRecord[],file:ImportRecord)=>{rows=rows.map(row=>({...row,restaurant_id:restaurantId}));file={...file,restaurant_id:restaurantId};await persist('budget',file,rows)},[persist,restaurantId]);
  const deleteFile=useCallback(async(id:string)=>{setStorageError('');try{await requestJson('/api/financial-data',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({fileId:id})});await refresh()}catch(error){setStorageError(error instanceof Error?error.message:'Data gagal dihapus.');throw error}},[refresh]);
  const deleteFiltered=useCallback(async(f:DashboardFilters)=>{setStorageError('');try{await requestJson('/api/financial-data',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({filters:f})});await refresh()}catch(error){setStorageError(error instanceof Error?error.message:'Data terfilter gagal dihapus.');throw error}},[refresh]);

  const value=useMemo(()=>({transactions,budgets,files,filters,setFilters,importData,importBudget,deleteFile,deleteFiltered,ready,storageError}),[transactions,budgets,files,filters,importData,importBudget,deleteFile,deleteFiltered,ready,storageError]);
  return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useFinancial(){const v=useContext(Context);if(!v)throw new Error('FinancialProvider is required');return v}
export function applyFilters<T extends {period:string;month:number;year:number;company_id:string;department_id:string;cost_center_id:string;source_file_id:string}>(rows:T[],f:DashboardFilters){return rows.filter(x=>(f.period==='all'||x.period===f.period)&&(f.month==='all'||String(x.month)===f.month)&&(f.year==='all'||String(x.year)===f.year)&&(f.company_id==='all'||x.company_id===f.company_id)&&(f.department_id==='all'||x.department_id===f.department_id)&&(f.cost_center_id==='all'||x.cost_center_id===f.cost_center_id)&&(f.source_file_id==='all'||x.source_file_id===f.source_file_id))}
