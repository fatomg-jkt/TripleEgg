'use client';

import {createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import type {LucideIcon} from 'lucide-react';
import {Bot,Building2,ChartNoAxesCombined,Boxes,Landmark,Percent,ReceiptText,Scale,ShoppingCart,Target,TrendingUp,Wallet} from 'lucide-react';
import {Bar,BarChart,CartesianGrid,Cell,Legend,Line,LineChart,Pie,PieChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {applyFilters,monthNames,useFinancial} from '@/lib/financial-store';
import type {DashboardFilters,FinancialTransaction} from '@/lib/schema';
import {calculateDashboard,calculateLabaRugi,groupedTransactions} from '@/lib/financial-report-data';

const rupiah=(n:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const compact=(n:number)=>new Intl.NumberFormat('id-ID',{notation:'compact',maximumFractionDigits:1}).format(n);
const pct=(n:number)=>`${n.toLocaleString('id-ID',{maximumFractionDigits:1})}%`;
const tooltipStyle={contentStyle:{background:'#0b1726',border:'1px solid #203047',borderRadius:10,fontSize:11},labelStyle:{color:'#cbd5e1'}};
const chartColors=['#2563eb','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4'];
const toneClass:Record<string,string>={emerald:'bg-emerald-500/15 text-emerald-400',blue:'bg-blue-500/15 text-blue-400',cyan:'bg-cyan-500/15 text-cyan-400',violet:'bg-violet-500/15 text-violet-400',amber:'bg-amber-500/15 text-amber-400',red:'bg-red-500/15 text-red-400'};
const toneStroke:Record<string,string>={emerald:'#10b981',blue:'#3b82f6',cyan:'#06b6d4',violet:'#8b5cf6',amber:'#f59e0b',red:'#ef4444'};

type KPIItem={title:string;value:number;icon:LucideIcon;tone:string;kind:'currency'|'percent';trend?:number[]};

function useDashboardDataValue(){
  const {transactions,filters}=useFinancial();
  return useMemo(()=>{
    const filtered=applyFilters(transactions,filters);
    const summary=calculateDashboard(filtered);
    const incomeRows=filtered.filter(row=>row.statement_type==='income-statement'||!row.statement_type||row.statement_type==='journal');
    const labaRugi=calculateLabaRugi(incomeRows);
    const monthly=summary.monthly;
    const revenueTrend=monthly.map(x=>x.income);
    const profitTrend=monthly.map(x=>x.profit);
    const expenseTrend=monthly.map(x=>x.expense);
    const marginTrend=monthly.map(x=>x.income?x.profit/x.income*100:0);
    const flat=(value:number)=>[value,value,value];
    const k=summary.kpis;
    const balanceKpis:KPIItem[]=[
      {title:'Kas & Bank',value:k.cash,icon:Wallet,tone:'emerald',kind:'currency',trend:flat(k.cash)},
      {title:'Persediaan',value:k.inventory,icon:Boxes,tone:'blue',kind:'currency',trend:flat(k.inventory)},
      {title:'Total Aset',value:k.asset,icon:Building2,tone:'cyan',kind:'currency',trend:flat(k.asset)},
      {title:'Total Liabilitas',value:k.liability,icon:Scale,tone:'violet',kind:'currency',trend:flat(k.liability)},
      {title:'Total Ekuitas',value:k.equity,icon:Landmark,tone:'amber',kind:'currency',trend:flat(k.equity)},
    ];
    const incomeKpis:KPIItem[]=[
      {title:'Pendapatan',value:k.revenue,icon:TrendingUp,tone:'emerald',kind:'currency',trend:revenueTrend},
      {title:'Laba Bersih',value:k.profit,icon:ChartNoAxesCombined,tone:'blue',kind:'currency',trend:profitTrend},
      {title:'HPP / COGS',value:labaRugi.totalHpp,icon:ShoppingCart,tone:'amber',kind:'currency',trend:flat(labaRugi.totalHpp)},
      {title:'Beban / Biaya Operasional',value:labaRugi.totalExpense,icon:ReceiptText,tone:'red',kind:'currency',trend:expenseTrend},
      {title:'Margin Laba Bersih',value:labaRugi.netMargin,icon:Percent,tone:'violet',kind:'percent',trend:marginTrend},
    ];
    return {rows:filtered,monthly,balanceKpis,incomeKpis,labaRugi,kpis:k};
  },[transactions,filters]);
}

type DashboardData=ReturnType<typeof useDashboardDataValue>;
const DashboardDataContext=createContext<DashboardData|null>(null);
export function DashboardDataProvider({children}:{children:React.ReactNode}){
  const value=useDashboardDataValue();
  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}
export function useDashboardData(){
  const value=useContext(DashboardDataContext);
  if(!value)throw new Error('DashboardDataProvider is required');
  return value;
}

const unique=(a:string[])=>Array.from(new Set(a.filter(Boolean))).sort();
export function FilterBar({hidePeriodMonth=false}:{hidePeriodMonth?:boolean}={}){
  const {transactions,budgets,filters,setFilters}=useFinancial();
  const fields=useMemo<[string,keyof DashboardFilters,[string,string][]][]>(()=>{
    const filterRows=[...transactions,...budgets];
    return [
      ['Periode','period',[['all','Semua Periode'],...unique(filterRows.map(x=>x.period)).map(x=>[x,x] as [string,string])]],
      ['Bulan','month',[['all','Semua Bulan'],...monthNames.map((x,i)=>[String(i+1),x] as [string,string])]],
      ['Tahun','year',[['all','Semua Tahun'],...unique(filterRows.map(x=>String(x.year))).map(x=>[x,x] as [string,string])]],
      ['Company','company_id',[['all','Semua Perusahaan'],...unique(filterRows.map(x=>x.company_id)).map(x=>[x,x] as [string,string])]],
      ['Department','department_id',[['all','Semua Department'],...unique(filterRows.map(x=>x.department_id)).map(x=>[x,x] as [string,string])]],
      ['Cost Center','cost_center_id',[['all','Semua Cost Center'],...unique(filterRows.map(x=>x.cost_center_id)).map(x=>[x,x] as [string,string])]],
    ];
  },[transactions,budgets]);
  const update=(key:keyof DashboardFilters,value:string)=>setFilters({...filters,[key]:value});
  const visible=hidePeriodMonth?fields.filter(([,key])=>key!=='period'&&key!=='month'&&key!=='year'):fields;
  return <div className="card grid grid-cols-2 gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">{visible.map(([label,key,options])=><label key={key}><span className="label">{label}</span><select value={filters[key]} onChange={e=>update(key,e.target.value)} className="field mt-1 w-full">{options.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>)}</div>;
}

function delta(current:number,previous:number){if(!previous)return 0;return (current-previous)/Math.abs(previous)*100;}
function Sparkline({data,color}:{data:number[];color:string}){
  const values=data.length?data:[0,0,0];
  const min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  const points=values.map((value,index)=>{const x=values.length===1?43:index/(values.length-1)*84+1;const y=32-(value-min)/range*30;return `${x.toFixed(1)},${y.toFixed(1)}`}).join(' ');
  return <svg aria-hidden="true" className="h-[34px] w-[86px] shrink-0" viewBox="0 0 86 34" preserveAspectRatio="none"><polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/></svg>;
}

function KPISection({title,items}:{title:string;items:KPIItem[]}){
  return <section>
    <div className="mb-2 flex items-center gap-3"><span className="text-[11px] font-semibold uppercase tracking-[.18em] text-blue-300">{title}</span><div className="h-px flex-1 bg-[#203047]"/></div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">{items.map(item=>{
      const Icon=item.icon;
      const series=item.trend||[];
      const change=series.length>1?delta(series[series.length-1]||0,series[series.length-2]||0):0;
      const hasMeaningfulTrend=series.length>1&&series.some((value,index)=>index===0?false:value!==series[index-1]);
      return <div key={item.title} className="card p-4">
        <div className="flex items-center gap-3"><div className={`rounded-xl p-3 ${toneClass[item.tone]}`}><Icon size={19}/></div><div className="min-w-0 flex-1"><div className="label truncate">{item.title}</div><div className="mt-1 text-lg font-bold">{item.kind==='percent'?pct(item.value):rupiah(item.value)}</div></div></div>
        <div className="mt-3 flex items-end justify-between gap-2"><div className={`text-[10px] ${hasMeaningfulTrend?(change>=0?'text-emerald-400':'text-red-400'):'text-slate-500'}`}>{hasMeaningfulTrend?`${change>=0?'▲':'▼'} ${Math.abs(change).toLocaleString('id-ID',{maximumFractionDigits:1})}% vs periode lalu`:'Posisi periode terpilih'}</div><Sparkline data={series} color={toneStroke[item.tone]}/></div>
      </div>;
    })}</div>
  </section>;
}

export function KPIGrid(){
  const {balanceKpis,incomeKpis}=useDashboardData();
  return <div className="space-y-5"><KPISection title="A. Komponen Neraca" items={balanceKpis}/><KPISection title="B. Komponen Laba Rugi" items={incomeKpis}/></div>;
}

function expenseComposition(rows:FinancialTransaction[]){
  const expense=rows.filter(row=>row.account_type==='expense');
  return groupedTransactions(expense).map(x=>({name:x.category,value:Math.abs(x.total)})).filter(x=>x.value>0).sort((a,b)=>b.value-a.value).slice(0,5);
}

function useNearViewport(){
  const ref=useRef<HTMLElement|null>(null);
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    const node=ref.current;
    if(!node)return;
    if(typeof IntersectionObserver==='undefined'){setVisible(true);return;}
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:'320px'});
    observer.observe(node);
    return ()=>observer.disconnect();
  },[]);
  return {ref,visible};
}

