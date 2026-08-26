const CONFIG={
 EVENT_NAME:"CODEX 4.0",ORGANIZER:"Coders' Club",PAYMENT_FEE:300,
 SPREADSHEET_NAME:"CODEX 4.0 - Responses",SHEET_NAME:"Registrations",
 DRIVE_FOLDER_NAME:"CODEX 4.0 - Payment Receipts",MAX_FILE_SIZE:10*1024*1024,
 OTP_EXPIRY_MS:10*60*1000,OTP_RESEND_MS:60*1000,OTP_MAX_ATTEMPTS:5,
 AUTH_TOKEN_EXPIRY_MS:30*60*1000,GOOGLE_CLIENT_ID_PROPERTY:"GOOGLE_CLIENT_ID"
};

function setup(){
 const p=PropertiesService.getScriptProperties();let id=p.getProperty("SPREADSHEET_ID"),ss;
 if(!id){ss=SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME);id=ss.getId();p.setProperty("SPREADSHEET_ID",id)}else ss=SpreadsheetApp.openById(id);
 let sh=ss.getSheetByName(CONFIG.SHEET_NAME);if(!sh){sh=ss.getSheets()[0];sh.setName(CONFIG.SHEET_NAME)}
 const h=["Timestamp","Registration ID","Team Name","Team Size","College Name","Member 1 - Full Name","Member 1 - Roll Number","Member 1 - Email","Member 1 - Mobile","Member 1 - Year","Member 1 - Branch","Member 1 - Section","Member 2 - Full Name","Member 2 - Roll Number","Member 2 - Email","Member 2 - Mobile","Member 2 - Year","Member 2 - Branch","Member 2 - Section","Member 3 - Full Name","Member 3 - Roll Number","Member 3 - Email","Member 3 - Mobile","Member 3 - Year","Member 3 - Branch","Member 3 - Section","Payment Amount","UPI Transaction ID / UTR","Payment Receipt","Status","Submission Token"];
 if(!sh.getLastColumn()){sh.getRange(1,1,1,h.length).setValues([h])}else{const old=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String),missing=h.filter(x=>!old.includes(x));if(missing.length)sh.getRange(1,old.length+1,1,missing.length).setValues([missing])}
 sh.setFrozenRows(1);sh.getRange(1,1,1,sh.getLastColumn()).setFontWeight("bold");
 let folder=p.getProperty("FOLDER_ID");if(!folder){folder=DriveApp.createFolder(CONFIG.DRIVE_FOLDER_NAME).getId();p.setProperty("FOLDER_ID",folder)}
 Logger.log("Sheet: "+ss.getUrl());Logger.log("Folder: "+DriveApp.getFolderById(folder).getUrl());
}

function doGet(e){
 const q=e&&e.parameter?e.parameter:{},a=q.action||"";
 if(a==="getRegistrationId")return getRegistrationIdJsonp(q);
 if(a==="authConfig")return authConfigJsonp(q);
 if(a==="sendOtp")return authJsonp(q,handleSendOtp({email:q.email}));
 if(a==="verifyOtp")return authJsonp(q,handleVerifyOtp({email:q.email,otp:q.otp}));
 if(a==="googleAuth")return authJsonp(q,handleGoogleAuth({credential:q.credential}));
 return jsonResponse({success:true,message:"CODEX 4.0 backend is running."});
}

function doPost(e){
 const lock=LockService.getScriptLock();try{lock.waitLock(30000);if(!e||!e.postData||!e.postData.contents)return jsonResponse({success:false,message:"No request data received."});let d;try{d=JSON.parse(e.postData.contents)}catch(_){return jsonResponse({success:false,message:"Invalid request data."})}
 const a=String(d.action||"register");if(a==="sendOtp")return handleSendOtp(d);if(a==="verifyOtp")return handleVerifyOtp(d);if(a==="googleAuth")return handleGoogleAuth(d);return handleRegistration(d);
 }catch(err){console.error(err);return jsonResponse({success:false,message:err.message||"Unable to process request."})}finally{try{lock.releaseLock()}catch(_){}}
}

