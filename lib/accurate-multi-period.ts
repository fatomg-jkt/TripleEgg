import * as XLSX from 'xlsx';
import type {AccountType,RestaurantSlug,StatementType} from './schema';

export type AccurateMultiPeriodRow={name:string;category:string;accountType:AccountType;amount:number;depth:number};
export type AccurateMultiPeriodSlice={month:number;year:number;period:string;label:string;reportDate:Date;rows:AccurateMultiPeriodRow[]};
export type AccurateMultiPeriodResult={statementType:StatementType;reportName:string;company:string;restaurantSlug?:RestaurantSlug;periods:AccurateMultiPeriodSlice[];sourceRowCount:number};

type PeriodColumn={column:number;month:number;year:number;label:string;reportDate:Date};
type TreeRow={name:string;depth:number;values:(number|null)[]};
const monthNames=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const monthMap:Record<string,number>={jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};
const text=(value:unknown)=>String(value??'').trim();
const norm=(value:string)=>value.toLowerCase().replace(/\s+/g,' ').trim();
const ancestor=(parents:string[],value:string)=>parents.some(parent=>norm(parent)===value);

function numberValue(value:unknown):number|null{
  if(value===null||value===undefined||value==='')return null;
  if(typeof value==='number'&&Number.isFinite(value))return value;
  const raw=String(value).trim();if(!raw)return null;
  const negative=/^\(.*\)$/.test(raw);
  const cleaned=raw.replace(/[()]/g,'').replace(/[^0-9,.-]/g,'');if(!cleaned)return null;
  let canonical=cleaned;
  if(cleaned.includes(',')&&cleaned.includes('.')){
    const comma=cleaned.lastIndexOf(','),dot=cleaned.lastIndexOf('.');
    canonical=comma>dot?cleaned.replace(/\./g,'').replace(',','.'):cleaned.replace(/,/g,'');
  }else if(cleaned.includes(',')){
    const parts=cleaned.split(',');canonical=parts.length===2&&parts[1].length<=4?`${parts[0].replace(/\./g,'')}.${parts[1]}`:cleaned.replace(/,/g,'');
  }
  const parsed=Number(canonical);return Number.isFinite(parsed)?(negative?-parsed:parsed):null;
}
function detectStatement(value:string):StatementType|null{
  const report=norm(value);if(!/\bmulti(?:ple)?\s+period\b/.test(report))return null;
  if(report.includes('balance sheet'))return'balance-sheet';
  if(report.includes('profit/loss')||report.includes('profit or loss'))return'income-statement';
  if(report.includes('cash flow'))return'cash-flow';
  return null;
}
function restaurantFromCompany(company:string):RestaurantSlug|undefined{const value=norm(company);if(value.includes('triple egg'))return'triple-egg';if(value.includes('wok this way'))return'wok-this-way';return undefined}
function parseRange(value:string){const matches=Array.from(value.matchAll(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})\b/gi));if(!matches.length)return null;const first=matches[0],last=matches[matches.length-1];return{start:{month:monthMap[first[1].toLowerCase()],year:Number(first[2])},end:{month:monthMap[last[1].toLowerCase()],year:Number(last[2])}}}
function endOfMonth(year:number,month:number){return new Date(year,month,0)}
function categoryFromParents(parents:string[],fallback:string){const generic=/^(assets?|current assets?|fixed assets?|other assets?|liabilities and equities|liabilities|current liabilities|long term liabilities|equities|revenue|cost of goods sold|operating expenses|other income and expenses)$/i;return [...parents].reverse().find(parent=>parent&&!generic.test(parent.trim()))||[...parents].reverse().find(Boolean)||fallback}
function classifyBalance(name:string,parents:string[]):AccountType{const n=norm(name),all=norm([...parents,name].join(' '));if(ancestor(parents,'equities')||/equity|ekuitas|modal|laba ditahan|current earnings|dividen/.test(n))return'equity';if(ancestor(parents,'account payable')||/utang usaha|hutang usaha|account payable/.test(all))return'payable';if(ancestor(parents,'liabilities')||ancestor(parents,'current liabilities')||ancestor(parents,'long term liabilities')||ancestor(parents,'other current liabilities')||/kewajiban|liabilit|\bhutang\b|\butang\b/.test(n))return'liability';if(ancestor(parents,'cash and bank')||/\bkas\b|\bbank\b|cash/.test(n))return'cash';if(ancestor(parents,'inventory')||/persediaan|inventory/.test(all))return'inventory';if(ancestor(parents,'account receivables')||/piutang|receivable/.test(n))return'receivable';return'asset'}
function classifyIncome(name:string,parents:string[]):AccountType{const all=norm([...parents,name].join(' '));if(/cost of goods|cogs|harga pokok|hpp|operating expenses|other expenses|beban|expense/.test(all))return'expense';if(/revenue|income|pendapatan|sales|penjualan/.test(all))return'revenue';return'expense'}
function calculated(name:string,type:StatementType){const value=norm(name);if(value.startsWith('total '))return true;if(type==='income-statement'&&['gross profit','operating revenue','net profit/loss','net profit','net income','net sales'].includes(value))return true;if(type==='balance-sheet'&&['total assets','total liabilities and equities','total liabilities & equities'].includes(value))return true;return false}
function derivedSection(name:string){const value=norm(name);return value==='net sales'||value.startsWith('net sales ')}

