'use client';

import {useEffect,useMemo,useState} from 'react';
import {Check,CloudUpload,FileSpreadsheet,X} from 'lucide-react';
import * as XLSX from 'xlsx';
import {useFinancial} from '@/lib/financial-store';
import type {AccountType,FinancialTransaction,ImportRecord,StatementType} from '@/lib/schema';

const steps=['Upload File','Validate','Preview','Mapping','Confirm Import','Save Data','Success'];
type Raw=Record<string,unknown>;

const get=(row:Raw,...keys:string[])=>{
  const found=Object.keys(row).find(key=>keys.includes(key.toLowerCase().trim()));
  return found?String(row[found]??''):'';
};
const number=(value:string)=>Number(value.replace(/[^0-9.-]/g,''))||0;
const monthNames=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function statementFromModule(module:string):StatementType|''{
  const value=module.toLowerCase();
  if(value==='neraca') return 'balance-sheet';
  if(value==='laba rugi') return 'income-statement';
  return '';
}

function classify(type:StatementType,code:string,name:string,category:string):AccountType{
  const value=`${category} ${name}`.toLowerCase();
  if(type==='income-statement') return /pendapatan|revenue|income|sales|penjualan/.test(value)||code.startsWith('4')?'revenue':'expense';
  if(/kas|bank|cash/.test(value)) return 'cash';
  if(/piutang|receivable/.test(value)) return 'receivable';
  if(/persediaan|inventory/.test(value)) return 'inventory';
  if(/hutang usaha|utang usaha|account payable|payable/.test(value)) return 'payable';
  if(/liabil|kewajiban|hutang|utang|liability/.test(value)||code.startsWith('2')) return 'liability';
  if(/ekuitas|modal|equity|laba ditahan|current earnings|dividen/.test(value)||code.startsWith('3')) return 'equity';
  return 'asset';
}

function encodedAmount(type:AccountType,amount:number){
  const creditNormal=['liability','equity','revenue','payable'].includes(type);
  if(creditNormal) return amount>=0?{debit:0,credit:amount}:{debit:-amount,credit:0};
  return amount>=0?{debit:amount,credit:0}:{debit:0,credit:-amount};
}

function excelDate(value:string,fallback:Date){
  if(!value) return fallback;
  const serial=Number(value);
  if(Number.isFinite(serial)&&serial>20000&&serial<100000){
    const parsed=XLSX.SSF.parse_date_code(serial);
    if(parsed) return new Date(parsed.y,parsed.m-1,parsed.d);
  }
  const parsed=new Date(value);
  return Number.isNaN(parsed.getTime())?fallback:parsed;
}