export function Charts(){
  const {monthly,rows,labaRugi}=useDashboardData();
  const {ref,visible}=useNearViewport();
  const data=useMemo(()=>monthly.map(row=>({...row,month:monthNames[row.month-1]})),[monthly]);
  const composition=useMemo(()=>expenseComposition(rows),[rows]);
  const totalComp=useMemo(()=>composition.reduce((sum,item)=>sum+item.value,0),[composition]);
  const heading=<div className="mb-2 flex items-center gap-3"><span className="text-[11px] font-semibold uppercase tracking-[.18em] text-blue-300">Analisa & Insight Otomatis</span><div className="h-px flex-1 bg-[#203047]"/></div>;
  if(!visible)return <section ref={ref}>{heading}<div className="grid gap-4 xl:grid-cols-12"><div className="card h-[270px] xl:col-span-4"/><div className="card h-[270px] xl:col-span-3"/><div className="card h-[270px] xl:col-span-3"/><div className="card h-[270px] xl:col-span-2"/></div></section>;
  if(!data.length)return <section ref={ref}>{heading}<div className="grid gap-4 xl:grid-cols-4">{['Trend Pendapatan vs Beban','Laba Bersih per Bulan','Komposisi Beban Operasional','Insight Utama'].map(title=><Chart title={title} key={title}><Empty/></Chart>)}</div></section>;
  return <section ref={ref}>
    {heading}
    <div className="grid gap-4 xl:grid-cols-12">
      <div className="xl:col-span-4"><Chart title="Trend Pendapatan vs Beban"><ResponsiveContainer width="100%" height={235}><LineChart data={data}><CartesianGrid stroke="#203047" strokeDasharray="3 3"/><XAxis dataKey="month" stroke="#64748b" tick={{fontSize:10}}/><YAxis stroke="#64748b" tickFormatter={compact} tick={{fontSize:10}}/><Tooltip {...tooltipStyle}/><Legend/><Line dataKey="income" name="Pendapatan" stroke="#10b981" strokeWidth={2.5} dot={{r:3}} isAnimationActive={false}/><Line dataKey="expense" name="Beban Operasional" stroke="#ef4444" strokeWidth={2.5} dot={{r:3}} isAnimationActive={false}/></LineChart></ResponsiveContainer></Chart></div>
      <div className="xl:col-span-3"><Chart title="Laba Bersih per Bulan"><ResponsiveContainer width="100%" height={235}><BarChart data={data}><CartesianGrid stroke="#203047" strokeDasharray="3 3"/><XAxis dataKey="month" stroke="#64748b" tick={{fontSize:10}}/><YAxis stroke="#64748b" tickFormatter={compact} tick={{fontSize:10}}/><Tooltip {...tooltipStyle}/><Bar dataKey="profit" name="Laba Bersih" fill="#2563eb" radius={[5,5,0,0]} isAnimationActive={false}/></BarChart></ResponsiveContainer></Chart></div>
      <div className="xl:col-span-3"><Chart title="Komposisi Beban Operasional"><div className="grid grid-cols-2 items-center gap-2"><div className="h-[220px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={composition} dataKey="value" nameKey="name" innerRadius={50} outerRadius={76} paddingAngle={2} isAnimationActive={false}>{composition.map((_,index)=><Cell key={index} fill={chartColors[index%chartColors.length]}/>)}</Pie><Tooltip {...tooltipStyle}/></PieChart></ResponsiveContainer></div><div className="min-w-0 space-y-2">{composition.length?composition.map((item,index)=><div key={item.name} className="flex items-center justify-between gap-2 text-[10px]"><span className="truncate text-slate-300"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{background:chartColors[index%chartColors.length]}}/>{item.name}</span><b>{totalComp?pct(item.value/totalComp*100):'0%'}</b></div>):<div className="text-[10px] text-slate-500">Belum ada rincian beban.</div>}</div></div></Chart></div>
      <div className="xl:col-span-2"><Chart title="Insight Utama"><div className="space-y-3"><InsightMini icon={TrendingUp} label="Pendapatan" value={rupiah(labaRugi.totalRevenue)} tone="emerald"/><InsightMini icon={ChartNoAxesCombined} label="Laba Bersih" value={rupiah(labaRugi.netProfit)} tone="blue"/><InsightMini icon={Percent} label="Margin Laba Bersih" value={pct(labaRugi.netMargin)} tone="violet"/></div></Chart></div>
    </div>
  </section>;
}

