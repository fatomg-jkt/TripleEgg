'use client';

import * as XLSX from 'xlsx';

export type ExcelCell=string|number|boolean|Date|null|undefined;
export type ExcelColumn={header:string;key:string;width?:number;format?:string};

const safePart=(value:string)=>value.normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);

export function excelFilename(title:string,period?:string,company?:string){
  return [safePart(title)||'Export',period&&period!=='all'?safePart(period):'',company&&company!=='all'?safePart(company):''].filter(Boolean).join('_')+'.xlsx';
}

export function downloadExcel(columns:ExcelColumn[],rows:Record<string,ExcelCell>[],filename:string,sheetName='Data'){
  const data=[columns.map(column=>column.header),...rows.map(row=>columns.map(column=>row[column.key]??''))];
  const worksheet=XLSX.utils.aoa_to_sheet(data,{cellDates:true});
  worksheet['!cols']=columns.map(column=>({wch:column.width??Math.max(12,column.header.length+2)}));
  worksheet['!autofilter']={ref:XLSX.utils.encode_range({r:0,c:0},{r:Math.max(rows.length,1),c:columns.length-1})};
  columns.forEach((column,index)=>{
    if(!column.format)return;
    for(let row=1;row<=rows.length;row++){
      const cell=worksheet[XLSX.utils.encode_cell({r:row,c:index})];
      if(cell)cell.z=column.format;
    }
  });
  const workbook=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook,worksheet,safePart(sheetName).slice(0,31)||'Data');
  XLSX.writeFile(workbook,filename,{compression:true,cellStyles:true});
}
