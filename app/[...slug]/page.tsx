import {ClientShell} from '../client-shell';
import {ModulePage} from '@/components/page';
import {pageMeta} from '@/lib/data';
import {RouteGuard} from '@/components/route-guard';
import {AdministrationPage} from '@/components/administration';

const routeMeta:Record<string,[string,string,string]>={
  'budgeting/ringkasan':['Ringkasan Budget','Pantau alokasi dan realisasi anggaran','ringkasan-budget'],
  'budgeting/budget-vs-actual':['Budget vs Actual','Perbandingan anggaran dengan realisasi','budget-vs-actual'],
  'budgeting/department':['Budget per Department','Analisis budget berdasarkan department','budget-department'],
  'budgeting/account':['Budget per Account','Analisis budget berdasarkan akun','budget-account'],
  'budgeting/upload':['Upload Budget','Kelola dan proses data anggaran','upload-budget']
};

export default function Page({params}:{params:{slug:string[]}}){
  const route=params.slug.join('/');
  const last=params.slug.at(-1)||'';
  const budget=routeMeta[route];
  const [title,subtitle]=budget?.slice(0,2) as [string,string]||pageMeta[last]||[last.replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase()),'Kelola data keuangan perusahaan secara terintegrasi'];
  const moduleSlug=budget?.[2]||last;
  const content=route==='administration/users'?<AdministrationPage type="users"/>:route==='administration/roles-permissions'?<AdministrationPage type="roles"/>:<ModulePage title={title} subtitle={subtitle} slug={moduleSlug}/>;
  return <ClientShell><RouteGuard>{content}</RouteGuard></ClientShell>;
}