function handleSendOtp(d){
 const email=normalizeEmail(d.email);validateEmail(email);const existing=findRegistrationByEmail(email);if(existing)return {success:false,alreadyRegistered:true,registrationId:existing.registrationId,message:"A registration already exists for this email address."};
 const p=PropertiesService.getScriptProperties(),k=otpKey(email),old=p.getProperty(k);if(old)try{const r=JSON.parse(old),wait=CONFIG.OTP_RESEND_MS-(Date.now()-r.sentAt);if(wait>0)return {success:false,cooldown:true,retryAfter:Math.ceil(wait/1000),message:"Please wait before requesting another OTP."}}catch(_){ }
 const otp=String(Math.floor(100000+Math.random()*900000));p.setProperty(k,JSON.stringify({email,otpHash:hashValue(otp),sentAt:Date.now(),expiresAt:Date.now()+CONFIG.OTP_EXPIRY_MS,attempts:0}));
 MailApp.sendEmail({to:email,subject:"CODEX 4.0 - Email Verification OTP",htmlBody:otpEmailHtml(otp,email)});
 return {success:true,message:"OTP sent successfully. Check your email.",expiresIn:600,retryAfter:60};
}

function handleVerifyOtp(d){
 const email=normalizeEmail(d.email),otp=String(d.otp||"").trim();validateEmail(email);if(!/^\d{6}$/.test(otp))throw new Error("Please enter the 6-digit OTP.");
 const p=PropertiesService.getScriptProperties(),k=otpKey(email),raw=p.getProperty(k);if(!raw)throw new Error("OTP not found. Please request a new OTP.");let r;try{r=JSON.parse(raw)}catch(_){throw new Error("OTP session is invalid. Please request a new OTP.")}
 if(Date.now()>Number(r.expiresAt||0)){p.deleteProperty(k);throw new Error("OTP has expired. Please request a new OTP.")}
 r.attempts=Number(r.attempts||0)+1;if(r.attempts>CONFIG.OTP_MAX_ATTEMPTS){p.deleteProperty(k);throw new Error("Too many incorrect attempts. Please request a new OTP.")}
 if(hashValue(otp)!==r.otpHash){p.setProperty(k,JSON.stringify(r));throw new Error("Incorrect OTP. Please try again.")}
 p.deleteProperty(k);const existing=findRegistrationByEmail(email);if(existing)return {success:false,alreadyRegistered:true,registrationId:existing.registrationId,message:"A registration already exists for this email address."};
 return issueAuthToken(email,"otp");
}

function handleGoogleAuth(d){
 const credential=String(d.credential||"").trim();if(!credential)throw new Error("Google credential is missing.");
 const clientId=PropertiesService.getScriptProperties().getProperty(CONFIG.GOOGLE_CLIENT_ID_PROPERTY);if(!clientId)throw new Error("Google Sign-In is not configured yet. Add GOOGLE_CLIENT_ID to Script Properties.");
 const res=UrlFetchApp.fetch("https://oauth2.googleapis.com/tokeninfo?id_token="+encodeURIComponent(credential),{muteHttpExceptions:true});if(res.getResponseCode()!==200)throw new Error("Google sign-in verification failed.");let info;try{info=JSON.parse(res.getContentText())}catch(_){throw new Error("Invalid Google sign-in response.")}
 if(String(info.aud||"")!==String(clientId))throw new Error("Google account verification failed.");if(!["accounts.google.com","https://accounts.google.com"].includes(String(info.iss||"")))throw new Error("Invalid Google token issuer.");if(Number(info.exp||0)*1000<=Date.now())throw new Error("Google sign-in token has expired.");if(String(info.email_verified||"").toLowerCase()!=="true")throw new Error("Google email is not verified.");
 const email=normalizeEmail(info.email);validateEmail(email);const existing=findRegistrationByEmail(email);if(existing)return {success:false,alreadyRegistered:true,registrationId:existing.registrationId,email,message:"A registration already exists for this Google account."};
 return issueAuthToken(email,"google",String(info.sub||""));
}

