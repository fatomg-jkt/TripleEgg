import * as XLSX from 'xlsx';
import type {AccountType,RestaurantSlug,StatementType} from './schema';

export type AccurateSummaryKind='opening'|'closing';
export type AccurateParsedRow={name:string;category:string;accountType:AccountType;amount:number;depth:number;summaryKind?:AccurateSummaryKind};
export type AccurateCashFlowSummary={opening?:number;closing?:number;netChange?:number;operating?:number;investing?:number;financing?:number};
export type AccurateImportResult={statementType:StatementType;reportName:string;company:string;month:number;year:number;period:string;reportDate:Date;restaurantSlug?:RestaurantSlug;rows:AccurateParsedRow[];sourceRowCount:number;cashFlowSummary?:AccurateCashFlowSummary};

type GridRow=unknown[];type TreeRow={name:string;rawName:string;depth:number;amount:number|null};
const monthMap:Record<string,number>={jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};
const text=(value:unknown)=>String(value??'').trim();
const numeric=(value:unknown):number|null=>{if(value===null||value===undefined||value==='')return null;if(typeof value==='number'&&Number.isFinite(value))return value;const parsed=Number(String(value).replace(/[^0-9.-]/g,''));return Number.isFinite(parsed)?parsed:null};
const normalized=(value:string)=>value.toLowerCase().replace(/\s+/g,' ').trim();
const exactAncestor=(parents:string[],value:string)=>parents.some(parent=>normalized(parent)===value);

function detectStatement(report:string):StatementType|null{const value=normalized(report);if(value.includes('balance sheet'))return'balance-sheet';if(value.includes('profit/loss')||value.includes('profit or loss'))return'income-statement';if(value.includes('cash flow'))return'cash-flow';return null}
function periodFrom(textValue:string){const matches=[...textValue.matchAll(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})\b/gi)];const last=matches[matches.length-1];if(!last)return null;const month=monthMap[last[1].toLowerCase()],year=Number(last[2]);const dayMatches=[...textValue.matchAll(/\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})\b/gi)];const lastDay=dayMatches[dayMatches.length-1],day=lastDay?Number(lastDay[1]):1;return{month,year,day,period:`${year}-${String(month).padStart(2,'0')}`}}
function restaurantFromCompany(company:string):RestaurantSlug|undefined{const value=normalized(company);if(value.includes('triple egg'))return'triple-egg';if(value.includes('wok this way'))return'wok-this-way';return undefined}
function categoryFromParents(parents:string[],fallback:string){const generic=/^(assets?|current assets?|fixed assets?|other assets?|liabilities and equities|liabilities|current liabilities|long term liabilities|equities|revenue|cost of goods sold|operating expenses|other income and expenses)$/i;const useful=[...parents].reverse().find(parent=>parent&&!generic.test(parent.trim()));return useful||fallback}
function classifyBalance(name:string,parents:string[]):AccountType{
  const n=normalized(name);
  const inEquity=exactAncestor(parents,'equities');
  const inLiability=exactAncestor(parents,'liabilities')||exactAncestor(parents,'current liabilities')||exactAncestor(parents,'long term liabilities')||exactAncestor(parents,'other current liabilities');
  const inAssets=exactAncestor(parents,'assets')||exactAncestor(parents,'current assets')||exactAncestor(parents,'fixed assets')||exactAncestor(parents,'other assets');
  if(inEquity)return'equity';
  if(inLiability){if(exactAncestor(parents,'account payable')||/\b(?:u|h)utang usaha\b|account payable/.test(n))return'payable';return'liability'}
  if(inAssets){if(exactAncestor(parents,'cash and bank')||/\bkas\b|\bbank\b|cash/.test(n))return'cash';if(exactAncestor(parents,'inventory')||/persediaan|inventory/.test(n))return'inventory';if(exactAncestor(parents,'account receivables')||/piutang|receivable/.test(n))return'receivable';return'asset'}
  if(/equity|ekuitas|modal|laba ditahan|current earnings|dividen/.test(n))return'equity';
  if(/\b(?:u|h)utang usaha\b|account payable/.test(n))return'payable';
  if(/kewajiban|liabilit|\bhutang\b|\butang\b/.test(n))return'liability';
  if(/\bkas\b|\bbank\b|cash/.test(n))return'cash';if(/persediaan|inventory/.test(n))return'inventory';if(/piutang|receivable/.test(n))return'receivable';return'asset'
}
function classifyIncome(name:string,parents:string[]):AccountType{const n=normalized(name);if(exactAncestor(parents,'other expenses')||exactAncestor(parents,'cost of goods sold')||exactAncestor(parents,'operating expenses'))return'expense';if(exactAncestor(parents,'other income')||exactAncestor(parents,'revenue'))return'revenue';return /pendapatan|revenue|income|sales|penjualan/.test(n)?'revenue':'expense'}
function isCalculatedCashFlowLine(name:string){const value=normalized(name);return value.startsWith('total ')||value.startsWith('net cash provided')||value.startsWith('operating profit(loss) before')||value==='decrease(increase) in operating assets'||value==='increase(decrease) in operating liabilities'||value.startsWith('cash & cash equivalent on ')}

