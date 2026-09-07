'use client';
import {useState} from 'react';
import {PageHeader} from './page';
import {FilterBar} from './dashboard';
import {UploadHistory} from './data-table';
import {CashFlowReport,LabaRugiReport,NeracaReport,type LabaRugiPeriodSelection} from './financial-reports';
import {FinancialUploadModal} from './financial-upload';
import {RevenueChannelDetail} from './revenue-channels';

export function FinancialModulePage({title,subtitle,slug}:{title:string;subtitle:string;slug:'neraca'|'laba-rugi'|'arus-kas'}){
 const [open,setOpen]=useState(false),[tab,setTab]=useState<'data'|'history'>('data'),[labaRugiPeriod,setLabaRugiPeriod]=useState<LabaRugiPeriodSelection|null>(null);
 const moduleName=slug==='neraca'?'Neraca':slug==='laba-rugi'?'Laba Rugi':'Arus Kas';
 const report=slug==='neraca'?<NeracaReport/>:slug==='laba-rugi'?<LabaRugiReport onPeriodChange={setLabaRugiPeriod}/>:<CashFlowReport/>;
 return <><PageHeader title={title} subtitle={subtitle} slug={slug} labaRugiPeriod={labaRugiPeriod} onUpload={()=>setOpen(true)}/><div className="no-print mt-6"><FilterBar hidePeriodMonth={!!labaRugiPeriod}/></div><div className="no-print mt-6 flex border-b border-[#203047]"><button onClick={()=>setTab('data')} className={`${tab==='data'?'border-blue-500 text-white':'border-transparent text-slate-500'} border-b-2 px-5 py-3 text-xs font-semibold`}>Laporan</button><button onClick={()=>setTab('history')} className={`${tab==='history'?'border-blue-500 text-white':'border-transparent text-slate-500'} border-b-2 px-5 py-3 text-xs font-semibold`}>Upload History</button></div><div className="mt-4">{tab==='history'?<UploadHistory/>:<>{report}{slug==='laba-rugi'&&<RevenueChannelDetail selection={labaRugiPeriod}/>}</>}</div><FinancialUploadModal open={open} onOpenChange={setOpen} module={moduleName}/></>
}
