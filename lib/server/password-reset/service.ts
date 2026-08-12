import {createHash,randomBytes} from 'node:crypto';
import bcrypt from 'bcryptjs';
import type {Mailer,PasswordResetRepository} from './types';

export const GENERIC_FORGOT_MESSAGE='Jika email terdaftar, instruksi reset password akan dikirim.';
export const INVALID_TOKEN_MESSAGE='Link reset password tidak valid atau sudah kedaluwarsa.';
export const hashResetToken=(token:string)=>createHash('sha256').update(token).digest('hex');
export const normalizeEmail=(email:string)=>email.trim().toLowerCase();

export class PasswordResetService {
  constructor(private repository:PasswordResetRepository,private mailer:Mailer,private appUrl:string,private now=()=>new Date()){}
  async request(email:string){
    const user=await this.repository.findUserByEmail(normalizeEmail(email));
    if(!user||user.status.toLowerCase()!=='active')return;
    const rawToken=randomBytes(32).toString('base64url');
    await this.repository.createToken({userId:user.id,tokenHash:hashResetToken(rawToken),expiresAt:new Date(this.now().getTime()+30*60*1000)});
    const resetUrl=`${this.appUrl.replace(/\/$/,'')}/reset-password?token=${encodeURIComponent(rawToken)}`;
    await this.mailer.sendPasswordReset({to:user.email,name:user.name,resetUrl});
  }
  async validate(token:string){
    if(!token)return false;
    const record=await this.repository.findToken(hashResetToken(token));
    return Boolean(record&&!record.usedAt&&record.expiresAt>this.now()&&record.user.status.toLowerCase()==='active');
  }
  async reset(token:string,password:string,confirmation:string){
    if(password.length<8)return {ok:false,error:'Password minimal 8 karakter.'} as const;
    if(password!==confirmation)return {ok:false,error:'Konfirmasi password tidak sama.'} as const;
    const record=token?await this.repository.findToken(hashResetToken(token)):null;
    const now=this.now();
    if(!record||record.usedAt||record.expiresAt<=now||record.user.status.toLowerCase()!=='active')return {ok:false,error:INVALID_TOKEN_MESSAGE} as const;
    const passwordHash=await bcrypt.hash(password,12);
    const completed=await this.repository.completeReset({tokenId:record.id,userId:record.userId,passwordHash,now});
    return completed?{ok:true} as const:{ok:false,error:INVALID_TOKEN_MESSAGE} as const;
  }
}
