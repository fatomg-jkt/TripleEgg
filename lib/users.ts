import {randomUUID} from 'crypto';
import bcrypt from 'bcryptjs';
import {database} from './db';
import type {Role} from './schema';

export type UserStatus='Active'|'Pending Activation'|'Disabled';
export interface User {id:string;name:string;email:string;role:Role;company:string;department:string;costCenter:string;restaurantSlugs:string[];status:UserStatus;lastLogin:string|null;requirePasswordChange:boolean;sessionVersion:number;createdAt:string;updatedAt:string}
export interface UserWithPassword extends User {passwordHash:string}
type Row=Record<string,unknown>;
const OLD_ADMIN='raisa@tripleegg.co.id';
export const ADMIN_EMAIL='tripleegg@obsidian-managementgroup.com';

function map(r:Row):UserWithPassword{return {id:String(r.id),name:String(r.name),email:String(r.email),passwordHash:String(r.password_hash),role:r.role as Role,company:String(r.company),department:String(r.department),costCenter:String(r.cost_center),restaurantSlugs:Array.isArray(r.restaurant_slugs)?r.restaurant_slugs.map(String):['triple-egg'],status:r.status as UserStatus,lastLogin:r.last_login?new Date(r.last_login as string).toISOString():null,requirePasswordChange:Boolean(r.require_password_change),sessionVersion:Number(r.session_version),createdAt:new Date(r.created_at as string).toISOString(),updatedAt:new Date(r.updated_at as string).toISOString()}}
const userSelect=`SELECT u.*,(SELECT array_agg(r.slug ORDER BY r.name) FROM user_restaurants ur JOIN restaurants r ON r.id=ur.restaurant_id WHERE ur.user_id=u.id) restaurant_slugs FROM users u`;

let ready:Promise<void>|undefined;
export function ensureUserSchema(){return ready??=(async()=>{
  const db=database();
  await db.query(`CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE, password_hash text NOT NULL,
    role text NOT NULL, company text NOT NULL DEFAULT 'All', department text NOT NULL DEFAULT 'All',
    cost_center text NOT NULL DEFAULT 'All', status text NOT NULL DEFAULT 'Active', last_login timestamptz,
    require_password_change boolean NOT NULL DEFAULT false, session_version integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS user_activation_otps (id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,otp_hash text NOT NULL,expires_at timestamptz NOT NULL,attempts integer NOT NULL DEFAULT 0,used_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),last_sent_at timestamptz NOT NULL DEFAULT now())`);
  await db.query(`CREATE TABLE IF NOT EXISTS password_reset_tokens (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL, used_at timestamptz)`);
  await db.query(`CREATE TABLE IF NOT EXISTS restaurants(id uuid PRIMARY KEY,slug text NOT NULL UNIQUE,name text NOT NULL UNIQUE,active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now())`);
  await db.query(`INSERT INTO restaurants(id,slug,name) VALUES ('00000000-0000-0000-0000-000000000001','triple-egg','Triple Egg'),('00000000-0000-0000-0000-000000000002','wok-this-way','Wok This Way') ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,name=excluded.name`);
  await db.query(`CREATE TABLE IF NOT EXISTS user_restaurants(user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,restaurant_id))`);
  await db.query(`INSERT INTO user_restaurants(user_id,restaurant_id) SELECT id,'00000000-0000-0000-0000-000000000001'::uuid FROM users ON CONFLICT DO NOTHING`);
  const existing=await db.query('SELECT id,email FROM users WHERE lower(email)=ANY($1)',[[OLD_ADMIN,ADMIN_EMAIL]]);
  const old=existing.rows.find(x=>x.email.toLowerCase()===OLD_ADMIN), current=existing.rows.find(x=>x.email.toLowerCase()===ADMIN_EMAIL);
  if(old&&!current) await db.query("UPDATE users SET email=$1,name='Raisa Admin',role='Super Admin',company='All',department='All',cost_center='All',status='Active',updated_at=now() WHERE id=$2",[ADMIN_EMAIL,old.id]);
  else if(old&&current) await db.query('DELETE FROM users WHERE id=$1',[old.id]);
  if(!old&&!current&&process.env.SUPER_ADMIN_PASSWORD){
    const hash=await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD,12);
    await db.query(`INSERT INTO users(id,name,email,password_hash,role,company,department,cost_center,status,require_password_change) VALUES($1,'Raisa Admin',$2,$3,'Super Admin','All','All','All','Active',false) ON CONFLICT(email) DO NOTHING`,[randomUUID(),ADMIN_EMAIL,hash]);
  }
  await db.query(`INSERT INTO user_restaurants(user_id,restaurant_id) SELECT id,'00000000-0000-0000-0000-000000000001'::uuid FROM users u WHERE NOT EXISTS(SELECT 1 FROM user_restaurants ur WHERE ur.user_id=u.id) ON CONFLICT DO NOTHING`);
})();}

export const users={
  async list(){await ensureUserSchema();return (await database().query(`${userSelect} ORDER BY u.created_at DESC`)).rows.map(map)},
  async findByEmail(email:string){await ensureUserSchema();const r=await database().query(`${userSelect} WHERE lower(u.email)=lower($1)`,[email.trim()]);return r.rows[0]?map(r.rows[0]):null},
  async findById(id:string){await ensureUserSchema();const r=await database().query(`${userSelect} WHERE u.id=$1`,[id]);return r.rows[0]?map(r.rows[0]):null},
  async create(input:{name:string;email:string;password:string;role:Role;company?:string;department?:string;costCenter?:string;status?:UserStatus}){await ensureUserSchema();const hash=await bcrypt.hash(input.password,12);const r=await database().query(`INSERT INTO users(id,name,email,password_hash,role,company,department,cost_center,status,require_password_change) VALUES($1,$2,lower($3),$4,$5,$6,$7,$8,$9,true) RETURNING *`,[randomUUID(),input.name,input.email,hash,input.role,input.company||'All',input.department||'All',input.costCenter||'All',input.status||'Active']);return map(r.rows[0])},
  async edit(id:string,input:Partial<Pick<User,'name'|'email'|'role'|'company'|'department'|'costCenter'|'status'>>){await ensureUserSchema();const current=await this.findById(id);if(!current)return null;const r=await database().query(`UPDATE users SET name=$2,email=lower($3),role=$4,company=$5,department=$6,cost_center=$7,status=$8,session_version=CASE WHEN email<>lower($3) OR role<>$4 OR status<>$8 THEN session_version+1 ELSE session_version END,updated_at=now() WHERE id=$1 RETURNING *`,[id,input.name??current.name,input.email??current.email,input.role??current.role,input.company??current.company,input.department??current.department,input.costCenter??current.costCenter,input.status??current.status]);return map(r.rows[0])},
  async activate(id:string){return this.edit(id,{status:'Active'})}, async disable(id:string){return this.edit(id,{status:'Disabled'})},
  async resetPassword(id:string,password:string){await ensureUserSchema();const hash=await bcrypt.hash(password,12);await database().query('UPDATE users SET password_hash=$2,require_password_change=true,session_version=session_version+1,updated_at=now() WHERE id=$1',[id,hash])},
  async changePassword(id:string,password:string){await ensureUserSchema();const hash=await bcrypt.hash(password,12);await database().query('UPDATE users SET password_hash=$2,require_password_change=false,session_version=session_version+1,updated_at=now() WHERE id=$1',[id,hash])},
  async updateLastLogin(id:string){await ensureUserSchema();await database().query('UPDATE users SET last_login=now(),updated_at=now() WHERE id=$1',[id])}
};

export function publicUser({passwordHash,...user}:UserWithPassword){return user}
