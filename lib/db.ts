import {Pool} from 'pg';

let pool:Pool|undefined;

export function database(){
  const connectionString=process.env.DATABASE_URL;
  if(!connectionString) throw new Error('DATABASE_URL belum dikonfigurasi. Tambahkan PostgreSQL/Supabase connection string di Vercel Environment Variables.');
  if(!pool) pool=new Pool({connectionString,ssl:connectionString.includes('localhost')?false:{rejectUnauthorized:false},max:5});
  return pool;
}