function InsightMini({icon:Icon,label,value,tone}:{icon:LucideIcon;label:string;value:string;tone:string}){
  return <div className="flex items-center gap-3 rounded-xl border border-[#203047] bg-[#0b1726]/70 p-3"><div className={`rounded-lg p-2 ${toneClass[tone]}`}><Icon size={16}/></div><div className="min-w-0"><div className="text-[10px] text-slate-400">{label}</div><div className="truncate text-sm font-semibold">{value}</div></div></div>;
}
function Empty({text='Belum ada data untuk periode ini.'}:{text?:string}){return <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-[#2a3b53] text-center text-xs text-slate-500">{text}</div>;}
function Chart({title,children}:{title:string;children:React.ReactNode}){return <div className="card h-full p-4"><h3 className="mb-4 text-sm font-semibold">{title}</h3>{children}</div>;}

export function Insights(){
  const {rows,kpis,labaRugi,monthly}=useDashboardData();
  if(!rows.length)return <div className="card p-5"><div className="flex items-center gap-2"><div className="rounded-lg bg-blue-500/10 p-2 text-blue-400"><Bot size={17}/></div><div><h3 className="text-sm font-semibold">Analisa Otomatis</h3><p className="text-[10px] text-slate-500">Insight berdasarkan laporan periode terpilih</p></div></div><div className="mt-4 rounded-lg border border-dashed border-[#2a3b53] p-5 text-center text-xs text-slate-400">Belum ada data yang cukup. Upload Neraca dan/atau Laba Rugi.</div></div>;
  const debtAsset=kpis.asset?kpis.liability/kpis.asset*100:0;
  const last=monthly[monthly.length-1];
  const previous=monthly[monthly.length-2];
  const revenueGrowth=last&&previous&&previous.income?delta(last.income,previous.income):0;
  const cards=[
    {title:'Kinerja Pendapatan',text:`Pendapatan ${revenueGrowth>=0?'meningkat':'menurun'} ${Math.abs(revenueGrowth).toLocaleString('id-ID',{maximumFractionDigits:1})}% dibanding periode lalu.`,icon:TrendingUp,tone:'emerald'},
    {title:'Kas & Bank',text:`Posisi kas saat ini ${rupiah(kpis.cash)}.`,icon:Wallet,tone:'blue'},
    {title:'HPP Terkendali',text:`Rasio HPP terhadap pendapatan ${labaRugi.totalRevenue?pct(labaRugi.totalHpp/labaRugi.totalRevenue*100):'N/A'}.`,icon:ShoppingCart,tone:'amber'},
    {title:'Efisiensi & Risiko',text:`Margin laba bersih ${pct(labaRugi.netMargin)} dan debt-to-asset ${pct(debtAsset)}.`,icon:Target,tone:'violet'},
  ];
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{cards.map(card=>{const Icon=card.icon;return <div key={card.title} className="card flex items-center gap-3 p-4"><div className={`rounded-full p-3 ${toneClass[card.tone]}`}><Icon size={18}/></div><div><div className="text-xs font-semibold">{card.title}</div><div className="mt-1 text-[10px] leading-5 text-slate-400">{card.text}</div></div></div>;})}</div>;
}
