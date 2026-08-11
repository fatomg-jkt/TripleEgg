'use client';

import {useState} from 'react';
import {Download,FileDown,Plus,Printer,Upload} from 'lucide-react';
import {UploadModal} from './upload';
import {DataTable,UploadHistory} from './data-table';
import {FilterBar} from './dashboard';
import {CashFlowReport,LabaRugiReport,NeracaReport} from './financial-reports';
import {BudgetReport} from './budget-reports';
import {PermissionGuard} from './auth-provider';
import type {MenuId} from '@/lib/permissions';

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

export function downloadTemplate(title:string,slug='dashboard'){
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

export function PageHeader({title,subtitle,onUpload,slug='dashboard',extra}:{title:string;subtitle:string;onUpload:()=>void;slug?:string;extra?:React.ReactNode}){
  return <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><div className="label mb-2 text-blue-500">Finance / Overview</div><h1 className="text-2xl font-bold tracking-tight">{title}</h1><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div><div className="flex flex-wrap gap-2">{extra}<PermissionGuard menu={slug as MenuId} action="upload"><button onClick={onUpload} className="btn btn-primary"><Upload size={14}/> Upload File</button></PermissionGuard><button onClick={()=>downloadTemplate(title,slug)} className="btn" type="button"><FileDown size={14}/> Download Template</button><PermissionGuard menu={slug as MenuId} action="export"><button className="btn"><Download size={14}/> Export Excel</button><button className="btn desktop-only"><Printer size={14}/> Print</button></PermissionGuard></div></div>;
}

export function ModulePage({title,subtitle,slug}:{title:string;subtitle:string;slug:string}){
  const [open,setOpen]=useState(false);const [tab,setTab]=useState<'data'|'history'>('data');const financialReport=slug==='neraca'||slug==='laba-rugi'||slug==='arus-kas';const budgetType=slug==='ringkasan-budget'?'summary':slug==='budget-vs-actual'?'comparison':slug==='budget-department'?'department':slug==='budget-account'?'account':slug==='upload-budget'?'summary':null;
  const report=slug==='neraca'?<NeracaReport/>:slug==='laba-rugi'?<LabaRugiReport/>:<CashFlowReport/>;
  return <><PageHeader title={title} subtitle={subtitle} slug={slug} onUpload={()=>setOpen(true)}/><div className="mt-6"><FilterBar/></div><div className="mt-6 flex border-b border-[#203047]"><button onClick={()=>setTab('data')} className={`${tab==='data'?'border-blue-500 text-white':'border-transparent text-slate-500'} border-b-2 px-5 py-3 text-xs font-semibold`}>Laporan</button><button onClick={()=>setTab('history')} className={`${tab==='history'?'border-blue-500 text-white':'border-transparent text-slate-500'} border-b-2 px-5 py-3 text-xs font-semibold`}>Upload History</button></div><div className="mt-4">{tab==='history'?<UploadHistory module={budgetType?'Budget':undefined}/>:budgetType?<BudgetReport type={budgetType}/>:financialReport?report:<><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Data {title}</h2><p className="mt-1 text-[10px] text-slate-500">Data operasional modul.</p></div><PermissionGuard menu={slug as MenuId} action="edit"><button className="btn"><Plus size={14}/> Tambah Data</button></PermissionGuard></div><DataTable type={slug}/></>}</div><UploadModal open={open} onOpenChange={setOpen} module={budgetType?'Budget':title}/></>;
}
