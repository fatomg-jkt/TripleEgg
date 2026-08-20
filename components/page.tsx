'use client';

import {useMemo,useState} from 'react';
import {Download,FileDown,Plus,Printer,Upload} from 'lucide-react';
import {UploadModal} from './upload';
import {DataTable,UploadHistory} from './data-table';
import {FilterBar} from './dashboard';
import {CashFlowReport,LabaRugiReport,NeracaReport} from './financial-reports';
import {BudgetReport} from './budget-reports';
import {PermissionGate,useRbac} from '@/lib/rbac-client';
import {applyFilters,useFinancial} from '@/lib/financial-store';
import {downloadExcel,excelFilename,type ExcelColumn} from '@/lib/excel-export';
import {belongsToRestaurant,downloadDashboard,downloadFinancialReport,restaurantBrand} from '@/lib/financial-report-export';
import type {FinancialTransaction} from '@/lib/schema';

const templateColumns:Record<string,string[]>={
  dashboard:['Kode Akun','Nama Akun','Kategori','Saldo'],
  neraca:['Kode Akun','Nama Akun','Kategori','Saldo'],
  'laba-rugi':['Kode Akun','Nama Akun','Kategori','Actual'],
  'arus-kas':['Tanggal','Aktivitas','Keterangan','Kas Masuk','Kas Keluar'],
  'ringkasan-budget':['Periode','Bulan','Tahun','Company','Department','Cost Center','Kode Akun','Nama Akun','Kategori','Budget'],
  'budget-vs-actual':['Periode','Bulan','Tahun','Company','Department','Cost Center','Kode Akun','Nama Akun','Kategori','Budget'],
  'budget-department':['Periode','Bulan','Tahun','Company','Department','Cost Center','Kode Akun','Nama Akun','Kategori','Budget'],
  'budget-account':['Periode','Bulan','Tahun','Company','Department','Cost Center','Kode Akun','Nama Akun','Kategori','Budget'],
  'upload-budget':['Periode','Bulan','Tahun','Company','Department','Cost Center','Kode Akun','Nama Akun','Kategori','Budget'],
  'chart-of-account':['Account Code','Account Name','Account Type','Parent Account','Normal Balance','Status'],
  department:['Department Code','Department Name','Manager','Status'],
  'cost-center':['Cost Center Code','Cost Center Name','Department','Status'],
  company:['Company Code','Company Name','Status'],
  entity:['Company Code','Company Name','Status'],
  'jurnal-umum':['Tanggal','Kode Akun','Nama Akun','Debit','Credit','Department','Cost Center','Description'],
  'account-payable':['Tanggal','Vendor','Invoice','Due Date','Kode Akun','Amount','Department','Cost Center'],
  'account-receivable':['Tanggal','Customer','Invoice','Due Date','Kode Akun','Amount','Department','Cost Center']
};

function downloadTemplate(title:string,slug='dashboard'){
  const columns=templateColumns[slug]||['Kode Akun','Nama Akun','Kategori','Saldo'];
  const rows=slug==='neraca'?
    [['110101','Kas & Bank','Aset Lancar','100000000'],['120101','Piutang Usaha','Aset Lancar','50000000'],['210101','Utang Usaha','Liabilitas Jangka Pendek','30000000'],['310101','Modal Saham','Ekuitas','120000000']]:
    slug==='laba-rugi'?
    [['410101','Pendapatan Penjualan','Pendapatan','250000000'],['510101','Harga Pokok Penjualan','HPP','100000000'],['610101','Beban Gaji','Beban Operasional','50000000'],['620101','Beban Utilitas','Beban Operasional','10000000']]:
    slug==='arus-kas'?
    [['2026-07-01','Aktivitas Operasi','Penerimaan dari pelanggan','150000000',''],['2026-07-05','Aktivitas Operasi','Pembayaran kepada pemasok','','60000000'],['2026-07-12','Aktivitas Investasi','Pembelian peralatan','','25000000'],['2026-07-20','Aktivitas Pendanaan','Setoran modal','50000000','']]:
    slug.includes('budget')?[['2026-08','Agustus','2026','PT Triple Egg','Finance','CC-001','610101','Beban Gaji','Beban Operasional','100000000']]:
    [columns.map(c=>c.toLowerCase().includes('kode')?'110001':c.toLowerCase().includes('nama')?'Contoh Akun':c.toLowerCase().includes('status')?'Active':'')];
  const escape=(value:string)=>`"${String(value).replaceAll('"','""')}"`;
  const csv=['sep=;',columns.map(escape).join(';'),...rows.map(row=>row.map(escape).join(';'))].join('\r\n');
  const blob=new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`template-${slug||title.toLowerCase().replaceAll(' ','-')}.csv`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
}