export function parseAccurateWorkbook(workbook:XLSX.WorkBook):AccurateImportResult|null{
  const sheet=workbook.Sheets[workbook.SheetNames[0]];if(!sheet)return null;
  const grid=XLSX.utils.sheet_to_json<GridRow>(sheet,{header:1,raw:true,defval:null,blankrows:false});const firstLines=grid.slice(0,10).flat().map(text).filter(Boolean);const reportName=firstLines.find(value=>detectStatement(value))||'',statementType=detectStatement(reportName);if(!statementType)return null;
  const company=text(grid[0]?.[1])||firstLines[0]||'Accurate',periodLine=firstLines.find(value=>/as of date|from .*until|from period/i.test(value))||'',parsedPeriod=periodFrom(periodLine);if(!parsedPeriod)return null;
  const headerIndex=grid.findIndex(row=>row.some(cell=>normalized(text(cell))==='description'));if(headerIndex<0)return null;const header=grid[headerIndex],descriptionCol=header.findIndex(cell=>normalized(text(cell))==='description');let amountCol=-1;for(let col=descriptionCol+1;col<header.length;col++){if(text(header[col])){amountCol=col;break}}if(amountCol<0)amountCol=descriptionCol+2;
  const treeRows:TreeRow[]=grid.slice(headerIndex+1).map(row=>{const rawName=String(row[descriptionCol]??''),leading=rawName.length-rawName.replace(/^\s+/,'').length;return{rawName,name:rawName.trim(),depth:Math.max(0,Math.floor(leading/4)),amount:numeric(row[amountCol])}}).filter(row=>row.name);
  const rows:AccurateParsedRow[]=[],stack:string[]=[];let cashFlowSection='Operating';const cashFlowSummary:AccurateCashFlowSummary={};
  for(let index=0;index<treeRows.length;index++){
    const row=treeRows[index];while(stack.length>row.depth)stack.pop();const parents=[...stack],lower=normalized(row.name),hasChild=index+1<treeRows.length&&treeRows[index+1].depth>row.depth;
    if(statementType==='cash-flow'){
      if(/operational activity|operating activities/.test(lower))cashFlowSection='Operating';else if(/investing activit/.test(lower))cashFlowSection='Investing';else if(/financing activit/.test(lower))cashFlowSection='Financing';
      if(row.amount!==null){if(lower.startsWith('total net cash (used in)/provided by operating'))cashFlowSummary.operating=row.amount;else if(lower.startsWith('total net cash provided by/(used in) investing'))cashFlowSummary.investing=row.amount;else if(lower.startsWith('total net cash provided by/(used in) financing'))cashFlowSummary.financing=row.amount;else if(lower.startsWith('net cash provided by/(used in) in this period'))cashFlowSummary.netChange=row.amount;else if(lower.includes('cash & cash equivalent on opening period'))cashFlowSummary.opening=row.amount;else if(lower.includes('cash & cash equivalent on end period'))cashFlowSummary.closing=row.amount}
      if(row.amount!==null&&!hasChild&&!isCalculatedCashFlowLine(row.name))rows.push({name:row.name,category:cashFlowSection,accountType:'cash',amount:row.amount,depth:row.depth});
    }else if(row.amount!==null&&!hasChild&&!lower.startsWith('total ')&&!['gross profit','operating revenue','net profit/loss','total assets','total liabilities and equities'].includes(lower)){
      const accountType=statementType==='balance-sheet'?classifyBalance(row.name,parents):classifyIncome(row.name,parents);rows.push({name:row.name,category:categoryFromParents(parents,row.name),accountType,amount:row.amount,depth:row.depth});
    }
    if(!lower.startsWith('total ')){stack[row.depth]=row.name;stack.length=row.depth+1}
  }
  if(statementType==='cash-flow'){if(cashFlowSummary.opening!==undefined)rows.push({name:'Cash & Cash equivalent on Opening period',category:'Cash Flow Summary',accountType:'cash',amount:cashFlowSummary.opening,depth:0,summaryKind:'opening'});if(cashFlowSummary.closing!==undefined)rows.push({name:'Cash & Cash equivalent on End period',category:'Cash Flow Summary',accountType:'cash',amount:cashFlowSummary.closing,depth:0,summaryKind:'closing'})}
  return{statementType,reportName,company,month:parsedPeriod.month,year:parsedPeriod.year,period:parsedPeriod.period,reportDate:new Date(parsedPeriod.year,parsedPeriod.month-1,parsedPeriod.day),restaurantSlug:restaurantFromCompany(company),rows,sourceRowCount:treeRows.length,cashFlowSummary:statementType==='cash-flow'?cashFlowSummary:undefined};
}
