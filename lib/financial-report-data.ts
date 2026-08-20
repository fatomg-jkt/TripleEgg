import type {FinancialTransaction} from './schema';

export const transactionBalance=(row:FinancialTransaction)=>['liability','equity','revenue','payable'].includes(row.account_type)?row.credit-row.debit:row.debit-row.credit;
export const transactionTotal=(rows:FinancialTransaction[])=>rows.reduce((sum,row)=>sum+transactionBalance(row),0);
export const reportCategory=(row:FinancialTransaction)=>row.report_category?.trim()||row.description?.trim()||'Lain-lain';

export function groupedTransactions(rows:FinancialTransaction[]){
  return Array.from(new Set(rows.map(reportCategory))).map(category=>{const accounts=rows.filter(row=>reportCategory(row)===category);return {category,accounts,total:transactionTotal(accounts)}});
}

export function calculateNeraca(rows:FinancialTransaction[]){
  const assets=rows.filter(row=>['asset','cash','receivable','inventory'].includes(row.account_type));
  const liabilities=rows.filter(row=>['liability','payable'].includes(row.account_type));
  const equity=rows.filter(row=>row.account_type==='equity');
  const totalAssets=transactionTotal(assets),totalLiabilities=transactionTotal(liabilities),totalEquity=transactionTotal(equity);
  const liabilitiesAndEquity=totalLiabilities+totalEquity,difference=totalAssets-liabilitiesAndEquity;
  return {assets,liabilities,equity,assetGroups:groupedTransactions(assets),liabilityGroups:groupedTransactions(liabilities),equityGroups:groupedTransactions(equity),totalAssets,totalLiabilities,totalEquity,liabilitiesAndEquity,difference,balanced:Math.abs(difference)<1};
}

export function calculateLabaRugi(rows:FinancialTransaction[]){
  const revenue=rows.filter(row=>row.account_type==='revenue');
  const expenses=rows.filter(row=>row.account_type==='expense');
  const hpp=expenses.filter(row=>/hpp|harga pokok|cost of goods|cogs/i.test(`${row.report_category} ${row.account_name}`));
  const otherExpenses=expenses.filter(row=>!hpp.includes(row));
  const operating=otherExpenses.filter(row=>/operasional|operating|gaji|salary|sewa|rent|utilit|listrik|marketing|administrasi|admin/i.test(`${row.report_category} ${row.account_name}`));
  const nonOperating=otherExpenses.filter(row=>!operating.includes(row));
  const totalRevenue=transactionTotal(revenue),totalHpp=transactionTotal(hpp),grossProfit=totalRevenue-totalHpp;
  const operatingExpense=transactionTotal(operating),otherExpense=transactionTotal(nonOperating),totalExpense=operatingExpense+otherExpense,netProfit=grossProfit-totalExpense;
  return {revenue,hpp,operating,nonOperating,revenueGroups:groupedTransactions(revenue),hppGroups:groupedTransactions(hpp),operatingGroups:groupedTransactions(operating),nonOperatingGroups:groupedTransactions(nonOperating),totalRevenue,totalHpp,grossProfit,operatingExpense,otherExpense,totalExpense,netProfit,grossMargin:totalRevenue?grossProfit/totalRevenue*100:0,netMargin:totalRevenue?netProfit/totalRevenue*100:0};
}

export function calculateCashFlow(rows:FinancialTransaction[]){
  const category=(row:FinancialTransaction)=>`${row.report_category||row.description}`.toLowerCase();
  const operating=rows.filter(row=>/operasi|operating|operasional/.test(category(row)));
  const investing=rows.filter(row=>/investasi|investing/.test(category(row)));
  const financing=rows.filter(row=>/pendanaan|financing/.test(category(row)));
  const other=rows.filter(row=>!operating.includes(row)&&!investing.includes(row)&&!financing.includes(row));
  const operatingTotal=transactionTotal(operating),investingTotal=transactionTotal(investing),financingTotal=transactionTotal(financing),otherTotal=transactionTotal(other);
  const netChange=operatingTotal+investingTotal+financingTotal+otherTotal;
  return {operating,investing,financing,other,operatingTotal,investingTotal,financingTotal,otherTotal,openingBalance:0,netChange,closingBalance:netChange};
}