const moneyFormat='[$Rp-421] #,##0;[Red]-[$Rp-421] #,##0';
const transactionColumns:ExcelColumn[]=[{header:'Tanggal',key:'transaction_date',width:14,format:'yyyy-mm-dd'},{header:'Kode Akun',key:'account_code'},{header:'Nama Akun',key:'account_name',width:28},{header:'Kategori',key:'report_category',width:22},{header:'Debit',key:'debit',format:moneyFormat},{header:'Credit',key:'credit',format:moneyFormat},{header:'Saldo',key:'balance',format:moneyFormat},{header:'Company',key:'company_id'},{header:'Department',key:'department_id'},{header:'Cost Center',key:'cost_center_id'},{header:'Periode',key:'period'}];
const budgetColumns:ExcelColumn[]=[{header:'Periode',key:'period'},{header:'Bulan',key:'month'},{header:'Tahun',key:'year'},{header:'Company',key:'company_id'},{header:'Department',key:'department_id'},{header:'Cost Center',key:'cost_center_id'},{header:'Kode Akun',key:'account_code'},{header:'Nama Akun',key:'account_name',width:28},{header:'Kategori',key:'category'},{header:'Budget',key:'budget',format:moneyFormat},{header:'Actual',key:'actual',format:moneyFormat},{header:'Variance',key:'variance',format:moneyFormat}];
const inScope=<T extends {company_id:string;department_id:string;cost_center_id:string}>(rows:T[],user:{company?:string;department?:string;costCenter?:string}|null)=>rows.filter(row=>(!user?.company||user.company==='All'||row.company_id===user.company)&&(!user?.department||user.department==='All'||row.department_id===user.department)&&(!user?.costCenter||user.costCenter==='All'||row.cost_center_id===user.costCenter));
const signed=(row:FinancialTransaction)=>['liability','equity','revenue','payable'].includes(row.account_type)?row.credit-row.debit:row.debit-row.credit;

