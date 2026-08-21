import {NextResponse} from 'next/server';
import {sessionUser} from '@/lib/auth';
import {activeRestaurantFor} from '@/lib/restaurants';
import {deleteFilteredTransactions,deleteImport,loadFinancialData,saveFinancialImport} from '@/lib/financial-repository';
import {jsonError,serverError} from '@/lib/api';
import type {BudgetRecord,DashboardFilters,FinancialTransaction,ImportRecord} from '@/lib/schema';

export const dynamic='force-dynamic';

async function context(){
  const user=await sessionUser();
  if(!user)return null;
  const restaurant=activeRestaurantFor(user);
  if(!restaurant)return null;
  return {user,restaurant};
}

export async function GET(){
  try{
    const ctx=await context();
    if(!ctx)return jsonError('Tidak terautentikasi atau restoran aktif tidak tersedia.',401);
    return NextResponse.json(await loadFinancialData(ctx.restaurant),{headers:{'cache-control':'private, no-store'}});
  }catch(error){return serverError(error,'Data keuangan tidak dapat dimuat dari database.')}
}

export async function POST(req:Request){
  try{
    const ctx=await context();
    if(!ctx)return jsonError('Tidak terautentikasi atau restoran aktif tidak tersedia.',401);
    const body=await req.json().catch(()=>null) as {kind?:'financial'|'budget';file?:ImportRecord;rows?:FinancialTransaction[]|BudgetRecord[]}|null;
    if(!body?.kind||!body.file||!Array.isArray(body.rows))return jsonError('Payload import tidak valid.',400);
    if(!body.rows.length)return jsonError('Tidak ada baris data yang dapat disimpan.',400);
    const result=await saveFinancialImport(ctx.restaurant,body.file,body.rows,body.kind);
    return NextResponse.json({ok:true,...result});
  }catch(error){return serverError(error,'Import ke database gagal. Data sebelumnya tidak diubah.')}
}

export async function DELETE(req:Request){
  try{
    const ctx=await context();
    if(!ctx)return jsonError('Tidak terautentikasi atau restoran aktif tidak tersedia.',401);
    const body=await req.json().catch(()=>null) as {fileId?:string;filters?:DashboardFilters}|null;
    if(body?.fileId){await deleteImport(ctx.restaurant,body.fileId);return NextResponse.json({ok:true})}
    if(body?.filters){await deleteFilteredTransactions(ctx.restaurant,body.filters);return NextResponse.json({ok:true})}
    return jsonError('Permintaan hapus tidak valid.',400);
  }catch(error){return serverError(error,'Data tidak dapat dihapus dari database.')}
}
