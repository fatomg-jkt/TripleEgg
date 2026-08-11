'use client';
import {useMemo} from 'react';
import {applyFilters,useFinancial} from '@/lib/financial-store';
import type {FinancialTransaction} from '@/lib/schema';

const money=(n:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const balance=(r:FinancialTransaction)=>['liability','equity','revenue','payable'].includes(r.account_type)?r.credit-r.debit:r.debit-r.credit;
const total=(rows:FinancialTransaction[])=>rows.reduce((n,r)=>n+balance(r),0);
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

  const assets=rows.filter(r=>['asset','cash','receivable','inventory'].includes(r.account_type));
  const liabilities=rows.filter(r=>['liability','payable'].includes(r.account_type));
  const equity=rows.filter(r=>r.account_type==='equity');
  const cash=rows.filter(r=>r.account_type==='cash');
  const receivable=rows.filter(r=>r.account_type==='receivable');
  const inventory=rows.filter(r=>r.account_type==='inventory');
  const payable=rows.filter(r=>r.account_type==='payable');
  const aset=total(assets),liab=total(liabilities),eq=total(equity),pasiva=liab+eq,difference=aset-pasiva;
  const balanced=Math.abs(difference)<1;
  const hasData=rows.length>0;

  return <div className="space-y-5">
    {!hasData&&<NoDataNotice report="Neraca"/>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Summary label="Total Aset" value={aset}/><Summary label="Total Liabilitas" value={liab}/><Summary label="Total Ekuitas" value={eq}/><Summary label="Status Neraca" value={difference} note={balanced?'Balance':'Perlu rekonsiliasi'} statusOnly/>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MiniMetric label="Kas & Bank" value={total(cash)}/><MiniMetric label="Piutang" value={total(receivable)}/><MiniMetric label="Persediaan" value={total(inventory)}/><MiniMetric label="Hutang Usaha" value={total(payable)}/>
    </div>
    <div className="rounded-xl border border-[#203047] bg-[#0a1522] p-4 md:p-5">
      <div className="mb-4 flex flex-col justify-between gap-2 border-b border-[#203047] pb-4 md:flex-row md:items-end"><div><h2 className="text-base font-bold">Laporan Posisi Keuangan</h2><p className="mt-1 text-xs text-slate-500">Aset dibandingkan dengan Liabilitas dan Ekuitas untuk periode terpilih.</p></div><div className={`rounded-full px-3 py-1 text-[11px] font-semibold ${balanced?'bg-emerald-500/10 text-emerald-400':'bg-amber-500/10 text-amber-300'}`}>{balanced?'Neraca Balance':`Selisih ${money(difference)}`}</div></div>
      <div className="grid gap-4 xl:grid-cols-2">
        <StatementSection title="Aset" rows={assets} totalLabel="TOTAL ASET" emptyText="Belum ada akun Aset yang diupload."/>
        <div className="space-y-4"><StatementSection title="Liabilitas" rows={liabilities} totalLabel="TOTAL LIABILITAS" emptyText="Belum ada akun Liabilitas yang diupload."/><StatementSection title="Ekuitas" rows={equity} totalLabel="TOTAL EKUITAS" emptyText="Belum ada akun Ekuitas yang diupload."/><div className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-4 text-sm font-bold text-blue-100"><span>TOTAL LIABILITAS & EKUITAS</span><span className="tabular-nums">{money(pasiva)}</span></div></div>
      </div>
    </div>
  </div>;
}

export function LabaRugiReport(){
  const {transactions,filters}=useFinancial();
  const rows=useMemo(()=>applyFilters(transactions,filters).filter(r=>r.statement_type==='income-statement'),[transactions,filters]);

  const revenue=rows.filter(r=>r.account_type==='revenue');
  const expenses=rows.filter(r=>r.account_type==='expense');
  const hpp=expenses.filter(r=>/hpp|harga pokok|cost of goods|cogs/i.test(`${r.report_category} ${r.account_name}`));
  const otherExpenses=expenses.filter(r=>!hpp.includes(r));
  const operating=otherExpenses.filter(r=>/operasional|operating|gaji|salary|sewa|rent|utilit|listrik|marketing|administrasi|admin/i.test(`${r.report_category} ${r.account_name}`));
  const nonOperating=otherExpenses.filter(r=>!operating.includes(r));
  const pendapatan=total(revenue),totalHpp=total(hpp),gross=pendapatan-totalHpp,operatingExpense=total(operating),otherExpense=total(nonOperating),totalExpense=operatingExpense+otherExpense,net=gross-totalExpense;
  const grossMargin=pendapatan?gross/pendapatan*100:0,netMargin=pendapatan?net/pendapatan*100:0;
  const hasData=rows.length>0;

  return <div className="space-y-5">
    {!hasData&&<NoDataNotice report="Laba Rugi"/>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Summary label="Pendapatan" value={pendapatan}/><Summary label="HPP" value={totalHpp}/><Summary label="Laba Kotor" value={gross}/><Summary label="Total Beban" value={totalExpense}/><Summary label="Laba Bersih" value={net}/></div>
    <div className="grid gap-3 sm:grid-cols-2"><MiniMetric label="Gross Margin" value={grossMargin} percentage/><MiniMetric label="Net Profit Margin" value={netMargin} percentage/></div>
    <div className="mx-auto max-w-6xl overflow-hidden rounded-xl border border-[#203047] bg-[#0a1522]">
      <div className="border-b border-[#203047] bg-[#101e30] px-5 py-4"><h2 className="text-base font-bold">Laporan Laba Rugi</h2><p className="mt-1 text-xs text-slate-500">Pendapatan dikurangi HPP dan seluruh beban untuk menghasilkan laba bersih.</p></div>
      <IncomeSection label="PENDAPATAN" rows={revenue} subtotal="TOTAL PENDAPATAN" emptyText="Belum ada akun Pendapatan yang diupload."/>
      <IncomeSection label="HARGA POKOK PENJUALAN (HPP)" rows={hpp} subtotal="TOTAL HPP" emptyText="Belum ada akun HPP yang diupload."/>
      <HighlightLine label="LABA KOTOR" value={gross}/>
      <IncomeSection label="BEBAN OPERASIONAL" rows={operating} subtotal="TOTAL BEBAN OPERASIONAL" emptyText="Belum ada akun Beban Operasional yang diupload."/>
      <IncomeSection label="BEBAN LAIN-LAIN" rows={nonOperating} subtotal="TOTAL BEBAN LAIN-LAIN" emptyText="Belum ada akun Beban Lain-lain yang diupload."/>
      <ReportLine label="TOTAL BEBAN" value={totalExpense} strong/>
      <HighlightLine label="LABA BERSIH" value={net} primary/>
    </div>
  </div>;
}

function IncomeSection({label,rows,subtotal,emptyText}:{label:string;rows:FinancialTransaction[];subtotal:string;emptyText?:string}){return <section><ReportLine label={label} value={total(rows)} strong/>{rows.length?<AccountRows rows={rows}/>:<Hint text={emptyText||'Belum ada data.'}/>}<ReportLine label={subtotal} value={total(rows)} strong/></section>}
function Summary({label,value,note,statusOnly=false}:{label:string;value:number;note?:string;statusOnly?:boolean}){return <div className="card p-4"><div className="label">{label}</div>{statusOnly?<div className={`mt-3 text-base font-bold ${note==='Balance'?'text-emerald-400':'text-amber-300'}`}>{note}</div>:<div className="mt-2 text-lg font-bold tabular-nums">{money(value)}</div>}{note&&!statusOnly&&<div className="mt-1 text-[10px] text-slate-500">{note}</div>}</div>}
function MiniMetric({label,value,percentage=false}:{label:string;value:number;percentage?:boolean}){return <div className="rounded-xl border border-[#203047] bg-[#0b1726] px-4 py-3"><div className="text-[10px] font-semibold uppercase tracking-[.08em] text-slate-500">{label}</div><div className="mt-1 text-sm font-bold tabular-nums text-slate-100">{percentage?`${value.toFixed(1)}%`:money(value)}</div></div>}
function ReportLine({label,value,strong=false}:{label:string;value:number;strong?:boolean}){return <div className={`flex items-center justify-between border-t border-[#203047] bg-[#0d1928] px-5 py-3 text-sm ${strong?'font-bold text-slate-100':'text-slate-300'}`}><span>{label}</span><span className="tabular-nums">{money(value)}</span></div>}
function HighlightLine({label,value,primary=false}:{label:string;value:number;primary?:boolean}){return <div className={`flex items-center justify-between border-y px-5 py-4 text-base font-bold ${primary?'border-blue-500/40 bg-blue-500/15 text-blue-100':'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'}`}><span>{label}</span><span className="tabular-nums">{money(value)}</span></div>}
function Hint({text}:{text:string}){return <div className="border-t border-[#203047] px-5 py-3 text-xs text-slate-500">{text}</div>}
function NoDataNotice({report}:{report:string}){return <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-slate-400"><span className="font-semibold text-slate-200">Belum ada data {report}.</span> Template laporan tetap ditampilkan dengan nilai Rp 0. Upload file {report} untuk mengisi angka sebenarnya.</div>}