function periodColumns(header:unknown[],range:ReturnType<typeof parseRange>,descriptionCol:number):PeriodColumn[]{
  const out:PeriodColumn[]=[];let previous=range?range.start.year*12+range.start.month-1:null;
  for(let column=descriptionCol+1;column<header.length;column++){
    const label=text(header[column]);if(!label)continue;
    const normalized=norm(label);if(normalized.startsWith('%')||normalized.includes('% net sales')||normalized.startsWith('total'))continue;
    const dated=label.match(/\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})\b/i);
    if(dated){const month=monthMap[dated[2].toLowerCase()],year=Number(dated[3]);out.push({column,month,year,label:`${monthNames[month-1]} ${year}`,reportDate:new Date(year,month-1,Number(dated[1]))});previous=year*12+month-1;continue}
    const monthly=label.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i);if(!monthly)continue;
    const month=monthMap[monthly[1].toLowerCase()];let year=range?.start.year??new Date().getFullYear();if(previous!==null){const prevYear=Math.floor(previous/12),prevMonth=previous%12+1;year=month<prevMonth?prevYear+1:prevYear}out.push({column,month,year,label:`${monthNames[month-1]} ${year}`,reportDate:endOfMonth(year,month)});previous=year*12+month-1;
  }
  return out;
}

export function parseAccurateMultiPeriodWorkbook(workbook:XLSX.WorkBook):AccurateMultiPeriodResult|null{
  const sheet=workbook.Sheets[workbook.SheetNames[0]];if(!sheet)return null;
  const grid=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,raw:true,defval:null,blankrows:false}) as unknown[][];
  const firstLines=grid.slice(0,14).flat().map(text).filter(Boolean);const reportName=firstLines.find(line=>detectStatement(line))||'',statementType=detectStatement(reportName);if(!statementType)return null;
  const company=firstLines[0]||'Accurate';const rangeLine=firstLines.find(value=>/from period/i.test(value))||'',range=parseRange(rangeLine);
  const headerIndex=grid.findIndex(row=>row.some(cell=>norm(text(cell))==='description'));if(headerIndex<0)return null;
  const header=grid[headerIndex]||[],descriptionCol=header.findIndex(cell=>norm(text(cell))==='description');if(descriptionCol<0)return null;
  const columns=periodColumns(header,range,descriptionCol);if(columns.length<2)return null;
  const treeRows:TreeRow[]=grid.slice(headerIndex+1).map(row=>{const raw=String(row[descriptionCol]??''),leading=raw.length-raw.replace(/^\s+/,'').length;return{name:raw.trim(),depth:Math.max(0,Math.floor(leading/2)),values:columns.map(item=>numberValue(row[item.column]))}}).filter(row=>row.name);
  const periodRows=columns.map(()=>[] as AccurateMultiPeriodRow[]),stack:string[]=[];let suppressBelowDepth:number|null=null;
  for(let index=0;index<treeRows.length;index++){
    const row=treeRows[index];while(stack.length>row.depth)stack.pop();if(suppressBelowDepth!==null&&row.depth<=suppressBelowDepth)suppressBelowDepth=null;
    const parents=[...stack],next=treeRows[index+1],hasChild=!!next&&next.depth>row.depth,hasValue=row.values.some(value=>value!==null),lower=norm(row.name);
    if(derivedSection(row.name)){suppressBelowDepth=row.depth;stack[row.depth]=row.name;stack.length=row.depth+1;continue}
    const underSuppressed=suppressBelowDepth!==null&&row.depth>suppressBelowDepth;
    const summary=calculated(row.name,statementType);
    if(hasValue&&!summary&&!underSuppressed){
      const accountType=statementType==='balance-sheet'?classifyBalance(row.name,parents):statementType==='income-statement'?classifyIncome(row.name,parents):'cash';
      const category=categoryFromParents(parents,row.name);
      row.values.forEach((amount,periodIndex)=>{if(amount!==null)periodRows[periodIndex].push({name:row.name,category,accountType,amount,depth:row.depth})});
      if(hasChild)suppressBelowDepth=row.depth;
    }
    if(!lower.startsWith('total ')){stack[row.depth]=row.name;stack.length=row.depth+1}
  }
  const periods=columns.map((column,index)=>({month:column.month,year:column.year,period:`${column.year}-${String(column.month).padStart(2,'0')}`,label:column.label,reportDate:column.reportDate,rows:periodRows[index]})).filter(period=>period.rows.length);
  return periods.length>=2?{statementType,reportName,company,restaurantSlug:restaurantFromCompany(company),periods,sourceRowCount:treeRows.length}:null;
}
