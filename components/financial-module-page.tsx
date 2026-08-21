'use client';
import {useState} from 'react';
import {FilterBar} from './dashboard';
import {UploadHistory} from './data-table';
import {PageHeader} from './page';
import {LabaRugiReport,type LabaRugiPeriodSelection} from './financial-reports';
import {NeracaReportWithPeriods,CashFlowReportWithPeriods} from './financial-multi-reports';
import {FinancialUploadModal} from './financial-upload';

export function FinancialModulePage({title,subtitle,slug}:{title:string;subtitle:string;slug:'neraca'|'laba-rugi'|'arus-kas'}){
 const [open,setOpen]=useState(false),[tab,setTab]=useState<'data'|'history'>('data'),[labaRugiPeriod,setLabaRugiPeriod]=useState<LabaRugiPeriodSelection|null>(null);
 const report=slug==='neraca'?<NeracaReportWithPeriods/>:slug==='laba-rugi'?<LabaRugiReport onPeriodChange={setLabaRugiPeriod}/>:<CashFlowReportWithPeriods/>;
 const module=slug==='neraca'?'Neraca':slug==='laba-rugi'?'Laba Rugi':'Arus Kas';
 return <><PageHeader title={title} subtitle={subtitle} slug={slug} labaRugiPeriod={labaRugiPeriod} onUpload={()=>setOpen(true)}/><div className="no-print mt-6"><FilterBar hidePeriodMonth={!!labaRugiPeriod}/></div><div className="no-print mt-6 flex border-b border-[#203047]"><button onClick={()=>setTab('data')} className={`${tab==='data'?'border-blue-500 text-white':'border-transparent text-slate-500'} border-b-2 px-5 py-3 text-xs font-semibold`}>Laporan</button><button onClick={()=>setTab('history')} className={`${tab==='history'?'border-blue-500 text-white':'border-transparent text-slate-500'} border-b-2 px-5 py-3 text-xs font-semibold`}>Upload History</button></div><div className="mt-4">{tab==='history'?<UploadHistory/>:report}</div><FinancialUploadModal open={open} onOpenChange={setOpen} module={module}/></>
}
