import {database} from './db';
import type {BudgetRecord,FinancialTransaction,ImportRecord,Restaurant} from './schema';

type StoredImport=ImportRecord&{version?:number;is_active?:boolean;replaced_at?:string|null};
let ready:Promise<void>|undefined;

export function ensureFinancialSchema(){
  return ready??=(async()=>{
    const db=database();
    await db.query(`CREATE TABLE IF NOT EXISTS financial_imports (
      id uuid PRIMARY KEY,
      restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      company_id text NOT NULL,
      statement_type text NOT NULL,
      module text NOT NULL,
      period text NOT NULL,
      month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
      year integer NOT NULL,
      version integer NOT NULL DEFAULT 1,
      is_active boolean NOT NULL DEFAULT true,
      file_name text NOT NULL,
      original_file_name text NOT NULL,
      file_type text NOT NULL,
      file_size bigint NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'Success',
      uploaded_by text NOT NULL,
      uploaded_at timestamptz NOT NULL DEFAULT now(),
      processed_at timestamptz,
      rows_imported integer NOT NULL DEFAULT 0,
      rows_failed integer NOT NULL DEFAULT 0,
      replaced_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (restaurant_id, company_id, statement_type, period, version)
    )`);
    await db.query(`CREATE INDEX IF NOT EXISTS financial_imports_active_lookup_idx ON financial_imports (restaurant_id,company_id,statement_type,period) WHERE is_active=true`);
    await db.query(`CREATE INDEX IF NOT EXISTS financial_imports_restaurant_period_idx ON financial_imports (restaurant_id,year,month,is_active)`);
    await db.query(`CREATE TABLE IF NOT EXISTS financial_transactions (
      id text PRIMARY KEY, import_id uuid NOT NULL REFERENCES financial_imports(id) ON DELETE CASCADE,
      restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      transaction_date date NOT NULL, account_code text NOT NULL, account_name text NOT NULL, account_type text NOT NULL,
      debit numeric(24,4) NOT NULL DEFAULT 0, credit numeric(24,4) NOT NULL DEFAULT 0,
      company_id text NOT NULL, department_id text NOT NULL, cost_center_id text NOT NULL,
      period text NOT NULL, month integer NOT NULL, year integer NOT NULL,
      description text NOT NULL DEFAULT '', report_category text, statement_type text NOT NULL,
      source_file_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await db.query(`CREATE INDEX IF NOT EXISTS financial_transactions_report_idx ON financial_transactions (restaurant_id,statement_type,year,month,company_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS financial_transactions_import_idx ON financial_transactions (import_id)`);
    await db.query(`CREATE TABLE IF NOT EXISTS financial_budgets (
      id text PRIMARY KEY, import_id uuid NOT NULL REFERENCES financial_imports(id) ON DELETE CASCADE,
      restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      period text NOT NULL, month integer NOT NULL, year integer NOT NULL,
      company_id text NOT NULL, department_id text NOT NULL, cost_center_id text NOT NULL,
      account_code text NOT NULL, account_name text NOT NULL, category text NOT NULL,
      budget numeric(24,4) NOT NULL DEFAULT 0, source_file_id text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await db.query(`CREATE INDEX IF NOT EXISTS financial_budgets_report_idx ON financial_budgets (restaurant_id,year,month,company_id,department_id,cost_center_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS financial_budgets_import_idx ON financial_budgets (import_id)`);
  })();
}

const transactionSelect=`SELECT t.* FROM financial_transactions t JOIN financial_imports i ON i.id=t.import_id WHERE t.restaurant_id=$1 AND i.is_active=true ORDER BY t.year,t.month,t.account_name`;
const budgetSelect=`SELECT b.* FROM financial_budgets b JOIN financial_imports i ON i.id=b.import_id WHERE b.restaurant_id=$1 AND i.is_active=true ORDER BY b.year,b.month,b.account_name`;

function mapTransaction(row:Record<string,unknown>):FinancialTransaction{return {
  id:String(row.id),restaurant_id:String(row.restaurant_id),transaction_date:String(row.transaction_date).slice(0,10),account_code:String(row.account_code),account_name:String(row.account_name),account_type:row.account_type as FinancialTransaction['account_type'],debit:Number(row.debit),credit:Number(row.credit),company_id:String(row.company_id),department_id:String(row.department_id),cost_center_id:String(row.cost_center_id),period:String(row.period),month:Number(row.month),year:Number(row.year),description:String(row.description||''),report_category:row.report_category?String(row.report_category):undefined,statement_type:row.statement_type as FinancialTransaction['statement_type'],source_file_id:String(row.source_file_id),created_at:new Date(row.created_at as string).toISOString()
}}
function mapBudget(row:Record<string,unknown>):BudgetRecord{return {id:String(row.id),restaurant_id:String(row.restaurant_id),period:String(row.period),month:Number(row.month),year:Number(row.year),company_id:String(row.company_id),department_id:String(row.department_id),cost_center_id:String(row.cost_center_id),account_code:String(row.account_code),account_name:String(row.account_name),category:String(row.category),budget:Number(row.budget),source_file_id:String(row.source_file_id),created_at:new Date(row.created_at as string).toISOString()}}
function mapImport(row:Record<string,unknown>):StoredImport{return {id:String(row.id),restaurant_id:String(row.restaurant_id),file_name:String(row.file_name),original_file_name:String(row.original_file_name),file_type:row.file_type as ImportRecord['file_type'],file_size:Number(row.file_size),module:String(row.module),company_id:String(row.company_id),period:String(row.period),year:Number(row.year),status:row.status as ImportRecord['status'],uploaded_by:String(row.uploaded_by),uploaded_at:new Date(row.uploaded_at as string).toISOString(),processed_at:row.processed_at?new Date(row.processed_at as string).toISOString():undefined,rows_imported:Number(row.rows_imported),rows_failed:Number(row.rows_failed),statement_type:row.statement_type==='budget'?undefined:row.statement_type as ImportRecord['statement_type'],version:Number(row.version),is_active:Boolean(row.is_active),replaced_at:row.replaced_at?new Date(row.replaced_at as string).toISOString():null}}

export async function loadFinancialData(restaurant:Restaurant){
  await ensureFinancialSchema();
  const db=database();
  const [transactions,budgets,files]=await Promise.all([
    db.query(transactionSelect,[restaurant.id]),
    db.query(budgetSelect,[restaurant.id]),
    db.query(`SELECT * FROM financial_imports WHERE restaurant_id=$1 ORDER BY uploaded_at DESC LIMIT 200`,[restaurant.id])
  ]);
  return {transactions:transactions.rows.map(mapTransaction),budgets:budgets.rows.map(mapBudget),files:files.rows.map(mapImport)};
}

async function insertTransactionRows(client:Awaited<ReturnType<ReturnType<typeof database>['connect']>>,rows:FinancialTransaction[],importId:string,restaurantId:string){
  const chunkSize=200;
  for(let start=0;start<rows.length;start+=chunkSize){
    const chunk=rows.slice(start,start+chunkSize),values:unknown[]=[];
    const tuples=chunk.map((row,index)=>{const base=index*19;values.push(row.id,importId,restaurantId,row.transaction_date,row.account_code,row.account_name,row.account_type,row.debit,row.credit,row.company_id,row.department_id,row.cost_center_id,row.period,row.month,row.year,row.description,row.report_category||null,row.statement_type||'journal',row.source_file_id);return`(${Array.from({length:19},(_,i)=>`$${base+i+1}`).join(',')})`});
    await client.query(`INSERT INTO financial_transactions(id,import_id,restaurant_id,transaction_date,account_code,account_name,account_type,debit,credit,company_id,department_id,cost_center_id,period,month,year,description,report_category,statement_type,source_file_id) VALUES ${tuples.join(',')}`,values);
  }
}
async function insertBudgetRows(client:Awaited<ReturnType<ReturnType<typeof database>['connect']>>,rows:BudgetRecord[],importId:string,restaurantId:string){
  const chunkSize=250;
  for(let start=0;start<rows.length;start+=chunkSize){
    const chunk=rows.slice(start,start+chunkSize),values:unknown[]=[];
    const tuples=chunk.map((row,index)=>{const base=index*15;values.push(row.id,importId,restaurantId,row.period,row.month,row.year,row.company_id,row.department_id,row.cost_center_id,row.account_code,row.account_name,row.category,row.budget,row.source_file_id,row.created_at);return`(${Array.from({length:15},(_,i)=>`$${base+i+1}`).join(',')})`});
    await client.query(`INSERT INTO financial_budgets(id,import_id,restaurant_id,period,month,year,company_id,department_id,cost_center_id,account_code,account_name,category,budget,source_file_id,created_at) VALUES ${tuples.join(',')}`,values);
  }
}

export async function saveFinancialImport(restaurant:Restaurant,file:ImportRecord,rows:FinancialTransaction[]|BudgetRecord[],kind:'financial'|'budget'){
  await ensureFinancialSchema();
  const db=database(),client=await db.connect();
  const statementType=kind==='budget'?'budget':file.statement_type||'journal';
  const month=rows[0]?.month||Number(file.period.split('-')[1])||1;
  try{
    await client.query('BEGIN');
    const versionResult=await client.query(`SELECT COALESCE(MAX(version),0)+1 AS version FROM financial_imports WHERE restaurant_id=$1 AND company_id=$2 AND statement_type=$3 AND period=$4`,[restaurant.id,file.company_id,statementType,file.period]);
    const version=Number(versionResult.rows[0].version);
    await client.query(`UPDATE financial_imports SET is_active=false,replaced_at=now() WHERE restaurant_id=$1 AND company_id=$2 AND statement_type=$3 AND period=$4 AND is_active=true`,[restaurant.id,file.company_id,statementType,file.period]);
    await client.query(`INSERT INTO financial_imports(id,restaurant_id,company_id,statement_type,module,period,month,year,version,is_active,file_name,original_file_name,file_type,file_size,status,uploaded_by,uploaded_at,processed_at,rows_imported,rows_failed) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,[file.id,restaurant.id,file.company_id,statementType,file.module,file.period,month,file.year,version,file.file_name,file.original_file_name,file.file_type,file.file_size,file.status,file.uploaded_by,file.uploaded_at,file.processed_at||null,file.rows_imported,file.rows_failed]);
    if(kind==='budget')await insertBudgetRows(client,rows as BudgetRecord[],file.id,restaurant.id);else await insertTransactionRows(client,rows as FinancialTransaction[],file.id,restaurant.id);
    await client.query('COMMIT');
    return {version,replaced:version>1};
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}

export async function deleteImport(restaurant:Restaurant,fileId:string){await ensureFinancialSchema();await database().query(`DELETE FROM financial_imports WHERE id=$1 AND restaurant_id=$2`,[fileId,restaurant.id])}

export async function deleteFilteredTransactions(restaurant:Restaurant,filters:{company_id?:string;month?:string;year?:string;department_id?:string;cost_center_id?:string;source_file_id?:string}){
  await ensureFinancialSchema();
  const params:unknown[]=[restaurant.id];const where=['t.restaurant_id=$1'];
  const add=(sql:string,value:string|undefined)=>{if(value&&value!=='all'){params.push(value);where.push(sql.replace('?',`$${params.length}`))}};
  add('t.company_id=?',filters.company_id);add('t.month::text=?',filters.month);add('t.year::text=?',filters.year);add('t.department_id=?',filters.department_id);add('t.cost_center_id=?',filters.cost_center_id);add('t.source_file_id=?',filters.source_file_id);
  await database().query(`DELETE FROM financial_transactions t WHERE ${where.join(' AND ')}`,params);
}