function issueAuthToken(email,method,googleSub){const token=createAuthToken();PropertiesService.getScriptProperties().setProperty(authTokenKey(token),JSON.stringify({email,method,googleSub:googleSub||"",createdAt:Date.now(),expiresAt:Date.now()+CONFIG.AUTH_TOKEN_EXPIRY_MS}));return {success:true,verified:true,email,authToken:token,expiresIn:1800,message:method==="google"?"Google account verified successfully.":"Email verified successfully."}}
function otpKey(email){return "OTP_"+hashValue(normalizeEmail(email))}function authTokenKey(token){return "AUTH_"+hashValue(String(token))}
function hashValue(v){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(v),Utilities.Charset.UTF_8).map(b=>((b+256)%256).toString(16).padStart(2,"0")).join("")}
function createAuthToken(){return Utilities.getUuid().replace(/-/g,"")+Utilities.getUuid().replace(/-/g,"")}
function getAuthSession(token){if(!token)throw new Error("Authentication token is missing. Please verify your email again.");const p=PropertiesService.getScriptProperties(),k=authTokenKey(token),raw=p.getProperty(k);if(!raw)throw new Error("Authentication session expired. Please verify your email again.");let s;try{s=JSON.parse(raw)}catch(_){p.deleteProperty(k);throw new Error("Authentication session is invalid.")}if(Date.now()>Number(s.expiresAt||0)){p.deleteProperty(k);throw new Error("Authentication session expired. Please verify your email again.")}return s}

function handleRegistration(d){
 const token=String(d.authToken||d.verificationToken||""),session=getAuthSession(token),leader=normalizeEmail(d.m1_email);if(leader!==normalizeEmail(session.email))throw new Error("The verified email must be the Team Leader's email address.");
 const existing=findRegistrationByEmail(leader);if(existing)throw new Error("This email has already been used for registration. Registration ID: "+existing.registrationId);
 validateRegistration(d);const p=PropertiesService.getScriptProperties(),sid=p.getProperty("SPREADSHEET_ID"),fid=p.getProperty("FOLDER_ID");if(!sid||!fid)throw new Error("Backend has not been initialized. Run setup() first.");
 const id=generateRegistrationId(),receipt=saveReceipt(d,id,fid),sh=SpreadsheetApp.openById(sid).getSheetByName(CONFIG.SHEET_NAME);if(!sh)throw new Error("Registrations sheet not found.");ensureSubmissionTokenColumn(sh);
 const row=[new Date(),id,d.teamName||"",d.teamSize||"",d.collegeName||"",d.m1_name||"",d.m1_roll||"",d.m1_email||"",d.m1_phone||"",d.m1_year||"",d.m1_branch||"",d.m1_section||"",d.m2_name||"",d.m2_roll||"",d.m2_email||"",d.m2_phone||"",d.m2_year||"",d.m2_branch||"",d.m2_section||"",d.m3_name||"",d.m3_roll||"",d.m3_email||"",d.m3_phone||"",d.m3_year||"",d.m3_branch||"",d.m3_section||"",CONFIG.PAYMENT_FEE,d.utr||"",receipt,"Pending",d.submissionToken||""];
 const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String),names=["Timestamp","Registration ID","Team Name","Team Size","College Name","Member 1 - Full Name","Member 1 - Roll Number","Member 1 - Email","Member 1 - Mobile","Member 1 - Year","Member 1 - Branch","Member 1 - Section","Member 2 - Full Name","Member 2 - Roll Number","Member 2 - Email","Member 2 - Mobile","Member 2 - Year","Member 2 - Branch","Member 2 - Section","Member 3 - Full Name","Member 3 - Roll Number","Member 3 - Email","Member 3 - Mobile","Member 3 - Year","Member 3 - Branch","Member 3 - Section","Payment Amount","UPI Transaction ID / UTR","Payment Receipt","Status","Submission Token"],map={};names.forEach((n,i)=>map[n]=row[i]);sh.appendRow(headers.map(h=>Object.prototype.hasOwnProperty.call(map,h)?map[h]:""));
 sendConfirmationEmails(d,id);p.deleteProperty(authTokenKey(token));return jsonResponse({success:true,registrationId:id,message:"Registration submitted successfully."});
}

