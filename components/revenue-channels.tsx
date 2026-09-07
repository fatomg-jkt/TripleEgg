'use client';

import {useMemo} from 'react';
import {BadgePercent,TrendingUp,Trophy} from 'lucide-react';
import {applyFilters,monthNames,useFinancial} from '@/lib/financial-store';
import {transactionBalance} from '@/lib/financial-report-data';
import type {DashboardFilters,FinancialTransaction} from '@/lib/schema';
import type {LabaRugiPeriodSelection} from './financial-reports';

const money=(value:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value);
const percent=(value:number)=>`${value.toLocaleString('id-ID',{maximumFractionDigits:1})}%`;

type ChannelKey='dine'|'gofood'|'grabfood'|'event'|'catering';
type ChannelMetric={key:ChannelKey;label:string;gross:number;deduction:number;net:number};
const channelOrder:{key:ChannelKey;label:string}[]=[
  {key:'dine',label:'Dine'},
  {key:'gofood',label:'GoFood'},
  {key:'grabfood',label:'GrabFood'},
  {key:'event',label:'Event'},
  {key:'catering',label:'Catering'},
];

function channelFromName(name:string):ChannelKey|null{
  const value=name.toLowerCase().replace(/\s+/g,' ');
  if(/\bdine\b/.test(value))return'dine';
  if(/go\s*food|gofood/.test(value))return'gofood';
  if(/grab\s*food|grabfood/.test(value))return'grabfood';
  if(/\bevent\b/.test(value))return'event';
  if(/catering/.test(value))return'catering';
  return null;
}
function isDeduction(row:FinancialTransaction){return /potongan|diskon|discount/.test(`${row.account_name} ${row.report_category||''} ${row.description||''}`.toLowerCase())}
function incomeChannelRows(rows:FinancialTransaction[]){return rows.filter(row=>row.statement_type==='income-statement'&&row.account_type==='revenue'&&channelFromName(row.account_name)!==null)}
function aggregateChannels(rows:FinancialTransaction[]):ChannelMetric[]{
  const map=new Map<ChannelKey,ChannelMetric>(channelOrder.map(item=>[item.key,{...item,gross:0,deduction:0,net:0}]));
  incomeChannelRows(rows).forEach(row=>{
    const key=channelFromName(row.account_name);if(!key)return;
    const item=map.get(key)!;const value=transactionBalance(row);
    if(isDeduction(row))item.deduction+=value;else item.gross+=value;
    item.net=item.gross+item.deduction;
  });
  return channelOrder.map(item=>map.get(item.key)!).filter(item=>Math.abs(item.gross)>0.5||Math.abs(item.deduction)>0.5);
}
function baseMultiFilters(filters:DashboardFilters):DashboardFilters{return {...filters,period:'all',month:'all',year:'all'}}
function periodRows(transactions:FinancialTransaction[],filters:DashboardFilters,month:number,year:number){
  const base=applyFilters(transactions,baseMultiFilters(filters));
  return base.filter(row=>row.month===month&&row.year===year);
}

export function RevenueChannelDetail({selection}:{selection:LabaRugiPeriodSelection|null}){
  const {transactions,filters}=useFinancial();
  const filtered=useMemo(()=>selection?applyFilters(transactions,baseMultiFilters(filters)):applyFilters(transactions,filters),[transactions,filters,selection]);
  const overall=useMemo(()=>aggregateChannels(filtered),[filtered]);
  const monthMetrics=useMemo(()=>selection?selection.months.map(period=>({period,metrics:aggregateChannels(periodRows(transactions,filters,period.month,period.year))})):[],[selection,transactions,filters]);
  if(!overall.length)return null;
  const totalNet=overall.reduce((sum,item)=>sum+item.net,0);
  const top=[...overall].sort((a,b)=>b.net-a.net)[0];
  const valueFor=(metrics:ChannelMetric[],key:ChannelKey,field:'gross'|'deduction'|'net')=>metrics.find(item=>item.key===key)?.[field]||0;
  const row=(item:ChannelMetric,field:'gross'|'deduction'|'net')=><tr key={`${field}-${item.key}`}>
    <td className="font-medium text-slate-200">{item.label}</td>
    {selection?monthMetrics.map(({period,metrics})=><td key={`${period.year}-${period.month}`} className="text-right tabular-nums">{money(valueFor(metrics,item.key,field))}</td>):<td className="text-right tabular-nums">{money(item[field])}</td>}
    <td className="text-right font-semibold tabular-nums">{money(item[field])}</td>
    <td className="text-right text-slate-400">{field==='net'&&totalNet?percent(item.net/totalNet*100):'—'}</td>
  </tr>;
  const colSpan=(selection?.months.length||1)+3;
  return <section className="mt-5 overflow-hidden rounded-xl border border-[#203047] bg-[#0a1522]">
    <div className="border-b border-[#203047] bg-[#101e30] px-5 py-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div><h2 className="text-base font-bold">Detail Pendapatan per Channel</h2><p className="mt-1 text-xs text-slate-500">Breakdown Dine, GoFood, GrabFood, Event, dan Catering dari file Wok This Way.</p></div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs"><span className="text-slate-400">Pendapatan tertinggi</span><div className="mt-0.5 font-bold text-emerald-300">{top.label} · {money(top.net)}</div></div>
      </div>
    </div>
    <div className="overflow-x-auto"><table className="quarter-table min-w-[850px]"><thead><tr><th>Channel</th>{selection?selection.months.map(period=><th className="text-right" key={`${period.year}-${period.month}`}>{monthNames[period.month-1].slice(0,3).toUpperCase()} {period.year}</th>):<th className="text-right">Periode terpilih</th>}<th className="text-right">Total</th><th className="text-right">Kontribusi</th></tr></thead><tbody>
      <tr className="bg-[#101e30]"><th colSpan={colSpan} className="text-left text-xs font-bold uppercase tracking-wide text-slate-200">Pendapatan Kotor per Channel</th></tr>
      {overall.map(item=>row(item,'gross'))}
      <tr className="bg-[#101e30]"><th colSpan={colSpan} className="text-left text-xs font-bold uppercase tracking-wide text-slate-200">Potongan Pendapatan per Channel</th></tr>
      {overall.map(item=>row(item,'deduction'))}
      <tr className="bg-emerald-500/10"><th colSpan={colSpan} className="text-left text-xs font-bold uppercase tracking-wide text-emerald-200">Net Pendapatan per Channel</th></tr>
      {overall.map(item=>row(item,'net'))}
      <tr className="bg-[#111f31] font-bold"><td>TOTAL NET PENDAPATAN CHANNEL</td>{selection?monthMetrics.map(({period,metrics})=><td key={`${period.year}-${period.month}`} className="text-right tabular-nums">{money(metrics.reduce((sum,item)=>sum+item.net,0))}</td>):<td className="text-right tabular-nums">{money(totalNet)}</td>}<td className="text-right tabular-nums">{money(totalNet)}</td><td className="text-right">100%</td></tr>
    </tbody></table></div>
  </section>;
}

