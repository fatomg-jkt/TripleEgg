'use client';
import {useMemo,useState} from 'react';
import {applyFilters,monthNames,useFinancial} from '@/lib/financial-store';
import type {DashboardFilters,FinancialTransaction} from '@/lib/schema';
import {calculateCashFlow,calculateLabaRugi,calculateNeraca,transactionBalance,transactionTotal} from '@/lib/financial-report-data';

const money=(n:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const balance=transactionBalance;
const total=transactionTotal;
const clean=(s:string)=>s?.trim()||'Lain-lain';
const sortRows=(rows:FinancialTransaction[])=>[...rows].sort((a,b)=>(a.account_code||'').localeCompare(b.account_code||'',undefined,{numeric:true}));

function AccountRows({rows}:{rows:FinancialTransaction[]}){
  return <>{sortRows(rows).map(r=><div key={r.id} className="grid grid-cols-[90px,minmax(0,1fr),150px] items-center gap-3 border-b border-[#203047]/60 px-4 py-2.5 text-xs last:border-0 md:grid-cols-[120px,minmax(0,1fr),190px]"><span className="font-mono text-[11px] text-slate-500">{r.account_code||'-'}</span><span className="truncate text-slate-200">{r.account_name}</span><span className="text-right font-medium tabular-nums text-slate-100">{money(balance(r))}</span></div>)}</>;
}

function StatementSection({title,rows,totalLabel=title,emptyText='Belum ada akun pada bagian ini.'}:{title:string;rows:FinancialTransaction[];totalLabel?:string;emptyText?:string}){
  const groups=Array.from(new Set(rows.map(r=>clean(r.report_category||r.description))));
  return <section className="overflow-hidden rounded-xl border border-[#203047] bg-[#0b1726] shadow-sm">
    <div className="flex items-center justify-between bg-[#101e30] px-4 py-3.5"><h3 className="text-sm font-bold uppercase tracking-[.08em] text-slate-100">{title}</h3><span className="text-sm font-bold tabular-nums">{money(total(rows))}</span></div>
    {rows.length?groups.map(group=>{const items=rows.filter(r=>clean(r.report_category||r.description)===group);return <div key={group}><div className="flex items-center justify-between border-y border-[#203047] bg-[#0d1928] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><span>{group}</span><span className="tabular-nums text-slate-300">{money(total(items))}</span></div><AccountRows rows={items}/></div>}):<div className="grid grid-cols-[1fr,180px] items-center border-y border-[#203047] bg-[#0d1928] px-4 py-3 text-xs text-slate-500"><span>{emptyText}</span><span className="text-right font-medium tabular-nums text-slate-300">{money(0)}</span></div>}
    <div className="flex items-center justify-between border-t border-[#2a3b53] bg-[#111f31] px-4 py-3 text-sm font-bold"><span>{totalLabel}</span><span className="tabular-nums">{money(total(rows))}</span></div>
  </section>;
}

export function NeracaReport(){
  const {transactions,filters}=useFinancial();
  const rows=useMemo(()=>applyFilters(transactions,filters).filter(r=>r.statement_type==='balance-sheet'),[transactions,filters]);
  const statement=calculateNeraca(rows);
  const {assets,liabilities,equity}=statement;
  const cash=rows.filter(r=>r.account_type==='cash');
  const receivable=rows.filter(r=>r.account_type==='receivable');
  const inventory=rows.filter(r=>r.account_type==='inventory');
  const payable=rows.filter(r=>r.account_type==='payable');
  const aset=statement.totalAssets,liab=statement.totalLiabilities,eq=statement.totalEquity,pasiva=statement.liabilitiesAndEquity,difference=statement.difference;
  const balanced=statement.balanced;
  const hasData=rows.length>0;
  return <div className="space-y-5">
    {!hasData&&<NoDataNotice report="Neraca"/>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Summary label="Total Aset" value={aset}/><Summary label="Total Liabilitas" value={liab}/><Summary label="Total Ekuitas" value={eq}/><Summary label="Status Neraca" value={difference} note={balanced?'Balance':'Perlu rekonsiliasi'} statusOnly/></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MiniMetric label="Kas & Bank" value={total(cash)}/><MiniMetric label="Piutang" value={total(receivable)}/><MiniMetric label="Persediaan" value={total(inventory)}/><MiniMetric label="Hutang Usaha" value={total(payable)}/></div>
    <div className="rounded-xl border border-[#203047] bg-[#0a1522] p-4 md:p-5"><div className="mb-4 flex flex-col justify-between gap-2 border-b border-[#203047] pb-4 md:flex-row md:items-end"><div><h2 className="text-base font-bold">Laporan Posisi Keuangan</h2><p className="mt-1 text-xs text-slate-500">Aset dibandingkan dengan Liabilitas dan Ekuitas untuk periode terpilih.</p></div><div className={`rounded-full px-3 py-1 text-[11px] font-semibold ${balanced?'bg-emerald-500/10 text-emerald-400':'bg-amber-500/10 text-amber-300'}`}>{balanced?'Neraca Balance':`Selisih ${money(difference)}`}</div></div><div className="grid gap-4 xl:grid-cols-2"><StatementSection title="Aset" rows={assets} totalLabel="TOTAL ASET" emptyText="Belum ada akun Aset yang diupload."/><div className="space-y-4"><StatementSection title="Liabilitas" rows={liabilities} totalLabel="TOTAL LIABILITAS" emptyText="Belum ada akun Liabilitas yang diupload."/><StatementSection title="Ekuitas" rows={equity} totalLabel="TOTAL EKUITAS" emptyText="Belum ada akun Ekuitas yang diupload."/><div className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-4 text-sm font-bold text-blue-100"><span>TOTAL LIABILITAS & EKUITAS</span><span className="tabular-nums">{money(pasiva)}</span></div></div></div></div>
  </div>;
}

export function LabaRugiReport(){
  const {transactions,filters}=useFinancial();
  const availableYears=Array.from(new Set(transactions.map(row=>row.year))).sort((a,b)=>b-a),initialYear=filters.year==='all'?(availableYears[0]||new Date().getFullYear()):Number(filters.year);
  const [mode,setMode]=useState<'single'|'quarterly'>('single'),[year,setYear]=useState(initialYear),[quarter,setQuarter]=useState<1|2|3|4>((filters.month==='all'?1:Math.ceil(Number(filters.month)/3)) as 1|2|3|4);
  const controls=<div className="no-print card flex flex-wrap gap-3 p-4"><label><span className="label">Mode Laporan</span><select className="field mt-1 block" value={mode} onChange={event=>setMode(event.target.value as 'single'|'quarterly')}><option value="single">Periode Tunggal</option><option value="quarterly">Quarterly</option></select></label>{mode==='quarterly'&&<><label><span className="label">Tahun</span><select className="field mt-1 block" value={year} onChange={event=>setYear(Number(event.target.value))}>{(availableYears.length?availableYears:[year]).map(value=><option key={value}>{value}</option>)}</select></label><label><span className="label">Quarter</span><select className="field mt-1 block" value={quarter} onChange={event=>setQuarter(Number(event.target.value) as 1|2|3|4)}>{[1,2,3,4].map(value=><option key={value} value={value}>Q{value}</option>)}</select></label></>}</div>;
  const rows=useMemo(()=>applyFilters(transactions,filters).filter(r=>r.statement_type==='income-statement'),[transactions,filters]);
  const statement=calculateLabaRugi(rows);
  const {revenue,hpp,operating,nonOperating}=statement;
  const pendapatan=statement.totalRevenue,totalHpp=statement.totalHpp,gross=statement.grossProfit,operatingExpense=statement.operatingExpense,otherExpense=statement.otherExpense,totalExpense=statement.totalExpense,net=statement.netProfit;
  const grossMargin=statement.grossMargin,netMargin=statement.netMargin;
  const hasData=rows.length>0;
  if(mode==='quarterly')return <><div className="print-quarter-title">Q{quarter} {year}</div>{controls}<QuarterlyLabaRugi transactions={transactions} filters={filters} year={year} quarter={quarter}/></>;
  return <div className="space-y-5">
    {controls}{!hasData&&<NoDataNotice report="Laba Rugi"/>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Summary label="Pendapatan" value={pendapatan}/><Summary label="HPP" value={totalHpp}/><Summary label="Laba Kotor" value={gross}/><Summary label="Total Beban" value={totalExpense}/><Summary label="Laba Bersih" value={net}/></div>
    <div className="grid gap-3 sm:grid-cols-2"><MiniMetric label="Gross Margin" value={grossMargin} percentage/><MiniMetric label="Net Profit Margin" value={netMargin} percentage/></div>
    <div className="mx-auto max-w-6xl overflow-hidden rounded-xl border border-[#203047] bg-[#0a1522]"><div className="border-b border-[#203047] bg-[#101e30] px-5 py-4"><h2 className="text-base font-bold">Laporan Laba Rugi</h2><p className="mt-1 text-xs text-slate-500">Pendapatan dikurangi HPP dan seluruh beban untuk menghasilkan laba bersih.</p></div><IncomeSection label="PENDAPATAN" rows={revenue} subtotal="TOTAL PENDAPATAN" emptyText="Belum ada akun Pendapatan yang diupload."/><IncomeSection label="HARGA POKOK PENJUALAN (HPP)" rows={hpp} subtotal="TOTAL HPP" emptyText="Belum ada akun HPP yang diupload."/><HighlightLine label="LABA KOTOR" value={gross}/><IncomeSection label="BEBAN OPERASIONAL" rows={operating} subtotal="TOTAL BEBAN OPERASIONAL" emptyText="Belum ada akun Beban Operasional yang diupload."/><IncomeSection label="BEBAN LAIN-LAIN" rows={nonOperating} subtotal="TOTAL BEBAN LAIN-LAIN" emptyText="Belum ada akun Beban Lain-lain yang diupload."/><ReportLine label="TOTAL BEBAN" value={totalExpense} strong/><HighlightLine label="LABA BERSIH" value={net} primary/></div>
  </div>;
}


type QuarterMetric={code:string;name:string;values:[number,number,number]};
function quarterAccounts(sources:FinancialTransaction[][]):QuarterMetric[]{const map=new Map<string,QuarterMetric>();sources.forEach((source,index)=>source.forEach(row=>{const key=`${row.account_code}|${row.account_name}`,item=map.get(key)||{code:row.account_code,name:row.account_name,values:[0,0,0]};item.values[index]+=balance(row);map.set(key,item)}));return Array.from(map.values()).sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true}))}
function QuarterSection({label,accounts,totals,totalLabel}:{label:string;accounts:QuarterMetric[];totals:number[];totalLabel:string}){return <><tr className="bg-[#101e30]"><th colSpan={5} className="text-sm font-bold text-slate-100">{label}</th></tr>{accounts.length?accounts.map(account=><tr key={`${account.code}|${account.name}`}><td><span className="font-mono text-slate-500">{account.code}</span><span className="ml-3 text-slate-200">{account.name}</span></td>{account.values.map((value,index)=><td key={index} className="text-right tabular-nums">{money(value)}</td>)}<td className="text-right font-semibold tabular-nums">{money(account.values.reduce((sum,value)=>sum+value,0))}</td></tr>):<tr><td colSpan={5} className="text-slate-500">Belum ada data pada bagian ini.</td></tr>}<tr className="bg-[#111f31] font-bold"><td>{totalLabel}</td>{totals.map((value,index)=><td key={index} className="text-right tabular-nums">{money(value)}</td>)}<td className="text-right tabular-nums">{money(totals.reduce((sum,value)=>sum+value,0))}</td></tr></>}
function QuarterlyLabaRugi({transactions,filters,year,quarter}:{transactions:FinancialTransaction[];filters:DashboardFilters;year:number;quarter:1|2|3|4}){const months=[(quarter-1)*3+1,(quarter-1)*3+2,(quarter-1)*3+3],statements=months.map(month=>calculateLabaRugi(applyFilters(transactions,{...filters,period:'all',month:String(month),year:String(year)}).filter(row=>row.statement_type==='income-statement'))),values=(key:'grossProfit'|'totalExpense'|'netProfit')=>statements.map(statement=>statement[key]);const highlight=(label:string,totals:number[],primary=false)=><tr className={`${primary?'bg-blue-500/15':'bg-emerald-500/10'} font-bold`}><td>{label}</td>{totals.map((value,index)=><td key={index} className="text-right tabular-nums">{money(value)}</td>)}<td className="text-right tabular-nums">{money(totals.reduce((sum,value)=>sum+value,0))}</td></tr>;return <div className="space-y-4"><div className="text-center"><h2 className="text-lg font-bold">LAPORAN LABA RUGI</h2><p className="text-xs text-slate-400">Q{quarter} {year}</p></div><div className="card overflow-x-auto"><table className="quarter-table"><thead><tr><th>Akun</th>{months.map(month=><th className="text-right" key={month}>{monthNames[month-1].slice(0,3).toUpperCase()} {year}</th>)}<th className="text-right">TOTAL Q{quarter}</th></tr></thead><tbody><QuarterSection label="PENDAPATAN" accounts={quarterAccounts(statements.map(statement=>statement.revenue))} totals={statements.map(statement=>statement.totalRevenue)} totalLabel="TOTAL PENDAPATAN"/><QuarterSection label="HARGA POKOK PENJUALAN (HPP)" accounts={quarterAccounts(statements.map(statement=>statement.hpp))} totals={statements.map(statement=>statement.totalHpp)} totalLabel="TOTAL HPP"/>{highlight('LABA KOTOR',values('grossProfit'))}<QuarterSection label="BEBAN OPERASIONAL" accounts={quarterAccounts(statements.map(statement=>statement.operating))} totals={statements.map(statement=>statement.operatingExpense)} totalLabel="TOTAL BEBAN OPERASIONAL"/><QuarterSection label="BEBAN LAIN-LAIN" accounts={quarterAccounts(statements.map(statement=>statement.nonOperating))} totals={statements.map(statement=>statement.otherExpense)} totalLabel="TOTAL BEBAN LAIN-LAIN"/>{highlight('TOTAL BEBAN',values('totalExpense'))}{highlight('LABA BERSIH',values('netProfit'),true)}</tbody></table></div></div>}

export function CashFlowReport(){
  const {transactions,filters}=useFinancial();
  const rows=useMemo(()=>applyFilters(transactions,filters).filter(r=>r.statement_type==='cash-flow'),[transactions,filters]);
  const statement=calculateCashFlow(rows);
  const {operating,investing,financing}=statement,unclassified=statement.other;
  const op=statement.operatingTotal,inv=statement.investingTotal,fin=statement.financingTotal,other=statement.otherTotal,net=statement.netChange;
  const hasData=rows.length>0;
  return <div className="space-y-5">
    {!hasData&&<NoDataNotice report="Arus Kas"/>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Summary label="Arus Kas Operasi" value={op}/><Summary label="Arus Kas Investasi" value={inv}/><Summary label="Arus Kas Pendanaan" value={fin}/><Summary label="Kenaikan / Penurunan Bersih" value={net}/></div>
    <div className="mx-auto max-w-6xl overflow-hidden rounded-xl border border-[#203047] bg-[#0a1522]">
      <div className="border-b border-[#203047] bg-[#101e30] px-5 py-4"><h2 className="text-base font-bold">Laporan Arus Kas</h2><p className="mt-1 text-xs text-slate-500">Arus kas masuk dan keluar dikelompokkan menurut aktivitas operasi, investasi, dan pendanaan.</p></div>
      <CashFlowSection label="ARUS KAS DARI AKTIVITAS OPERASI" rows={operating} subtotal="ARUS KAS BERSIH DARI AKTIVITAS OPERASI" emptyText="Belum ada arus kas aktivitas operasi."/>
      <CashFlowSection label="ARUS KAS DARI AKTIVITAS INVESTASI" rows={investing} subtotal="ARUS KAS BERSIH DARI AKTIVITAS INVESTASI" emptyText="Belum ada arus kas aktivitas investasi."/>
      <CashFlowSection label="ARUS KAS DARI AKTIVITAS PENDANAAN" rows={financing} subtotal="ARUS KAS BERSIH DARI AKTIVITAS PENDANAAN" emptyText="Belum ada arus kas aktivitas pendanaan."/>
      {unclassified.length>0&&<CashFlowSection label="AKTIVITAS LAINNYA" rows={unclassified} subtotal="ARUS KAS BERSIH AKTIVITAS LAINNYA"/>}
      <ReportLine label="SALDO KAS AWAL PERIODE" value={0} strong/>
      <HighlightLine label="KENAIKAN / (PENURUNAN) BERSIH KAS" value={net}/>
      <HighlightLine label="SALDO KAS AKHIR PERIODE" value={net} primary/>
    </div>
  </div>;
}

function CashFlowSection({label,rows,subtotal,emptyText}:{label:string;rows:FinancialTransaction[];subtotal:string;emptyText?:string}){return <section><ReportLine label={label} value={total(rows)} strong/>{rows.length?<>{rows.map(r=><div key={r.id} className="grid grid-cols-[110px,minmax(0,1fr),160px] items-center gap-3 border-t border-[#203047]/60 px-5 py-2.5 text-xs"><span className="text-slate-500">{r.transaction_date}</span><span className="text-slate-200">{r.account_name}</span><span className="text-right font-medium tabular-nums text-slate-100">{money(balance(r))}</span></div>)}</>:<Hint text={emptyText||'Belum ada data.'}/>}<ReportLine label={subtotal} value={total(rows)} strong/></section>}
function IncomeSection({label,rows,subtotal,emptyText}:{label:string;rows:FinancialTransaction[];subtotal:string;emptyText?:string}){return <section><ReportLine label={label} value={total(rows)} strong/>{rows.length?<AccountRows rows={rows}/>:<Hint text={emptyText||'Belum ada data.'}/>}<ReportLine label={subtotal} value={total(rows)} strong/></section>}
function Summary({label,value,note,statusOnly=false}:{label:string;value:number;note?:string;statusOnly?:boolean}){return <div className="card p-4"><div className="label">{label}</div>{statusOnly?<div className={`mt-3 text-base font-bold ${note==='Balance'?'text-emerald-400':'text-amber-300'}`}>{note}</div>:<div className="mt-2 text-lg font-bold tabular-nums">{money(value)}</div>}{note&&!statusOnly&&<div className="mt-1 text-[10px] text-slate-500">{note}</div>}</div>}
function MiniMetric({label,value,percentage=false}:{label:string;value:number;percentage?:boolean}){return <div className="rounded-xl border border-[#203047] bg-[#0b1726] px-4 py-3"><div className="text-[10px] font-semibold uppercase tracking-[.08em] text-slate-500">{label}</div><div className="mt-1 text-sm font-bold tabular-nums text-slate-100">{percentage?`${value.toFixed(1)}%`:money(value)}</div></div>}
function ReportLine({label,value,strong=false}:{label:string;value:number;strong?:boolean}){return <div className={`flex items-center justify-between border-t border-[#203047] bg-[#0d1928] px-5 py-3 text-sm ${strong?'font-bold text-slate-100':'text-slate-300'}`}><span>{label}</span><span className="tabular-nums">{money(value)}</span></div>}
function HighlightLine({label,value,primary=false}:{label:string;value:number;primary?:boolean}){return <div className={`flex items-center justify-between border-y px-5 py-4 text-base font-bold ${primary?'border-blue-500/40 bg-blue-500/15 text-blue-100':'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'}`}><span>{label}</span><span className="tabular-nums">{money(value)}</span></div>}
function Hint({text}:{text:string}){return <div className="border-t border-[#203047] px-5 py-3 text-xs text-slate-500">{text}</div>}
function NoDataNotice({report}:{report:string}){return <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-slate-400"><span className="font-semibold text-slate-200">Belum ada data {report}.</span> Template laporan tetap ditampilkan dengan nilai Rp 0. Upload file {report} untuk mengisi angka sebenarnya.</div>}