function validateRegistration(d){
 if(!d.teamName)throw new Error("Team name is required.");if(!["2","3"].includes(d.teamSize))throw new Error("Invalid team size. Select 2 or 3.");if(!d.collegeName)throw new Error("College name is required.");
 validateMember(d,1);validateMember(d,2);if(d.teamSize==="3")validateMember(d,3);if(String(d.payAmount||"")!==String(CONFIG.PAYMENT_FEE))throw new Error("Invalid payment amount. Registration fee is ₹300 per team.");if(!d.utr||!/^[A-Za-z0-9]{8,30}$/.test(String(d.utr).trim()))throw new Error("Invalid UPI Transaction ID / UTR.");if(!d.receiptBase64)throw new Error("Payment receipt is required.");if(!d.submissionToken)throw new Error("Submission token is missing. Please submit again.");
 const years=[d.m1_year,d.m2_year];if(d.teamSize==="3")years.push(d.m3_year);if(years.some(y=>!["2nd Year","3rd Year","4th Year"].includes(String(y))))throw new Error("Only 2nd Year, 3rd Year and 4th Year students are allowed.");if(years.filter(y=>y==="4th Year").length>1)throw new Error("A team can have a maximum of one 4th-year student.");
 const emails=[],phones=[],rolls=[],count=d.teamSize==="3"?3:2;for(let i=1;i<=count;i++){const e=normalizeEmail(d["m"+i+"_email"]),p=String(d["m"+i+"_phone"]).trim(),r=String(d["m"+i+"_roll"]).trim().toLowerCase();if(emails.includes(e))throw new Error("Each team member must have a different email ID.");if(phones.includes(p))throw new Error("Each team member must have a different mobile number.");if(rolls.includes(r))throw new Error("Each team member must have a different roll number.");emails.push(e);phones.push(p);rolls.push(r);const old=findRegistrationByEmail(e);if(old)throw new Error("A team member with email "+e+" is already registered under "+old.registrationId+".")}
}
function validateMember(d,n){["name","roll","email","phone","year","branch","section"].forEach(f=>{const k="m"+n+"_"+f;if(!d[k]||String(d[k]).trim()==="")throw new Error(k+" is required.")});if(!/^\d{10}$/.test(String(d["m"+n+"_phone"]).trim()))throw new Error("Member "+n+" mobile number must contain 10 digits.");validateEmail(normalizeEmail(d["m"+n+"_email"]))}
function validateEmail(e){if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e||"")))throw new Error("Please enter a valid email address.")}
function normalizeEmail(e){return String(e||"").trim().toLowerCase()}

