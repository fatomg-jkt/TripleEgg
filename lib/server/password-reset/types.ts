export interface ResetUser { id:string; email:string; name:string; status:string; }
export interface ResetToken { id:string; userId:string; tokenHash:string; expiresAt:Date; usedAt:Date|null; }
export interface PasswordResetRepository {
  findUserByEmail(email:string):Promise<ResetUser|null>;
  createToken(input:{userId:string;tokenHash:string;expiresAt:Date}):Promise<void>;
  findToken(tokenHash:string):Promise<(ResetToken & {user:ResetUser})|null>;
  completeReset(input:{tokenId:string;userId:string;passwordHash:string;now:Date}):Promise<boolean>;
}
export interface Mailer { sendPasswordReset(input:{to:string;name:string;resetUrl:string}):Promise<void>; }
