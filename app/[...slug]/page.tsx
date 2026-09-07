import {ClientShell} from '../client-shell';
import {ModulePage} from '@/components/page';
import {FinancialModulePage} from '@/components/financial-module-page';
import {pageMeta} from '@/lib/data';
import {BankStatements} from '@/components/bank-statements';
import {ProfitabilityDashboard,RatioDashboard,TrendDashboard} from '@/components/analytics';

const routeMeta:Record<string,[string,string,string]>={
  'budgeting/ringkasan':['Ringkasan Budget','Pantau alokasi dan realisasi anggaran','ringkasan-budget'],
  'budgeting/budget-vs-actual':['Budget vs Actual','Perbandingan anggaran dengan realisasi','budget-vs-actual'],
  'budgeting/department':['Budget per Department','Analisis budget berdasarkan department','budget-department'],
  'budgeting/account':['Budget per Biaya','Analisis budget berdasarkan biaya','budget-account'],
  'budgeting/sisa':['Sisa Budget','Pantau sisa anggaran setelah dikurangi realisasi','budget-remaining'],
  'budgeting/upload':['Upload Budget','Kelola dan proses data anggaran','upload-budget']
};

export default function Page({params}:{params:{slug:string[]}}){
  const route=params.slug.join('/');
  const last=params.slug.at(-1)||'';
  const budget=routeMeta[route];
  const [title,subtitle]=budget?.slice(0,2) as [string,string]||pageMeta[last]||[last.replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase()),'Kelola data keuangan perusahaan secara terintegrasi'];
  const moduleSlug=budget?.[2]||last;
  if(route==='documents/bank-statement') return <ClientShell><BankStatements/></ClientShell>;
  if(route==='analisa/rasio') return <ClientShell><RatioDashboard/></ClientShell>;
  if(route==='analisa/trend') return <ClientShell><TrendDashboard/></ClientShell>;
  if(route==='analisa/profitabilitas') return <ClientShell><ProfitabilityDashboard/></ClientShell>;
  if(moduleSlug==='neraca'||moduleSlug==='laba-rugi'||moduleSlug==='arus-kas') return <ClientShell><FinancialModulePage title={title} subtitle={subtitle} slug={moduleSlug}/></ClientShell>;
  return <ClientShell><ModulePage title={title} subtitle={subtitle} slug={moduleSlug}/></ClientShell>;
}