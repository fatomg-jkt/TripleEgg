import 'server-only';
import type {Mailer} from '../password-reset/types';

const required=(name:string)=>{const value=process.env[name];if(!value)throw new Error(`Konfigurasi email belum lengkap: ${name}`);return value};
const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export class MicrosoftGraphMailer implements Mailer {
 async sendPasswordReset({to,name,resetUrl}:Parameters<Mailer['sendPasswordReset']>[0]){
  const tenant=required('MICROSOFT_TENANT_ID'),clientId=required('MICROSOFT_CLIENT_ID'),secret=required('MICROSOFT_CLIENT_SECRET'),from=required('MAIL_FROM');
  const tokenResponse=await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:secret,scope:'https://graph.microsoft.com/.default',grant_type:'client_credentials'}),cache:'no-store'});
  if(!tokenResponse.ok)throw new Error(`Microsoft Graph authentication failed (${tokenResponse.status})`);
  const accessToken=String((await tokenResponse.json() as {access_token?:string}).access_token||'');if(!accessToken)throw new Error('Microsoft Graph did not return an access token');
  const safeName=escapeHtml(name),safeUrl=escapeHtml(resetUrl);
  const html=`<div style="font-family:Arial,sans-serif;color:#172033"><h1 style="color:#163b72">Triple Egg</h1><h2>Financial &amp; Accounting</h2><p>Halo ${safeName},</p><p>Kami menerima permintaan untuk mereset password akun Anda.</p><p><a href="${safeUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Reset Password</a></p><p>Link ini berlaku selama 30 menit. Jika Anda tidak meminta reset password, abaikan email ini.</p></div>`;
  const text=`Halo ${name},\n\nKami menerima permintaan reset password Financial & Accounting Triple Egg.\n\nReset Password: ${resetUrl}\n\nLink ini berlaku selama 30 menit. Jika Anda tidak meminta reset password, abaikan email ini.`;
  const boundary=`tripleegg-${Date.now()}`;
  const mime=[`From: ${from}`,`To: ${to}`,'Subject: Reset Password - Financial & Accounting Triple Egg','MIME-Version: 1.0',`Content-Type: multipart/alternative; boundary=\"${boundary}\"`,'',`--${boundary}`,'Content-Type: text/plain; charset=\"UTF-8\"','Content-Transfer-Encoding: base64','',Buffer.from(text).toString('base64'),`--${boundary}`,'Content-Type: text/html; charset=\"UTF-8\"','Content-Transfer-Encoding: base64','',Buffer.from(html).toString('base64'),`--${boundary}--`].join('\r\n');
  const response=await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`,{method:'POST',headers:{authorization:`Bearer ${accessToken}`,'content-type':'text/plain'},body:Buffer.from(mime).toString('base64')});
  if(!response.ok)throw new Error(`Microsoft Graph sendMail failed (${response.status})`);
 }
}