function findRegistrationByEmail(email){const e=normalizeEmail(email),sid=PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");if(!e||!sid)return null;const sh=SpreadsheetApp.openById(sid).getSheetByName(CONFIG.SHEET_NAME);if(!sh||sh.getLastRow()<2)return null;const h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String),cols=["Member 1 - Email","Member 2 - Email","Member 3 - Email"].map(x=>h.indexOf(x)+1).filter(x=>x>0),idc=h.indexOf("Registration ID")+1,rows=sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues();for(let r=0;r<rows.length;r++)for(let c of cols)if(normalizeEmail(rows[r][c-1])===e)return{registrationId:String(rows[r][idc-1]||"")};return null}

function getRegistrationIdJsonp(q){const cb=q.callback;if(!cb||!/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(cb))return textResponse("Invalid callback.");const result=findRegistrationByToken(String(q.token||""));return ContentService.createTextOutput(cb+"("+JSON.stringify(result)+");").setMimeType(ContentService.MimeType.JAVASCRIPT)}
function findRegistrationByToken(token){const sid=PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");if(!sid)return{success:false,message:"Backend has not been initialized."};const sh=SpreadsheetApp.openById(sid).getSheetByName(CONFIG.SHEET_NAME);if(!sh||sh.getLastRow()<2)return{success:false,message:"Registration not found yet."};const tc=findHeaderColumn(sh,"Submission Token"),ic=findHeaderColumn(sh,"Registration ID");if(!tc||!ic)return{success:false,message:"Registration lookup columns are missing."};const vals=sh.getRange(2,tc,sh.getLastRow()-1,1).getValues();for(let i=0;i<vals.length;i++)if(String(vals[i][0]).trim()===token){const id=sh.getRange(i+2,ic).getDisplayValue();if(id)return{success:true,registrationId:id}}return{success:false,message:"Registration ID not found yet."}}
function ensureSubmissionTokenColumn(sh){if(!findHeaderColumn(sh,"Submission Token"))sh.getRange(1,sh.getLastColumn()+1).setValue("Submission Token")}
function findHeaderColumn(sh,name){if(!sh.getLastColumn())return 0;const h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(v=>String(v).trim()),i=h.indexOf(name);return i<0?0:i+1}

function saveReceipt(d,id,fid){const b=String(d.receiptBase64||"");if(b.length>Math.ceil(CONFIG.MAX_FILE_SIZE/.72))throw new Error("Payment receipt exceeds the 10 MB limit.");const bytes=Utilities.base64Decode(b);if(bytes.length>CONFIG.MAX_FILE_SIZE)throw new Error("Payment receipt exceeds the 10 MB limit.");const type=String(d.receiptType||"").toLowerCase();if(!["image/jpeg","image/png","application/pdf"].includes(type))throw new Error("Payment receipt must be JPG, PNG or PDF.");const name=String(d.receiptName||"payment-receipt").replace(/[^a-zA-Z0-9._-]/g,"_");return DriveApp.getFolderById(fid).createFile(Utilities.newBlob(bytes,type,id+"_"+name)).getUrl()}
function generateRegistrationId(){const sid=PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID"),sh=SpreadsheetApp.openById(sid).getSheetByName(CONFIG.SHEET_NAME),c=findHeaderColumn(sh,"Registration ID");if(!c)throw new Error("Registration ID column not found.");if(sh.getLastRow()<2)return"CODEX4-0001";const ids=sh.getRange(2,c,sh.getLastRow()-1,1).getDisplayValues().flat();let max=0;ids.forEach(x=>{const m=String(x).match(/^CODEX4-(\d+)$/);if(m)max=Math.max(max,Number(m[1]))});return"CODEX4-"+String(max+1).padStart(4,"0")}

function authConfigJsonp(q){const cb=q.callback;if(!cb||!/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(cb))return textResponse("Invalid callback.");const id=PropertiesService.getScriptProperties().getProperty(CONFIG.GOOGLE_CLIENT_ID_PROPERTY)||"";return ContentService.createTextOutput(cb+"("+JSON.stringify({success:true,googleClientId:id,googleEnabled:Boolean(id)})+");").setMimeType(ContentService.MimeType.JAVASCRIPT)}
function authJsonp(q,result){const cb=q.callback;if(!cb||!/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(cb))return textResponse("Invalid callback.");return ContentService.createTextOutput(cb+"("+JSON.stringify(result)+");").setMimeType(ContentService.MimeType.JAVASCRIPT)}
function otpEmailHtml(otp,email){return`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#0d1117;color:#f5f7fa;padding:28px;border-radius:14px"><div style="font-size:24px;font-weight:800;color:#39ff74">&lt;/&gt; CODEX 4.0</div><p style="color:#9aa4b2">Email verification for registration</p><p>Use this one-time code for <b>${escapeHtml(email)}</b>:</p><div style="font-size:36px;font-weight:900;letter-spacing:8px;text-align:center;padding:20px;background:#171d27;border-radius:12px;color:#39ff74">${otp}</div><p style="color:#9aa4b2;font-size:13px">This code expires in 10 minutes.</p><p style="font-size:12px;color:#667085">Coders' Club · GPREC</p></div>`}
function sendConfirmationEmails(d,id){try{const emails=[d.m1_email,d.m2_email,d.teamSize==="3"?d.m3_email:null].filter(Boolean).map(normalizeEmail);if(!emails.length)return;MailApp.sendEmail({to:emails[0],cc:emails.slice(1).join(",")||undefined,subject:`CODEX 4.0 Registration Confirmation - [${id}]`,htmlBody:`<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0d0d0d;color:#f2f2f2;padding:30px;border-radius:12px"><h2 style="color:#39ff74">&lt;/&gt; CODEX 4.0</h2><p><b>Registration ID:</b> ${escapeHtml(id)}</p><p><b>Team:</b> ${escapeHtml(d.teamName)}</p><p><b>College:</b> ${escapeHtml(d.collegeName)}</p><p><b>Team Size:</b> ${escapeHtml(d.teamSize)} Members</p><p><b>UPI UTR:</b> ${escapeHtml(d.utr)}</p><p>Please retain this email and Registration ID for event check-in.</p></div>`})}catch(e){Logger.log("Confirmation email error: "+e.message)}}
function escapeHtml(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;")}
function jsonResponse(d){return ContentService.createTextOutput(JSON.stringify(d)).setMimeType(ContentService.MimeType.JSON)}
function textResponse(t){return ContentService.createTextOutput(String(t)).setMimeType(ContentService.MimeType.TEXT)}