export function PageHeader({title,subtitle,onUpload,slug='dashboard',extra}:{title:string;subtitle:string;onUpload:()=>void;slug?:string;extra?:React.ReactNode}){
  const {transactions,budgets,filters}=useFinancial();const {user,can}=useRbac();const [exporting,setExporting]=useState(false);const [message,setMessage]=useState('');const brand=useMemo(()=>restaurantBrand(filters.company_id==='all'?user?.company:filters.company_id),[filters.company_id,user?.company]);
  const exportRows=useMemo(()=>{const allowed=inScope(applyFilters(transactions,filters),user),scopedTransactions=allowed.filter(row=>belongsToRestaurant(row.company_id,brand));if(slug.includes('budget')){const scopedBudgets=inScope(applyFilters(budgets,filters),user);return scopedBudgets.map(row=>{const actual=scopedTransactions.filter(tx=>tx.account_code===row.account_code&&(row.department_id==='Semua Department'||tx.department_id===row.department_id)&&(row.cost_center_id==='Semua Cost Center'||tx.cost_center_id===row.cost_center_id)).reduce((sum,tx)=>sum+signed(tx),0);return {...row,actual,variance:row.budget-actual}})}const statement=slug==='neraca'?'balance-sheet':slug==='laba-rugi'?'income-statement':slug==='arus-kas'?'cash-flow':null;if(statement)return scopedTransactions.filter(row=>row.statement_type===statement);return scopedTransactions.map(row=>({...row,transaction_date:row.transaction_date?new Date(`${row.transaction_date}T00:00:00`):'',report_category:row.report_category||row.description,balance:signed(row)}))},[transactions,budgets,filters,user,slug,brand]);
  const runExport=async()=>{if(exporting||!can(slug,'export'))return;if(slug!=='dashboard'&&!exportRows.length){setMessage('Tidak ada data untuk diekspor.');return}setExporting(true);setMessage('');try{const statement=slug==='neraca'||slug==='laba-rugi'||slug==='arus-kas';if(slug==='dashboard')await downloadDashboard(exportRows as FinancialTransaction[],filters,brand);else if(statement)await downloadFinancialReport(slug,exportRows as FinancialTransaction[],filters,title,brand);else{const isBudget=slug.includes('budget');downloadExcel(isBudget?budgetColumns:transactionColumns,exportRows as Record<string,string|number|Date>[],excelFilename(title,filters.period,filters.company_id),title)}}finally{setExporting(false)}};
  return <><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><div className="label mb-2 text-blue-500">Finance / Overview</div><h1 className="text-2xl font-bold tracking-tight">{title}</h1><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div><div className="flex flex-wrap gap-2">{extra}<PermissionGate resource={slug} action="upload"><button onClick={onUpload} className="btn btn-primary"><Upload size={14}/> Upload File</button></PermissionGate><PermissionGate resource={slug} action="export"><button onClick={()=>downloadTemplate(title,slug)} className="btn" type="button"><FileDown size={14}/> Download Template</button><button onClick={runExport} disabled={exporting} className="btn" type="button"><Download size={14}/> {exporting?'Exporting...':'Export Excel'}</button></PermissionGate><button className="btn desktop-only"><Printer size={14}/> Print</button></div></div>{message&&<p role="status" className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-xs text-amber-300">{message}</p>}</>;
}

export function ModulePage({title,subtitle,slug}:{title:string;subtitle:string;slug:string}){
  const [open,setOpen]=useState(false);const [tab,setTab]=useState<'data'|'history'>('data');const financialReport=slug==='neraca'||slug==='laba-rugi'||slug==='arus-kas';const budgetType=slug==='ringkasan-budget'?'summary':slug==='budget-vs-actual'?'comparison':slug==='budget-department'?'department':slug==='budget-account'?'account':slug==='upload-budget'?'summary':null;
  const report=slug==='neraca'?<NeracaReport/>:slug==='laba-rugi'?<LabaRugiReport/>:<CashFlowReport/>;
  return <><PageHeader title={title} subtitle={subtitle} slug={slug} onUpload={()=>setOpen(true)}/><div className="mt-6"><FilterBar/></div><div className="mt-6 flex border-b border-[#203047]"><button onClick={()=>setTab('data')} className={`${tab==='data'?'border-blue-500 text-white':'border-transparent text-slate-500'} border-b-2 px-5 py-3 text-xs font-semibold`}>Laporan</button><button onClick={()=>setTab('history')} className={`${tab==='history'?'border-blue-500 text-white':'border-transparent text-slate-500'} border-b-2 px-5 py-3 text-xs font-semibold`}>Upload History</button></div><div className="mt-4">{tab==='history'?<UploadHistory module={budgetType?'Budget':undefined}/>:budgetType?<BudgetReport type={budgetType}/>:financialReport?report:<><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Data {title}</h2><p className="mt-1 text-[10px] text-slate-500">Data operasional modul.</p></div><PermissionGate resource={slug} action="edit"><button className="btn"><Plus size={14}/> Tambah Data</button></PermissionGate></div><DataTable type={slug}/></>}</div><UploadModal open={open} onOpenChange={setOpen} module={budgetType?'Budget':title}/></>;
}
