'use client';

import {useState} from 'react';
import {Download,FileDown,Plus,Printer,Upload} from 'lucide-react';
import {UploadModal} from './upload';
import {DataTable,UploadHistory} from './data-table';
import {FilterBar} from './dashboard';

const templateColumns:Record<string,string[]>={
  dashboard:['Tanggal','Kode Akun','Nama Akun','Tipe Akun','Debit','Credit','Department','Cost Center','Description'],
  neraca:['Kode Akun','Nama Akun','Kategori','Saldo'],
  'laba-rugi':['Kode Akun','Nama Akun','Kategori','Actual','Budget'],
  'arus-kas':['Tanggal','Aktivitas','Keterangan','Kas Masuk','Kas Keluar'],
  'ringkasan-budget':['Periode','Department','Cost Center','Kode Akun','Budget'],
  'budget-vs-actual':['Periode','Department','Cost Center','Kode Akun','Budget','Actual'],
  'budget-department':['Periode','Department','Budget'],
  'budget-account':['Periode','Kode Akun','Nama Akun','Budget'],
  'upload-budget':['Periode','Department','Cost Center','Kode Akun','Budget'],
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
  const columns=templateColumns[slug]||['Tanggal','Kode Akun','Nama Akun','Debit','Credit','Department','Cost Center','Description'];
  const sample=columns.map(c=>{
    const key=c.toLowerCase();
    if(key.includes('tanggal')||key.includes('date')) return '2026-07-01';
    if(key.includes('kode akun')||key.includes('account code')) return '110001';
    if(key.includes('nama akun')||key.includes('account name')) return 'Kas & Bank';
    if(key==='status') return 'Active';
    if(key.includes('budget')||key.includes('actual')||key.includes('saldo')||key.includes('amount')||key.includes('debit')||key.includes('credit')||key.includes('kas masuk')||key.includes('kas keluar')) return '0';
    return '';
  });
  const escape=(value:string)=>`"${value.replaceAll('"','""')}"`;
  const sampleRows=[['110001','Kas & Bank','asset'],['410001','Pendapatan Usaha','revenue'],['510001','Beban Operasional','expense']].map(([code,name,type],row)=>sample.map((v,i)=>{const column=columns[i];if(column==='Kode Akun')return code;if(column==='Nama Akun')return name;if(column==='Tipe Akun')return type;if(column==='Debit')return row===0?'1000000':'0';if(column==='Credit')return row===0?'0':'1000000';if(column==='Description')return `SAMPLE ${row+1} - hapus baris contoh sebelum import`;return v}));
  const csv=['sep=;',columns.map(escape).join(';'),...sampleRows.map(row=>row.map(escape).join(';'))].join('\r\n');
  const blob=new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=`template-${slug||title.toLowerCase().replaceAll(' ','-')}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function PageHeader({title,subtitle,onUpload,slug='dashboard',extra}:{title:string;subtitle:string;onUpload:()=>void;slug?:string;extra?:React.ReactNode}){
  return <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
    <div><div className="label mb-2 text-blue-500">Finance / Overview</div><h1 className="text-2xl font-bold tracking-tight">{title}</h1><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div>
    <div className="flex flex-wrap gap-2">
      {extra}
      <button onClick={onUpload} className="btn btn-primary"><Upload size={14}/> Upload File</button>
      <button onClick={()=>downloadTemplate(title,slug)} className="btn" type="button"><FileDown size={14}/> Download Template</button>
      <button className="btn"><Download size={14}/> Export Excel</button>
      <button className="btn desktop-only"><Printer size={14}/> Print</button>
    </div>
  </div>;
}

export function ModulePage({title,subtitle,slug}:{title:string;subtitle:string;slug:string}){
  const [open,setOpen]=useState(false);
  const [tab,setTab]=useState<'data'|'history'>('data');
  return <>
    <PageHeader title={title} subtitle={subtitle} slug={slug} onUpload={()=>setOpen(true)}/>
    <div className="mt-6"><FilterBar/></div>
    <div className="mt-6 flex border-b border-[#203047]"><button onClick={()=>setTab('data')} className={`${tab==='data'?'border-blue-500 text-white':'border-transparent text-slate-500'} border-b-2 px-5 py-3 text-xs font-semibold`}>Data</button><button onClick={()=>setTab('history')} className={`${tab==='history'?'border-blue-500 text-white':'border-transparent text-slate-500'} border-b-2 px-5 py-3 text-xs font-semibold`}>Upload History</button></div>
    <div className="mt-4">{tab==='data'?<><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Data {title}</h2><p className="mt-1 text-[10px] text-slate-500">Data mock siap dihubungkan dengan API/database.</p></div><button className="btn"><Plus size={14}/> Tambah Data</button></div><DataTable type={slug}/></>:<UploadHistory/>}</div>
    <UploadModal open={open} onOpenChange={setOpen} module={title}/>
  </>;
}
