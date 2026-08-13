type MicrosoftErrorBody={
  error?:string|{code?:string;message?:string};
  error_description?:string;
};

function env(name:string){
  const value=process.env[name];
  if(!value)throw new Error(`${name} belum dikonfigurasi.`);
  return value;
}

/** Keep diagnostic responses useful without ever emitting credentials or tokens. */
function sanitizedBody(body:string){
  return body
    .replace(/("(?:access_token|refresh_token|client_secret|password|otp|authorization)"\s*:\s*")[^"]*(")/gi,'$1[REDACTED]$2')
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi,'Bearer [REDACTED]')
    .slice(0,4000);
}

function errorDetails(body:string){
  try{
    const parsed=JSON.parse(body) as MicrosoftErrorBody;
    if(typeof parsed.error==='string')return {code:parsed.error,message:parsed.error_description||'No error description'};
    return {code:parsed.error?.code||'unknown_error',message:parsed.error?.message||parsed.error_description||'No error message'};
  }catch{return {code:'invalid_error_response',message:'Microsoft returned a non-JSON error response'};}
}

async function accessToken(){
  const response=await fetch(`https://login.microsoftonline.com/${encodeURIComponent(env('MICROSOFT_TENANT_ID'))}/oauth2/v2.0/token`,{
    method:'POST',
    headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({client_id:env('MICROSOFT_CLIENT_ID'),client_secret:env('MICROSOFT_CLIENT_SECRET'),scope:'https://graph.microsoft.com/.default',grant_type:'client_credentials'}),
    cache:'no-store'
  });
  if(!response.ok){
    const body=await response.text(),details=errorDetails(body);
    console.error('Microsoft identity token request failed',{status:response.status,statusText:response.statusText,code:details.code,message:details.message,response:sanitizedBody(body)});
    throw new Error(`Microsoft token request failed (${response.status} ${details.code}): ${details.message}`);
  }
  const payload=await response.json() as {access_token?:string};
  if(!payload.access_token)throw new Error('Microsoft token response did not contain an access token.');
  return payload.access_token;
}

export async function sendMail(to:string,subject:string,html:string){
  const from=env('MAIL_FROM'),token=await accessToken();
  const response=await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`,{
    method:'POST',
    headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},
    body:JSON.stringify({message:{subject,body:{contentType:'HTML',content:html},toRecipients:[{emailAddress:{address:to}}]}}),
    cache:'no-store'
  });
  if(!response.ok){
    const body=await response.text(),details=errorDetails(body),requestId=response.headers.get('request-id')||response.headers.get('client-request-id');
    console.error('Microsoft Graph sendMail failed',{status:response.status,statusText:response.statusText,code:details.code,message:details.message,requestId:requestId||'unavailable',response:sanitizedBody(body)});
    throw new Error(`Microsoft Graph sendMail failed (${response.status} ${details.code}): ${details.message}; request-id=${requestId||'unavailable'}`);
  }
}

export const activationEmail=(name:string,otp:string)=>`<h1>Triple Egg</h1><h2>Financial & Accounting Triple Egg</h2><p>Halo ${name}, OTP aktivasi Anda:</p><strong style="font-size:32px;letter-spacing:8px">${otp}</strong><p>Berlaku 10 menit untuk membuat password. Jangan berikan OTP kepada siapa pun.</p>`;
export const resetEmail=(name:string,url:string)=>`<h1>Triple Egg</h1><p>Halo ${name}, <a href="${url}">buat password baru</a>. Link berlaku 30 menit dan satu kali pakai.</p>`;
