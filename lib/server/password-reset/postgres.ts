import 'server-only';
import {Pool,PoolClient} from 'pg';
import type {PasswordResetRepository,ResetToken,ResetUser} from './types';

let pool:Pool|undefined;
const db=()=>pool??=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:undefined});
const user=(row:Record<string,unknown>):ResetUser=>({id:String(row.user_id??row.id),email:String(row.email),name:String(row.name??row.full_name??row.email),status:String(row.status)});
export class PostgresPasswordResetRepository implements PasswordResetRepository {
 async findUserByEmail(email:string){const r=await db().query('SELECT id, email, name, status FROM users WHERE LOWER(email)=$1 LIMIT 1',[email]);return r.rowCount?user(r.rows[0]):null}
 async createToken(v:{userId:string;tokenHash:string;expiresAt:Date}){await db().query('INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',[v.userId,v.tokenHash,v.expiresAt])}
 async findToken(tokenHash:string){const r=await db().query(`SELECT t.id,t.user_id,t.token_hash,t.expires_at,t.used_at,u.email,u.name,u.status FROM password_reset_tokens t JOIN users u ON u.id=t.user_id WHERE t.token_hash=$1 LIMIT 1`,[tokenHash]);if(!r.rowCount)return null;const x=r.rows[0];return {id:String(x.id),userId:String(x.user_id),tokenHash:String(x.token_hash),expiresAt:new Date(x.expires_at),usedAt:x.used_at?new Date(x.used_at):null,user:user(x)} as ResetToken&{user:ResetUser}}
 async completeReset(v:{tokenId:string;userId:string;passwordHash:string;now:Date}){const client=await db().connect();try{await client.query('BEGIN');const consumed=await client.query(`UPDATE password_reset_tokens SET used_at=$3 WHERE id=$1 AND user_id=$2 AND used_at IS NULL AND expires_at>$3 RETURNING id`,[v.tokenId,v.userId,v.now]);if(!consumed.rowCount){await client.query('ROLLBACK');return false}const updated=await client.query(`UPDATE users SET password_hash=$1, require_password_change=FALSE, session_version=COALESCE(session_version,0)+1 WHERE id=$2 AND LOWER(status)='active'`,[v.passwordHash,v.userId]);if(!updated.rowCount){await client.query('ROLLBACK');return false}await revokeSessionsIfPresent(client,v.userId);await client.query('COMMIT');return true}catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}}
}
async function revokeSessionsIfPresent(client:PoolClient,userId:string){try{await client.query('DELETE FROM sessions WHERE user_id=$1',[userId])}catch(error){if((error as {code?:string}).code!=='42P01')throw error}}
