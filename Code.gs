/**
 * CODEX 4.0 - Google Apps Script Backend
 * Registration + Email OTP + Google Sign-In verification
 * Storage: Google Sheets + Google Drive
 */

const CONFIG = {
  EVENT_NAME: "CODEX 4.0",
  ORGANIZER: "Coders' Club",
  PAYMENT_FEE: 300,
  SPREADSHEET_NAME: "CODEX 4.0 - Responses",
  SHEET_NAME: "Registrations",
  DRIVE_FOLDER_NAME: "CODEX 4.0 - Payment Receipts",
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  OTP_EXPIRY_MS: 10 * 60 * 1000,
  OTP_RESEND_MS: 60 * 1000,
  OTP_MAX_ATTEMPTS: 5,
  AUTH_TOKEN_EXPIRY_MS: 30 * 60 * 1000,
  GOOGLE_CLIENT_ID_PROPERTY: "GOOGLE_CLIENT_ID"
};

function setup() {
  const props = PropertiesService.getScriptProperties();
  let spreadsheetId = props.getProperty("SPREADSHEET_ID");
  let spreadsheet;

  if (!spreadsheetId) {
    spreadsheet = SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME);
    spreadsheetId = spreadsheet.getId();
    props.setProperty("SPREADSHEET_ID", spreadsheetId);
  } else {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  }

  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.getSheets()[0];
    sheet.setName(CONFIG.SHEET_NAME);
  }

  const headers = [
    "Timestamp", "Registration ID", "Team Name", "Team Size", "College Name",
    "Member 1 - Full Name", "Member 1 - Roll Number", "Member 1 - Email", "Member 1 - Mobile", "Member 1 - Year", "Member 1 - Branch", "Member 1 - Section",
    "Member 2 - Full Name", "Member 2 - Roll Number", "Member 2 - Email", "Member 2 - Mobile", "Member 2 - Year", "Member 2 - Branch", "Member 2 - Section",
    "Member 3 - Full Name", "Member 3 - Roll Number", "Member 3 - Email", "Member 3 - Mobile", "Member 3 - Year", "Member 3 - Branch", "Member 3 - Section",
    "Payment Amount", "UPI Transaction ID / UTR", "Payment Receipt", "Status", "Submission Token"
  ];

  const lastColumn = sheet.getLastColumn();
  if (sheet.getLastRow() === 0 || lastColumn === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const existing = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String);
    const missing = headers.filter(h => !existing.includes(h));
    if (missing.length) {
      sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
    }
  }

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight("bold");
  sheet.autoResizeColumns(1, sheet.getLastColumn());

  let folderId = props.getProperty("FOLDER_ID");
  if (!folderId) {
    const folder = DriveApp.createFolder(CONFIG.DRIVE_FOLDER_NAME);
    folderId = folder.getId();
    props.setProperty("FOLDER_ID", folderId);
  }

  Logger.log("CODEX 4.0 setup complete.");
  Logger.log("Google Sheet: " + spreadsheet.getUrl());
  Logger.log("Google Drive Folder: " + DriveApp.getFolderById(folderId).getUrl());
}

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = params.action || "";

  if (action === "getRegistrationId") return getRegistrationIdJsonp(params);
  if (action === "authConfig") return authConfigJsonp(params);
  if (action === "checkRegistration") return checkRegistrationJsonp(params);

  return jsonResponse({ success: true, message: "CODEX 4.0 backend is running." });
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, message: "No request data received." });
    }

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      return jsonResponse({ success: false, message: "Invalid request data." });
    }

    const action = String(data.action || "register");

    if (action === "sendOtp") return handleSendOtp(data);
    if (action === "verifyOtp") return handleVerifyOtp(data);
    if (action === "googleAuth") return handleGoogleAuth(data);

    return handleRegistration(data);
  } catch (error) {
    console.error(error);
    return jsonResponse({ success: false, message: error.message || "Unable to process request." });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/* =========================================================
   AUTHENTICATION
========================================================= */

function handleSendOtp(data) {
  const email = normalizeEmail(data.email);
  validateEmail(email);

  const existing = findRegistrationByEmail(email);
  if (existing) {
    return jsonResponse({
      success: false,
      alreadyRegistered: true,
      registrationId: existing.registrationId,
      message: "A registration already exists for this email address."
    });
  }

  const props = PropertiesService.getScriptProperties();
  const key = otpKey(email);
  const existingOtpRaw = props.getProperty(key);

  if (existingOtpRaw) {
    try {
      const existingOtp = JSON.parse(existingOtpRaw);
      if (existingOtp.sentAt && Date.now() - existingOtp.sentAt < CONFIG.OTP_RESEND_MS) {
        const remaining = Math.ceil((CONFIG.OTP_RESEND_MS - (Date.now() - existingOtp.sentAt)) / 1000);
        return jsonResponse({
          success: false,
          cooldown: true,
          retryAfter: remaining,
          message: "Please wait before requesting another OTP."
        });
      }
    } catch (_) {}
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const record = {
    email: email,
    otpHash: hashValue(otp),
    sentAt: Date.now(),
    expiresAt: Date.now() + CONFIG.OTP_EXPIRY_MS,
    attempts: 0
  };

  props.setProperty(key, JSON.stringify(record));

  MailApp.sendEmail({
    to: email,
    subject: "CODEX 4.0 - Email Verification OTP",
    htmlBody: otpEmailHtml(otp, email)
  });

  return jsonResponse({
    success: true,
    message: "OTP sent successfully. Check your email.",
    expiresIn: Math.floor(CONFIG.OTP_EXPIRY_MS / 1000),
    retryAfter: Math.floor(CONFIG.OTP_RESEND_MS / 1000)
  });
}

function handleVerifyOtp(data) {
  const email = normalizeEmail(data.email);
  const otp = String(data.otp || "").trim();
  validateEmail(email);

  if (!/^\d{6}$/.test(otp)) {
    throw new Error("Please enter the 6-digit OTP.");
  }

  const props = PropertiesService.getScriptProperties();
  const key = otpKey(email);
  const raw = props.getProperty(key);

  if (!raw) throw new Error("OTP not found. Please request a new OTP.");

  let record;
  try { record = JSON.parse(raw); } catch (_) { throw new Error("OTP session is invalid. Please request a new OTP."); }

  if (Date.now() > Number(record.expiresAt || 0)) {
    props.deleteProperty(key);
    throw new Error("OTP has expired. Please request a new OTP.");
  }

  record.attempts = Number(record.attempts || 0) + 1;
  if (record.attempts > CONFIG.OTP_MAX_ATTEMPTS) {
    props.deleteProperty(key);
    throw new Error("Too many incorrect attempts. Please request a new OTP.");
  }

  if (hashValue(otp) !== record.otpHash) {
    props.setProperty(key, JSON.stringify(record));
    throw new Error("Incorrect OTP. Please try again.");
  }

  props.deleteProperty(key);

  const existing = findRegistrationByEmail(email);
  if (existing) {
    return jsonResponse({
      success: false,
      alreadyRegistered: true,
      registrationId: existing.registrationId,
      message: "A registration already exists for this email address."
    });
  }

  const authToken = createAuthToken();
  const tokenKey = authTokenKey(authToken);
  props.setProperty(tokenKey, JSON.stringify({
    email: email,
    method: "otp",
    createdAt: Date.now(),
    expiresAt: Date.now() + CONFIG.AUTH_TOKEN_EXPIRY_MS
  }));

  return jsonResponse({
    success: true,
    verified: true,
    email: email,
    authToken: authToken,
    expiresIn: Math.floor(CONFIG.AUTH_TOKEN_EXPIRY_MS / 1000),
    message: "Email verified successfully."
  });
}

function handleGoogleAuth(data) {
  const credential = String(data.credential || "").trim();
  if (!credential) throw new Error("Google credential is missing.");

  const clientId = PropertiesService.getScriptProperties().getProperty(CONFIG.GOOGLE_CLIENT_ID_PROPERTY);
  if (!clientId) {
    throw new Error("Google Sign-In is not configured yet. Add GOOGLE_CLIENT_ID to Script Properties.");
  }

  const tokenInfoUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(credential);
  const response = UrlFetchApp.fetch(tokenInfoUrl, { muteHttpExceptions: true });
  const code = response.getResponseCode();

  if (code !== 200) throw new Error("Google sign-in verification failed.");

  let info;
  try { info = JSON.parse(response.getContentText()); } catch (_) { throw new Error("Invalid Google sign-in response."); }

  if (String(info.aud || "") !== String(clientId)) throw new Error("Google account verification failed.");
  if (String(info.iss || "") !== "https://accounts.google.com" && String(info.iss || "") !== "accounts.google.com") {
    throw new Error("Invalid Google token issuer.");
  }
  if (Number(info.exp || 0) * 1000 <= Date.now()) throw new Error("Google sign-in token has expired.");
  if (String(info.email_verified || "").toLowerCase() !== "true") throw new Error("Google email is not verified.");

  const email = normalizeEmail(info.email);
  validateEmail(email);

  const existing = findRegistrationByEmail(email);
  if (existing) {
    return jsonResponse({
      success: false,
      alreadyRegistered: true,
      registrationId: existing.registrationId,
      email: email,
      message: "A registration already exists for this Google account."
    });
  }

  const authToken = createAuthToken();
  PropertiesService.getScriptProperties().setProperty(
    authTokenKey(authToken),
    JSON.stringify({
      email: email,
      googleSub: String(info.sub || ""),
      method: "google",
      createdAt: Date.now(),
      expiresAt: Date.now() + CONFIG.AUTH_TOKEN_EXPIRY_MS
    })
  );

  return jsonResponse({
    success: true,
    verified: true,
    email: email,
    authToken: authToken,
    expiresIn: Math.floor(CONFIG.AUTH_TOKEN_EXPIRY_MS / 1000),
    message: "Google account verified successfully."
  });
}

function checkRegistrationJsonp(params) {
  const callback = params.callback;
  if (!callback || !/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) return textResponse("Invalid callback.");
  const email = normalizeEmail(params.email || "");
  let result = { success: true, registered: false };
  if (email) {
    const existing = findRegistrationByEmail(email);
    if (existing) result = { success: true, registered: true, registrationId: existing.registrationId };
  }
  return ContentService.createTextOutput(callback + "(" + JSON.stringify(result) + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function authConfigJsonp(params) {
  const callback = params.callback;
  if (!callback || !/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) return textResponse("Invalid callback.");
  const clientId = PropertiesService.getScriptProperties().getProperty(CONFIG.GOOGLE_CLIENT_ID_PROPERTY) || "";
  const result = { success: true, googleClientId: clientId, googleEnabled: Boolean(clientId) };
  return ContentService.createTextOutput(callback + "(" + JSON.stringify(result) + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function otpKey(email) { return "OTP_" + hashValue(normalizeEmail(email)); }
function authTokenKey(token) { return "AUTH_" + hashValue(String(token)); }
function hashValue(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  return bytes.map(b => ((b + 256) % 256).toString(16).padStart(2, "0")).join("");
}
function createAuthToken() {
  return Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
}

function getAuthSession(token) {
  if (!token) throw new Error("Authentication token is missing. Please verify your email again.");
  const props = PropertiesService.getScriptProperties();
  const key = authTokenKey(token);
  const raw = props.getProperty(key);
  if (!raw) throw new Error("Authentication session expired. Please verify your email again.");

  let session;
  try { session = JSON.parse(raw); } catch (_) { props.deleteProperty(key); throw new Error("Authentication session is invalid."); }

  if (Date.now() > Number(session.expiresAt || 0)) {
    props.deleteProperty(key);
    throw new Error("Authentication session expired. Please verify your email again.");
  }

  return session;
}

/* =========================================================
   REGISTRATION
========================================================= */

function handleRegistration(data) {
  const session = getAuthSession(String(data.authToken || data.verificationToken || ""));
  const leaderEmail = normalizeEmail(data.m1_email);

  if (leaderEmail !== normalizeEmail(session.email)) {
    throw new Error("The verified email must be the Team Leader's email address.");
  }

  const existing = findRegistrationByEmail(leaderEmail);
  if (existing) {
    throw new Error("This email has already been used for registration. Registration ID: " + existing.registrationId);
  }

  validateRegistration(data);

  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty("SPREADSHEET_ID");
  const folderId = props.getProperty("FOLDER_ID");
  if (!spreadsheetId || !folderId) throw new Error("Backend has not been initialized. Run setup() first.");

  const registrationId = generateRegistrationId();
  const receiptUrl = saveReceipt(data, registrationId, folderId);
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error("Registrations sheet not found.");

  ensureSubmissionTokenColumn(sheet);

  const row = [
    new Date(), registrationId, data.teamName || "", data.teamSize || "", data.collegeName || "",
    data.m1_name || "", data.m1_roll || "", data.m1_email || "", data.m1_phone || "", data.m1_year || "", data.m1_branch || "", data.m1_section || "",
    data.m2_name || "", data.m2_roll || "", data.m2_email || "", data.m2_phone || "", data.m2_year || "", data.m2_branch || "", data.m2_section || "",
    data.m3_name || "", data.m3_roll || "", data.m3_email || "", data.m3_phone || "", data.m3_year || "", data.m3_branch || "", data.m3_section || "",
    CONFIG.PAYMENT_FEE, data.utr || "", receiptUrl, "Pending", data.submissionToken || ""
  ];

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const headerValues = [
    "Timestamp", "Registration ID", "Team Name", "Team Size", "College Name",
    "Member 1 - Full Name", "Member 1 - Roll Number", "Member 1 - Email", "Member 1 - Mobile", "Member 1 - Year", "Member 1 - Branch", "Member 1 - Section",
    "Member 2 - Full Name", "Member 2 - Roll Number", "Member 2 - Email", "Member 2 - Mobile", "Member 2 - Year", "Member 2 - Branch", "Member 2 - Section",
    "Member 3 - Full Name", "Member 3 - Roll Number", "Member 3 - Email", "Member 3 - Mobile", "Member 3 - Year", "Member 3 - Branch", "Member 3 - Section",
    "Payment Amount", "UPI Transaction ID / UTR", "Payment Receipt", "Status", "Submission Token"
  ];
  const valuesByHeader = {};
  headerValues.forEach((h, i) => valuesByHeader[h] = row[i]);
  sheet.appendRow(headers.map(h => Object.prototype.hasOwnProperty.call(valuesByHeader, h) ? valuesByHeader[h] : ""));

  sendConfirmationEmails(data, registrationId);

  // Authentication token is one-registration-only.
  props.deleteProperty(authTokenKey(String(data.authToken || data.verificationToken || "")));

  return jsonResponse({ success: true, registrationId: registrationId, message: "Registration submitted successfully." });
}

function validateRegistration(data) {
  if (!data.teamName) throw new Error("Team name is required.");
  if (data.teamSize !== "2" && data.teamSize !== "3") throw new Error("Invalid team size. Select 2 or 3.");
  if (!data.collegeName) throw new Error("College name is required.");

  validateMember(data, 1);
  validateMember(data, 2);
  if (data.teamSize === "3") validateMember(data, 3);

  if (String(data.payAmount || "") !== String(CONFIG.PAYMENT_FEE)) throw new Error("Invalid payment amount. Registration fee is ₹300 per team.");
  if (!data.utr || !/^[A-Za-z0-9]{8,30}$/.test(String(data.utr).trim())) throw new Error("Invalid UPI Transaction ID / UTR.");
  if (!data.receiptBase64) throw new Error("Payment receipt is required.");
  if (!data.submissionToken) throw new Error("Submission token is missing. Please submit again.");

  const years = [data.m1_year, data.m2_year];
  if (data.teamSize === "3") years.push(data.m3_year);
  const allowedYears = ["2nd Year", "3rd Year", "4th Year"];
  if (years.some(y => !allowedYears.includes(String(y)))) throw new Error("Only 2nd Year, 3rd Year and 4th Year students are allowed.");
  if (years.filter(y => y === "4th Year").length > 1) throw new Error("A team can have a maximum of one 4th-year student.");

  const emails = [];
  const phones = [];
  const rolls = [];
  const count = data.teamSize === "3" ? 3 : 2;
  for (let i = 1; i <= count; i++) {
    const email = normalizeEmail(data["m" + i + "_email"]);
    const phone = String(data["m" + i + "_phone"]).trim();
    const roll = String(data["m" + i + "_roll"]).trim().toLowerCase();
    if (emails.includes(email)) throw new Error("Each team member must have a different email ID.");
    if (phones.includes(phone)) throw new Error("Each team member must have a different mobile number.");
    if (rolls.includes(roll)) throw new Error("Each team member must have a different roll number.");
    emails.push(email); phones.push(phone); rolls.push(roll);
  }

  // Prevent a previously registered participant from being added as member 2/3.
  emails.forEach(email => {
    const existing = findRegistrationByEmail(email);
    if (existing) throw new Error("A team member with email " + email + " is already registered under " + existing.registrationId + ".");
  });
}

function validateMember(data, number) {
  const fields = ["name", "roll", "email", "phone", "year", "branch", "section"];
  fields.forEach(field => {
    const key = "m" + number + "_" + field;
    if (!data[key] || String(data[key]).trim() === "") throw new Error(key + " is required.");
  });
  const phone = String(data["m" + number + "_phone"]).trim();
  if (!/^[0-9]{10}$/.test(phone)) throw new Error("Member " + number + " mobile number must contain 10 digits.");
  validateEmail(normalizeEmail(data["m" + number + "_email"]));
}

function validateEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""))) throw new Error("Please enter a valid email address.");
}

function normalizeEmail(email) { return String(email || "").trim().toLowerCase(); }

/* =========================================================
   DUPLICATE LOOKUP
========================================================= */

function findRegistrationByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty("SPREADSHEET_ID");
  if (!spreadsheetId) return null;

  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return null;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const emailColumns = ["Member 1 - Email", "Member 2 - Email", "Member 3 - Email"]
    .map(h => headers.indexOf(h) + 1)
    .filter(c => c > 0);
  const idColumn = headers.indexOf("Registration ID") + 1;
  if (!idColumn || !emailColumns.length) return null;

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < emailColumns.length; c++) {
      if (normalizeEmail(values[r][emailColumns[c] - 1]) === normalized) {
        return { registrationId: String(values[r][idColumn - 1] || "") };
      }
    }
  }
  return null;
}

