'use client';
import {createContext,useCallback,useContext,useEffect,useState} from 'react';
import type {AccountType,DashboardFilters,FinancialTransaction,ImportRecord} from './schema';

const TX_KEY='tripleegg.financial_transactions.v1', FILE_KEY='tripleegg.uploaded_files.v1';
export const emptyFilters:DashboardFilters={period:'all',month:'all',year:'all',company_id:'all',department_id:'all',cost_center_id:'all',source_file_id:'all'};
const monthNames=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
export {monthNames};
export const accountType=(value:string,name=''):AccountType=>{const v=`${value} ${name}`.toLowerCase();if(/kas|bank|cash/.test(v))return'cash';if(/piutang|receivable/.test(v))return'receivable';if(/persediaan|inventory/.test(v))return'inventory';if(/hutang usaha|account payable|payable/.test(v))return'payable';if(/aset|asset/.test(v))return'asset';if(/liabil|kewajiban|liability/.test(v))return'liability';if(/ekuitas|modal|equity/.test(v))return'equity';if(/pendapatan|revenue|income/.test(v))return'revenue';return'expense'};
type Store={transactions:FinancialTransaction[];files:ImportRecord[];filters:DashboardFilters;setFilters:(v:DashboardFilters)=>void;importData:(t:FinancialTransaction[],f:ImportRecord)=>void;deleteFile:(id:string)=>void;deleteFiltered:(f:DashboardFilters)=>void;ready:boolean};
const Context=createContext<Store|null>(null);
export function FinancialProvider({children}:{children:React.ReactNode}){const [transactions,setTransactions]=useState<FinancialTransaction[]>([]),[files,setFiles]=useState<ImportRecord[]>([]),[filters,setFilters]=useState(emptyFilters),[ready,setReady]=useState(false);
 useEffect(()=>{try{setTransactions(JSON.parse(localStorage.getItem(TX_KEY)||'[]'));setFiles(JSON.parse(localStorage.getItem(FILE_KEY)||'[]'))}finally{setReady(true)}},[]);
 const save=useCallback((t:FinancialTransaction[],f:ImportRecord[])=>{setTransactions(t);setFiles(f);localStorage.setItem(TX_KEY,JSON.stringify(t));localStorage.setItem(FILE_KEY,JSON.stringify(f))},[]);
 const importData=(rows:FinancialTransaction[],file:ImportRecord)=>save([...transactions,...rows],[file,...files]);
 const deleteFile=(id:string)=>save(transactions.filter(x=>x.source_file_id!==id),files.filter(x=>x.id!==id));
 const deleteFiltered=(f:DashboardFilters)=>{const matches=(x:FinancialTransaction)=>(f.company_id==='all'||x.company_id===f.company_id)&&(f.month==='all'||String(x.month)===f.month)&&(f.year==='all'||String(x.year)===f.year)&&(f.department_id==='all'||x.department_id===f.department_id)&&(f.cost_center_id==='all'||x.cost_center_id===f.cost_center_id)&&(f.source_file_id==='all'||x.source_file_id===f.source_file_id);const remaining=transactions.filter(x=>!matches(x));const ids=new Set(remaining.map(x=>x.source_file_id));save(remaining,files.filter(x=>ids.has(x.id)||transactions.some(t=>t.source_file_id===x.id&&!matches(t))))};
 return <Context.Provider value={{transactions,files,filters,setFilters,importData,deleteFile,deleteFiltered,ready}}>{children}</Context.Provider>}
export function useFinancial(){const v=useContext(Context);if(!v)throw new Error('FinancialProvider is required');return v}
export function applyFilters(rows:FinancialTransaction[],f:DashboardFilters){return rows.filter(x=>(f.month==='all'||String(x.month)===f.month)&&(f.year==='all'||String(x.year)===f.year)&&(f.company_id==='all'||x.company_id===f.company_id)&&(f.department_id==='all'||x.department_id===f.department_id)&&(f.cost_center_id==='all'||x.cost_center_id===f.cost_center_id)&&(f.source_file_id==='all'||x.source_file_id===f.source_file_id))}