export function RevenueChannelAnalysis(){
  const {transactions,filters}=useFinancial();
  const rows=useMemo(()=>applyFilters(transactions,filters),[transactions,filters]);
  const metrics=useMemo(()=>aggregateChannels(rows).sort((a,b)=>b.net-a.net),[rows]);
  if(!metrics.length)return null;
  const total=metrics.reduce((sum,item)=>sum+item.net,0),top=metrics[0],max=Math.max(...metrics.map(item=>Math.abs(item.net)),1);
  return <section>
    <div className="mb-2 flex items-center gap-3"><span className="text-[11px] font-semibold uppercase tracking-[.18em] text-blue-300">Analisa Pendapatan per Channel</span><div className="h-px flex-1 bg-[#203047]"/></div>
    <div className="grid gap-4 xl:grid-cols-12">
      <div className="card p-4 xl:col-span-7"><div className="mb-4"><h3 className="text-sm font-semibold">Ranking Pendapatan Channel</h3><p className="mt-1 text-[10px] text-slate-500">Berdasarkan net pendapatan pada filter dashboard yang aktif.</p></div><div className="space-y-3">{metrics.map((item,index)=>{const share=total?item.net/total*100:0;return <div key={item.key}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="font-medium text-slate-200">#{index+1} {item.label}</span><span className="text-right"><b>{money(item.net)}</b><span className="ml-2 text-slate-500">{percent(share)}</span></span></div><div className="h-2 overflow-hidden rounded-full bg-[#16263a]"><div className="h-full rounded-full bg-blue-500" style={{width:`${Math.max(0,Math.min(100,Math.abs(item.net)/max*100))}%`}}/></div></div>})}</div></div>
      <div className="grid gap-3 sm:grid-cols-3 xl:col-span-5 xl:grid-cols-1">
        <div className="card flex items-center gap-3 p-4"><div className="rounded-xl bg-amber-500/15 p-3 text-amber-300"><Trophy size={19}/></div><div><div className="text-[10px] uppercase tracking-wide text-slate-500">Channel Tertinggi</div><div className="mt-1 text-base font-bold">{top.label}</div><div className="text-[10px] text-slate-400">{money(top.net)}</div></div></div>
        <div className="card flex items-center gap-3 p-4"><div className="rounded-xl bg-emerald-500/15 p-3 text-emerald-300"><BadgePercent size={19}/></div><div><div className="text-[10px] uppercase tracking-wide text-slate-500">Kontribusi Tertinggi</div><div className="mt-1 text-base font-bold">{total?percent(top.net/total*100):'0%'}</div><div className="text-[10px] text-slate-400">dari net pendapatan channel</div></div></div>
        <div className="card flex items-center gap-3 p-4"><div className="rounded-xl bg-blue-500/15 p-3 text-blue-300"><TrendingUp size={19}/></div><div><div className="text-[10px] uppercase tracking-wide text-slate-500">Total Net Channel</div><div className="mt-1 text-base font-bold">{money(total)}</div><div className="text-[10px] text-slate-400">setelah potongan channel</div></div></div>
      </div>
    </div>
  </section>;
}
