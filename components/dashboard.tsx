'use client';
import {useMemo} from 'react';
import {Bot,Building2,ChartNoAxesCombined,Boxes,CircleDollarSign,HandCoins,Landmark,ReceiptText,Scale,TrendingUp,Wallet,ShoppingCart,Percent,Target} from 'lucide-react';
import {Bar,BarChart,CartesianGrid,Cell,Legend,Line,LineChart,Pie,PieChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {applyFilters,monthNames,useFinancial} from '@/lib/financial-store';
import type {DashboardFilters,FinancialTransaction} from '@/lib/schema';
import {calculateDashboard,calculateLabaRugi,groupedTransactions,transactionBalance} from '@/lib/financial-report-data';

const rupiah=(n:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const compact=(n:number)=>new Intl.NumberFormat('id-ID',{notation:'compact',maximumFractionDigits:1}).format(n);
const pct=(n:number)=>`${n.toLocaleString('id-ID',{maximumFractionDigits:1})}%`;
const tt={contentStyle:{background:'#0b1726',border:'1px solid #203047',borderRadius:10,fontSize:11},labelStyle:{color:'#cbd5e1'}};
const chartColors=['#2563eb','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4'];

export function useDashboardData(){
  const store=useFinancial();
  const filtered=useMemo(()=>applyFilters(store.transactions,store.filters),[store.transactions,store.filters]);
  const summary=useMemo(()=>calculateDashboard(filtered),[filtered]);
  const incomeRows=filtered.filter(row=>row.statement_type==='income-statement'||!row.statement_type||row.statement_type==='journal');
  const labaRugi=useMemo(()=>calculateLabaRugi(incomeRows),[incomeRows]);
  const k=summary.kpis;
  const balanceKpis=[
    ['Kas & Bank',k.cash,Wallet,'emerald'],
    ['Persediaan',k.inventory,Boxes,'blue'],
    ['Total Aset',k.asset,Building2,'cyan'],
    ['Total Liabilitas',k.liability,Scale,'violet'],
    ['Total Ekuitas',k.equity,Landmark,'amber'],
  ] as const;
  const incomeKpis=[
    ['Pendapatan',k.revenue,TrendingUp,'emerald'],
    ['Laba Bersih',k.profit,ChartNoAxesCombined,'blue'],
    ['HPP / COGS',labaRugi.totalHpp,ShoppingCart,'amber'],
    ['Beban / Biaya Operasional',labaRugi.totalExpense,ReceiptText,'red'],
    ['Margin Laba Bersih',labaRugi.netMargin,Percent,'violet'],
  ] as const;
  return {store,rows:filtered,monthly:summary.monthly,balanceKpis,incomeKpis,labaRugi,kpis:k};
}

const unique=(a:string[])=>Array.from(new Set(a.filter(Boolean))).sort();
export function FilterBar({hidePeriodMonth=false}:{hidePeriodMonth?:boolean}={}){
  const {transactions,budgets,filters,setFilters}=useFinancial();const filterRows=[...transactions,...budgets];
  const update=(key:keyof DashboardFilters,value:string)=>setFilters({...filters,[key]:value});
  const fields:[string,keyof DashboardFilters,[string,string][]][]=[['Periode','period',[['all','Semua Periode'],...unique(filterRows.map(x=>x.period)).map(x=>[x,x] as [string,string])]],['Bulan','month',[['all','Semua Bulan'],...monthNames.map((x,i)=>[String(i+1),x] as [string,string])]],['Tahun','year',[['all','Semua Tahun'],...unique(filterRows.map(x=>String(x.year))).map(x=>[x,x] as [string,string])]],['Company','company_id',[['all','Semua Perusahaan'],...unique(filterRows.map(x=>x.company_id)).map(x=>[x,x] as [string,string])]],['Department','department_id',[['all','Semua Department'],...unique(filterRows.map(x=>x.department_id)).map(x=>[x,x] as [string,string])]],['Cost Center','cost_center_id',[['all','Semua Cost Center'],...unique(filterRows.map(x=>x.cost_center_id)).map(x=>[x,x] as [string,string])]]];
  const visible=hidePeriodMonth?fields.filter(([,key])=>key!=='period'&&key!=='month'&&key!=='year'):fields;
  return <div className="card grid grid-cols-2 gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">{visible.map(([label,key,options])=><label key={key}><span className="label">{label}</span><select value={filters[key]} onChange={e=>update(key,e.target.value)} className="field mt-1 w-full">{options.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>)}</div>;
}

function delta(current:number,previous:number){if(!previous)return 0;return (current-previous)/Math.abs(previous)*100}
function Sparkline({data,color}:{data:number[];color:string}){const rows=data.map((value,index)=>({index,value}));return <ResponsiveContainer width={86} height={34}><LineChart data={rows}><Line dataKey="value" type="monotone" stroke={color} strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer>}
const toneClass:Record<string,string>={emerald:'bg-emerald-500/15 text-emerald-400',blue:'bg-blue-500/15 text-blue-400',cyan:'bg-cyan-500/15 text-cyan-400',violet:'bg-violet-500/15 text-violet-400',amber:'bg-amber-500/15 text-amber-400',red:'bg-red-500/15 text-red-400'};
const toneStroke:Record<string,string>={emerald:'#10b981',blue:'#3b82f6',cyan:'#06b6d4',violet:'#8b5cf6',amber:'#f59e0b',red:'#ef4444'};

function KPISection({title,items,monthly}:{title:string;items:readonly (readonly [string,number,React.ComponentType<{size?:number}>,string])[];monthly:{income:number;expense:number;profit:number}[]}){
  const seriesByTitle=(name:string)=>name==='Pendapatan'?monthly.map(x=>x.income):name==='Laba Bersih'?monthly.map(x=>x.profit):name.includes('Beban')||name.includes('HPP')?monthly.map(x=>x.expense):monthly.map(x=>x.profit);
  return <section><div className="mb-2 flex items-center gap-3"><span className="text-[11px] font-semibold uppercase tracking-[.18em] text-blue-300">{title}</span><div className="h-px flex-1 bg-[#203047]"/></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">{items.map(([name,value,Icon,tone])=>{const series=seriesByTitle(name);const d=series.length>1?delta(series.at(-1)||0,series.at(-2)||0):0;const isPercent=name.includes('Margin');return <div key={name} className="card p-4"><div className="flex items-center gap-3"><div className={`rounded-xl p-3 ${toneClass[tone]}`}><Icon size={19}/></div><div className="min-w-0 flex-1"><div className="label truncate">{name}</div><div className="mt-1 text-lg font-bold">{isPercent?pct(value):rupiah(value)}</div></div></div><div className="mt-3 flex items-end justify-between gap-2"><div className={`text-[10px] ${d>=0?'text-emerald-400':'text-red-400'}`}>{series.length>1?`${d>=0?'▲':'▼'} ${Math.abs(d).toLocaleString('id-ID',{maximumFractionDigits:1})}% vs periode lalu`:'Berdasarkan laporan terfilter'}</div><Sparkline data={series.length?series:[0,0,0]} color={toneStroke[tone]}/></div></div>})}</div></section>;
}

export function KPIGrid(){const {balanceKpis,incomeKpis,monthly}=useDashboardData();return <div className="space-y-5"><KPISection title="A. Komponen Neraca" items={balanceKpis} monthly={monthly}/><KPISection title="B. Komponen Laba Rugi" items={incomeKpis} monthly={monthly}/></div>}

function expenseComposition(rows:FinancialTransaction[]){const expense=rows.filter(row=>row.account_type==='expense');return groupedTransactions(expense).map(x=>({name:x.category,value:Math.abs(x.total)})).filter(x=>x.value>0).sort((a,b)=>b.value-a.value).slice(0,5)}

export function Charts(){
  const {monthly,rows,labaRugi}=useDashboardData();
  const data=monthly.map(row=>({...row,month:monthNames[row.month-1]}));
  const composition=expenseComposition(rows);
  const totalComp=composition.reduce((s,x)=>s+x.value,0);
  if(!data.length)return <div className="grid gap-4 xl:grid-cols-4">{['Trend Pendapatan vs Beban','Laba Bersih per Bulan','Komposisi Beban Operasional','Insight Utama'].map(x=><Chart title={x} key={x}><Empty/></Chart>)}</div>;
  return <section><div className="mb-2 flex items-center gap-3"><span className="text-[11px] font-semibold uppercase tracking-[.18em] text-blue-300">Analisa & Insight Otomatis</span><div className="h-px flex-1 bg-[#203047]"/></div><div className="grid gap-4 xl:grid-cols-12">
    <div className="xl:col-span-4"><Chart title="Trend Pendapatan vs Beban"><ResponsiveContainer width="100%" height={235}><LineChart data={data}><CartesianGrid stroke="#203047" strokeDasharray="3 3"/><XAxis dataKey="month" stroke="#64748b" tick={{fontSize:10}}/><YAxis stroke="#64748b" tickFormatter={compact} tick={{fontSize:10}}/><Tooltip {...tt} formatter={(v:number)=>rupiah(v)}/><Legend/><Line dataKey="income" name="Pendapatan" stroke="#10b981" strokeWidth={2.5} dot={{r:3}}/><Line dataKey="expense" name="Beban Operasional" stroke="#ef4444" strokeWidth={2.5} dot={{r:3}}/></LineChart></ResponsiveContainer></Chart></div>
    <div className="xl:col-span-3"><Chart title="Laba Bersih per Bulan"><ResponsiveContainer width="100%" height={235}><BarChart data={data}><CartesianGrid stroke="#203047" strokeDasharray="3 3"/><XAxis dataKey="month" stroke="#64748b" tick={{fontSize:10}}/><YAxis stroke="#64748b" tickFormatter={compact} tick={{fontSize:10}}/><Tooltip {...tt} formatter={(v:number)=>rupiah(v)}/><Bar dataKey="profit" name="Laba Bersih" fill="#2563eb" radius={[5,5,0,0]}/><Line dataKey="profit" stroke="#60a5fa"/></BarChart></ResponsiveContainer></Chart></div>
    <div className="xl:col-span-3"><Chart title="Komposisi Beban Operasional"><div className="flex items-center gap-3"><div className="h-[220px] w-[56%]"><ResponsiveContainer><PieChart><Pie data={composition} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2}>{composition.map((_,i)=><Cell key={i} fill={chartColors[i%chartColors.length]}/>)}</Pie><Tooltip {...tt} formatter={(v:number)=>rupiah(v)}/></PieChart></ResponsiveContainer></div><div className="min-w-0 flex-1 space-y-2">{composition.map((x,i)=><div key={x.name} className="flex items-center justify-between gap-2 text-[10px]"><span className="truncate text-slate-300"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{background:chartColors[i%chartColors.length]}}/>{x.name}</span><b>{totalComp?pct(x.value/totalComp*100):'0%'}</b></div>)}</div></div></Chart></div>
    <div className="xl:col-span-2"><Chart title="Insight Utama"><div className="space-y-3"><InsightMini icon={TrendingUp} label="Pendapatan" value={rupiah(labaRugi.totalRevenue)} tone="emerald"/><InsightMini icon={ChartNoAxesCombined} label="Laba Bersih" value={rupiah(labaRugi.netProfit)} tone="blue"/><InsightMini icon={Percent} label="Margin Laba Bersih" value={pct(labaRugi.netMargin)} tone="violet"/></div></Chart></div>
  </div></section>;
}

function InsightMini({icon:Icon,label,value,tone}:{icon:React.ComponentType<{size?:number}>;label:string;value:string;tone:string}){return <div className="flex items-center gap-3 rounded-xl border border-[#203047] bg-[#0b1726]/70 p-3"><div className={`rounded-lg p-2 ${toneClass[tone]}`}><Icon size={16}/></div><div><div className="text-[10px] text-slate-400">{label}</div><div className="text-sm font-semibold">{value}</div></div></div>}
function Empty({text='Belum ada data untuk periode ini.'}:{text?:string}){return <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-[#2a3b53] text-center text-xs text-slate-500">{text}</div>}
function Chart({title,children}:{title:string;children:React.ReactNode}){return <div className="card h-full p-4"><h3 className="mb-4 text-sm font-semibold">{title}</h3>{children}</div>}

export function Insights(){
  const {rows,kpis,labaRugi,monthly}=useDashboardData();
  if(!rows.length)return <div className="card p-5"><div className="flex items-center gap-2"><div className="rounded-lg bg-blue-500/10 p-2 text-blue-400"><Bot size={17}/></div><div><h3 className="text-sm font-semibold">Analisa Otomatis</h3><p className="text-[10px] text-slate-500">Insight berdasarkan laporan periode terpilih</p></div></div><div className="mt-4 rounded-lg border border-dashed border-[#2a3b53] p-5 text-center text-xs text-slate-400">Belum ada data yang cukup. Upload Neraca dan/atau Laba Rugi.</div></div>;
  const margin=labaRugi.netMargin;const debtAsset=kpis.asset?kpis.liability/kpis.asset*100:0;const last=monthly.at(-1),prev=monthly.at(-2);const revenueGrowth=last&&prev&&prev.income?delta(last.income,prev.income):0;
  const cards=[['Kinerja Pendapatan',`${revenueGrowth>=0?'Pendapatan meningkat':'Pendapatan menurun'} ${Math.abs(revenueGrowth).toLocaleString('id-ID',{maximumFractionDigits:1})}% dibanding periode lalu.`,TrendingUp,'emerald'],['Kas & Bank',`Posisi kas saat ini ${rupiah(kpis.cash)}.`,Wallet,'blue'],['HPP Terkendali',`Rasio HPP terhadap pendapatan ${labaRugi.totalRevenue?pct(labaRugi.totalHpp/labaRugi.totalRevenue*100):'N/A'}.`,ShoppingCart,'amber'],['Efisiensi & Risiko',`Margin laba bersih ${pct(margin)} dan debt-to-asset ${pct(debtAsset)}.`,Target,'violet']] as const;
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{cards.map(([title,text,Icon,tone])=><div key={title} className="card flex items-center gap-3 p-4"><div className={`rounded-full p-3 ${toneClass[tone]}`}><Icon size={18}/></div><div><div className="text-xs font-semibold">{title}</div><div className="mt-1 text-[10px] leading-5 text-slate-400">{text}</div></div></div>)}</div>;
}