/* =========================================================
   REGISTRATION ID LOOKUP
========================================================= */

function getRegistrationIdJsonp(params) {
  const callback = params.callback;
  if (!callback || !/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) return textResponse("Invalid callback.");
  const token = String(params.token || "").trim();
  const result = token ? findRegistrationByToken(token) : { success: false, message: "Registration ID not found yet." };
  return ContentService.createTextOutput(callback + "(" + JSON.stringify(result) + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function findRegistrationByToken(token) {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty("SPREADSHEET_ID");
  if (!spreadsheetId) return { success: false, message: "Backend has not been initialized." };

  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return { success: false, message: "Registration not found yet." };

  const tokenColumn = findHeaderColumn(sheet, "Submission Token");
  const idColumn = findHeaderColumn(sheet, "Registration ID");
  if (!tokenColumn || !idColumn) return { success: false, message: "Registration lookup columns are missing." };

  const tokens = sheet.getRange(2, tokenColumn, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < tokens.length; i++) {
    if (String(tokens[i][0]).trim() === token) {
      const registrationId = sheet.getRange(i + 2, idColumn).getDisplayValue();
      if (registrationId) return { success: true, registrationId: registrationId };
    }
  }
  return { success: false, message: "Registration ID not found yet." };
}

function ensureSubmissionTokenColumn(sheet) {
  if (!findHeaderColumn(sheet, "Submission Token")) sheet.getRange(1, sheet.getLastColumn() + 1).setValue("Submission Token");
}

function findHeaderColumn(sheet, headerName) {
  if (!sheet.getLastColumn()) return 0;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(v => String(v).trim());
  const index = headers.indexOf(headerName);
  return index === -1 ? 0 : index + 1;
}

/* =========================================================
   RECEIPT
========================================================= */

function saveReceipt(data, registrationId, folderId) {
  const base64 = String(data.receiptBase64 || "");
  if (base64.length > Math.ceil(CONFIG.MAX_FILE_SIZE / 0.72)) throw new Error("Payment receipt exceeds the 10 MB limit.");
  const bytes = Utilities.base64Decode(base64);
  if (bytes.length > CONFIG.MAX_FILE_SIZE) throw new Error("Payment receipt exceeds the 10 MB limit.");

  const allowed = ["image/jpeg", "image/png", "application/pdf"];
  const mimeType = String(data.receiptType || "").toLowerCase();
  if (!allowed.includes(mimeType)) throw new Error("Payment receipt must be JPG, PNG or PDF.");

  const originalName = String(data.receiptName || "payment-receipt");
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blob = Utilities.newBlob(bytes, mimeType, registrationId + "_" + safeName);
  return DriveApp.getFolderById(folderId).createFile(blob).getUrl();
}

/* =========================================================
   REGISTRATION ID
========================================================= */

function generateRegistrationId() {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty("SPREADSHEET_ID");
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(CONFIG.SHEET_NAME);
  const idColumn = findHeaderColumn(sheet, "Registration ID");
  if (!idColumn) throw new Error("Registration ID column not found.");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return "CODEX4-0001";

  const ids = sheet.getRange(2, idColumn, lastRow - 1, 1).getDisplayValues().flat();
  let maxNumber = 0;
  ids.forEach(id => {
    const match = String(id).match(/^CODEX4-(\d+)$/);
    if (match) maxNumber = Math.max(maxNumber, Number(match[1]));
  });
  return "CODEX4-" + String(maxNumber + 1).padStart(4, "0");
}

/* =========================================================
   EMAILS
========================================================= */

function otpEmailHtml(otp, email) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#0d1117;color:#f5f7fa;padding:28px;border-radius:14px">
    <div style="font-size:24px;font-weight:800;color:#39ff74">&lt;/&gt; CODEX 4.0</div>
    <p style="color:#9aa4b2">Email verification for registration</p>
    <p>Hello,</p>
    <p>Use the following one-time verification code for <b>${escapeHtml(email)}</b>:</p>
    <div style="font-size:36px;font-weight:900;letter-spacing:8px;text-align:center;padding:20px;background:#171d27;border:1px solid #2a3442;border-radius:12px;color:#39ff74">${otp}</div>
    <p style="color:#9aa4b2;font-size:13px">This code expires in 10 minutes. If you did not request CODEX 4.0 registration access, you can ignore this email.</p>
    <p style="font-size:12px;color:#667085">Coders' Club · GPREC</p>
  </div>`;
}

function sendConfirmationEmails(data, registrationId) {
  try {
    const emails = [];
    if (data.m1_email) emails.push(normalizeEmail(data.m1_email));
    if (data.m2_email) emails.push(normalizeEmail(data.m2_email));
    if (data.teamSize === "3" && data.m3_email) emails.push(normalizeEmail(data.m3_email));
    if (!emails.length) return;

    const subject = `CODEX 4.0 Registration Confirmation - [${registrationId}]`;
    const members = `
      <li><b>Leader:</b> ${escapeHtml(data.m1_name)} (${escapeHtml(data.m1_roll)})</li>
      <li><b>Member 2:</b> ${escapeHtml(data.m2_name)} (${escapeHtml(data.m2_roll)})</li>
      ${data.teamSize === "3" ? `<li><b>Member 3:</b> ${escapeHtml(data.m3_name)} (${escapeHtml(data.m3_roll)})</li>` : ""}`;

    const htmlBody = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0d0d0d;color:#f2f2f2;padding:30px;border-radius:12px">
        <div style="text-align:center;font-size:26px;font-weight:800;color:#39ff74">&lt;/&gt; CODEX 4.0</div>
        <p style="text-align:center;color:#999;font-size:12px">Inter-College Coding Event · Coders' Club</p>
        <div style="text-align:center;background:#171717;border:1px dashed #39ff74;padding:20px;border-radius:10px;margin:20px 0">
          <div style="font-size:11px;color:#999">REGISTRATION ID</div>
          <div style="font-size:32px;font-weight:900;color:#39ff74">${escapeHtml(registrationId)}</div>
          <div style="font-size:11px;color:#f59e0b">Payment Status: Under Review</div>
        </div>
        <p><b>Team:</b> ${escapeHtml(data.teamName)}</p>
        <p><b>College:</b> ${escapeHtml(data.collegeName)}</p>
        <p><b>Team Size:</b> ${escapeHtml(data.teamSize)} Members</p>
        <p><b>UPI UTR / Ref:</b> ${escapeHtml(data.utr)}</p>
        <hr style="border-color:#262626">
        <h4>Team Members</h4>
        <ul>${members}</ul>
        <p style="color:#777;font-size:11px;text-align:center">Please retain this email and Registration ID for event check-in.</p>
      </div>`;

    MailApp.sendEmail({ to: emails[0], cc: emails.slice(1).join(",") || undefined, subject: subject, htmlBody: htmlBody });
  } catch (emailErr) {
    Logger.log("Confirmation email could not be sent: " + emailErr.message);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function textResponse(text) {
  return ContentService.createTextOutput(String(text)).setMimeType(ContentService.MimeType.TEXT);
}