export function UploadModal({open,onOpenChange,module}:{open:boolean;onOpenChange:(value:boolean)=>void;module:string}){
  const store=useFinancial();
  const fixedType=statementFromModule(module);
  const [step,setStep]=useState(0);
  const [selected,setSelected]=useState<File|null>(null);
  const [rows,setRows]=useState<Raw[]>([]);
  const [error,setError]=useState('');
  const [company,setCompany]=useState('PT Triple Egg');
  const [statementType,setStatementType]=useState<StatementType>(fixedType||'balance-sheet');
  const now=new Date();
  const [month,setMonth]=useState(now.getMonth()+1);
  const [year,setYear]=useState(now.getFullYear());

  useEffect(()=>{
    if(!open){
      setStep(0);
      setSelected(null);
      setRows([]);
      setError('');
      setStatementType(fixedType||'balance-sheet');
    }
  },[open,fixedType]);

  const read=async(file:File)=>{
    setSelected(file);
    setError('');
    try{
      const workbook=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
      setRows(XLSX.utils.sheet_to_json<Raw>(workbook.Sheets[workbook.SheetNames[0]],{defval:''}));
    }catch{
      setError('File tidak dapat dibaca. Pastikan format file valid.');
    }
  };

  const parsed=useMemo(()=>rows.map((row,index)=>{
    const code=get(row,'kode akun','account code','account_code');
    const name=get(row,'nama akun','account name','account_name');
    const category=get(row,'kategori','category','tipe akun','account type','account_type');
    const type=classify(statementType,code,name,category);
    const rawAmount=get(row,'saldo','actual','amount','nilai');
    const hasAmount=rawAmount!==''||get(row,'debit')!==''||get(row,'credit','kredit')!=='';
    const fallback=new Date(year,month-1,1);
    const date=excelDate(get(row,'tanggal','date','periode','period','transaction_date'),fallback);
    const fromDC={debit:number(get(row,'debit')),credit:number(get(row,'credit','kredit'))};
    const amount=number(rawAmount);
    const dc=rawAmount!==''?encodedAmount(type,amount):fromDC;
    return {index,valid:!!name&&hasAmount,code,name,category,type,date,dc};
  }),[rows,statementType,month,year]);

  const valid=parsed.filter(row=>row.valid);

  const save=()=>{
    if(!selected) return;
    const id=crypto.randomUUID();
    const createdAt=new Date().toISOString();
    const transactions:FinancialTransaction[]=valid.map((row,index)=>({
      id:`${id}-${index}`,
      transaction_date:row.date.toISOString().slice(0,10),
      account_code:row.code||`AUTO-${index+1}`,
      account_name:row.name,
      account_type:row.type,
      debit:row.dc.debit,
      credit:row.dc.credit,
      company_id:company,
      department_id:'Semua Department',
      cost_center_id:'Semua Cost Center',
      period:`${year}-${String(month).padStart(2,'0')}`,
      month,
      year,
      description:row.category,
      report_category:row.category,
      statement_type:statementType,
      source_file_id:id,
      created_at:createdAt
    }));
    const ext=selected.name.split('.').pop()?.toLowerCase() as ImportRecord['file_type'];
    const file:ImportRecord={
      id,
      file_name:selected.name,
      original_file_name:selected.name,
      file_type:ext,
      file_size:selected.size,
      module:statementType==='balance-sheet'?'Neraca':'Laba Rugi',
      company_id:company,
      period:`${year}-${String(month).padStart(2,'0')}`,
      year,
      status:'Success',
      uploaded_by:'Admin Finance',
      uploaded_at:createdAt,
      processed_at:createdAt,
      rows_imported:transactions.length,
      rows_failed:rows.length-valid.length,
      statement_type:statementType
    };
    store.importData(transactions,file);
    setStep(6);
  };

  const next=()=>{
    if(step===0&&!selected) return;
    if(step===4){
      setStep(5);
      setTimeout(save,300);
    }else{
      setStep(current=>Math.min(6,current+1));
    }
  };

  if(!open) return null;
  const label=statementType==='balance-sheet'?'Neraca':'Laba Rugi';

  return <>
    <div className="fixed inset-0 z-[70] bg-black/70" onClick={()=>onOpenChange(false)}/>
    <section role="dialog" aria-modal="true" className="fixed left-1/2 top-1/2 z-[71] max-h-[92vh] w-[94vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-[#2a3b53] bg-[#0d1928]">
      <header className="flex justify-between border-b border-[#203047] p-5">
        <div>
          <h2 className="font-bold">Upload Laporan — {label}</h2>
          <p className="mt-1 text-xs text-slate-500">Upload laporan jadi. Jurnal umum tidak diperlukan untuk mengisi dashboard.</p>
        </div>
        <button onClick={()=>onOpenChange(false)}><X size={18}/></button>
      </header>
      <div className="overflow-x-auto border-b border-[#203047] p-4">
        <div className="flex min-w-[600px]">
          {steps.map((item,index)=><div className="flex flex-1 items-center gap-1 text-[9px]" key={item}><i className={`${index<=step?'bg-blue-600':'bg-[#203047]'} flex h-6 w-6 items-center justify-center rounded-full`}>{index<step?<Check size={11}/>:index+1}</i>{item}</div>)}
        </div>
      </div>
      <div className="p-5">
        {step===0&&<>
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            {!fixedType&&<label><span className="label">Jenis Laporan</span><select className="field mt-1 w-full" value={statementType} onChange={event=>setStatementType(event.target.value as StatementType)}><option value="balance-sheet">Neraca</option><option value="income-statement">Laba Rugi</option></select></label>}
            <label className={fixedType?'md:col-span-2':''}><span className="label">Company</span><input className="field mt-1 w-full" value={company} onChange={event=>setCompany(event.target.value)}/></label>
            <label><span className="label">Bulan</span><select className="field mt-1 w-full" value={month} onChange={event=>setMonth(Number(event.target.value))}>{monthNames.map((name,index)=><option key={name} value={index+1}>{name}</option>)}</select></label>
            <label><span className="label">Tahun</span><input className="field mt-1 w-full" type="number" value={year} onChange={event=>setYear(Number(event.target.value))}/></label>
          </div>
          <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#35506e] bg-[#0a1522]">
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={event=>event.target.files?.[0]&&read(event.target.files[0])}/>
            {selected?<><FileSpreadsheet className="mb-3 text-green-500"/><b>{selected.name}</b><small className="text-slate-500">{rows.length} baris terbaca</small></>:<><CloudUpload className="mb-3 text-blue-500"/><b>Pilih XLSX, XLS, atau CSV</b><span className="mt-2 text-xs text-slate-500">Gunakan template {label} agar mapping otomatis akurat.</span></>}
          </label>
          {error&&<p className="mt-3 text-xs text-red-400">{error}</p>}
        </>}
        {step===1&&<State title="File valid" detail={`${valid.length} dari ${rows.length} baris laporan siap diimport.`}/>} 
        {step===2&&<Preview rows={valid.slice(0,5)}/>} 
        {step===3&&<State title="Mapping otomatis" detail={statementType==='balance-sheet'?'Kode Akun, Nama Akun, Kategori, dan Saldo dipetakan ke struktur Neraca.':'Kode Akun, Nama Akun, Kategori, dan Actual dipetakan ke struktur Laba Rugi.'}/>} 
        {step===4&&<State title="Konfirmasi Import" detail={`${valid.length} baris ${label} akan disimpan untuk ${company} periode ${monthNames[month-1]} ${year}.`}/>} 
        {step===5&&<State title="Menyimpan laporan" detail="Dashboard dan laporan keuangan akan dihitung ulang otomatis."/>}
        {step===6&&<State title="Import berhasil" detail={`${valid.length} baris ${label} tersimpan dan laporan telah diperbarui.`}/>} 
      </div>
      <footer className="flex justify-between border-t border-[#203047] p-4">
        <button className="btn" onClick={()=>onOpenChange(false)}>{step===6?'Tutup':'Cancel'}</button>
        {step<5&&<button className="btn btn-primary" disabled={!selected||!!error} onClick={next}>{step===4?'Confirm Import':'Lanjutkan'}</button>}
      </footer>
    </section>
  </>;
}

function State({title,detail}:{title:string;detail:string}){
  return <div className="py-12 text-center"><Check className="mx-auto mb-4 text-green-500"/><b>{title}</b><p className="mt-2 text-xs text-slate-500">{detail}</p></div>;
}

function Preview({rows}:{rows:Array<{code:string;name:string;category:string;dc:{debit:number;credit:number}}>}){
  return <div><b>Preview Data</b><div className="mt-3 overflow-x-auto rounded-lg border border-[#203047]"><table><thead><tr><th>Kode Akun</th><th>Nama Akun</th><th>Kategori</th><th>Debit</th><th>Credit</th></tr></thead><tbody>{rows.map((row,index)=><tr key={index}><td>{row.code||'-'}</td><td>{row.name}</td><td>{row.category||'-'}</td><td>{row.dc.debit.toLocaleString('id-ID')}</td><td>{row.dc.credit.toLocaleString('id-ID')}</td></tr>)}</tbody></table></div></div>;
}
