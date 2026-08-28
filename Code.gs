const CONFIG = {
  EVENT_NAME: "CODEX 4.0",
  ORGANIZER: "Coders' Club",
  PAYMENT_FEE: 300,
  SPREADSHEET_NAME: "CODEX 4.0 - Responses",
  SHEET_NAME: "Registrations",
  DRIVE_FOLDER_NAME: "CODEX 4.0 - Payment Receipts",
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  SUPABASE_URL: "https://lrwrqerurimwzalhjffa.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_QRbFkE9mkgIljLF-1zMgGw_f4Ic5OBW"
};

function setup() {
  const p = PropertiesService.getScriptProperties();
  let id = p.getProperty("SPREADSHEET_ID");
  let ss;
  if (!id) { ss = SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME); id = ss.getId(); p.setProperty("SPREADSHEET_ID", id); }
  else ss = SpreadsheetApp.openById(id);

  let sh = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sh) { sh = ss.getSheets()[0]; sh.setName(CONFIG.SHEET_NAME); }

  const headers = [
    "Timestamp", "Registration ID", "Team Name", "Team Size", "College Name",
    "Member 1 - Full Name", "Member 1 - Roll Number", "Member 1 - Email", "Member 1 - Mobile", "Member 1 - Year", "Member 1 - Branch", "Member 1 - Section",
    "Member 2 - Full Name", "Member 2 - Roll Number", "Member 2 - Email", "Member 2 - Mobile", "Member 2 - Year", "Member 2 - Branch", "Member 2 - Section",
    "Member 3 - Full Name", "Member 3 - Roll Number", "Member 3 - Email", "Member 3 - Mobile", "Member 3 - Year", "Member 3 - Branch", "Member 3 - Section",
    "Payment Amount", "UPI Transaction ID / UTR", "Payment Receipt", "Status", "Submission Token"
  ];

  if (!sh.getLastColumn()) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  else {
    const old = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    const missing = headers.filter(h => !old.includes(h));
    if (missing.length) sh.getRange(1, old.length + 1, 1, missing.length).setValues([missing]);
  }

  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight("bold");

  let folderId = p.getProperty("FOLDER_ID");
  if (!folderId) { folderId = DriveApp.createFolder(CONFIG.DRIVE_FOLDER_NAME).getId(); p.setProperty("FOLDER_ID", folderId); }

  Logger.log("Sheet: " + ss.getUrl());
  Logger.log("Folder: " + DriveApp.getFolderById(folderId).getUrl());
}

function doGet(e) {
  const q = e && e.parameter ? e.parameter : {};
  const action = q.action || "";
  if (action === "getRegistrationId") return getRegistrationIdJsonp(q);
  if (action === "checkRegistration") return checkRegistrationJsonp(q);
  return jsonResponse({ success: true, message: "CODEX 4.0 backend is running." });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    if (!e || !e.postData || !e.postData.contents) return jsonResponse({ success: false, message: "No request data received." });
    let data;
    try { data = JSON.parse(e.postData.contents); }
    catch (_) { return jsonResponse({ success: false, message: "Invalid request data." }); }
    return handleRegistration(data);
  } catch (error) {
    console.error(error);
    return jsonResponse({ success: false, message: error.message || "Unable to process registration." });
  } finally { try { lock.releaseLock(); } catch (_) {} }
}

/* ===================== SUPABASE AUTH ===================== */
function getSupabaseUser(accessToken) {
  const token = String(accessToken || "").trim();
  if (!token) throw new Error("Authentication session is missing. Please sign in again.");

  const response = UrlFetchApp.fetch(CONFIG.SUPABASE_URL + "/auth/v1/user", {
    method: "get",
    muteHttpExceptions: true,
    headers: { "apikey": CONFIG.SUPABASE_PUBLISHABLE_KEY, "Authorization": "Bearer " + token }
  });

  if (response.getResponseCode() !== 200) throw new Error("Your authentication session is invalid or expired. Please sign in again.");

  let user;
  try { user = JSON.parse(response.getContentText()); }
  catch (_) { throw new Error("Unable to verify your authentication session."); }

  const email = normalizeEmail(user.email);
  validateEmail(email);
  return { id: String(user.id || ""), email: email };
}

function checkRegistrationJsonp(q) {
  const callback = q.callback;
  if (!isValidCallback(callback)) return textResponse("Invalid callback.");
  try {
    let email;
    // If an accessToken is provided, verify via Supabase (most secure)
    if (q.accessToken) {
      const user = getSupabaseUser(q.accessToken);
      email = user.email;
    } else if (q.email) {
      // Fallback: raw email lookup (less secure, but used for post-auth UX only)
      email = normalizeEmail(String(q.email));
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Invalid email address.");
      }
    } else {
      throw new Error("Authentication session or email is required.");
    }

    const existing = findRegistrationByEmail(email);
    return ContentService.createTextOutput(callback + "(" + JSON.stringify({
      success: true,
      exists: !!existing,
      registrationId: existing ? existing.registrationId : "",
      email: email,
      data: existing || null
    }) + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
  } catch (error) {
    return ContentService.createTextOutput(callback + "(" + JSON.stringify({
      success: false, message: error.message || "Unable to check registration status."
    }) + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

/* ===================== REGISTRATION ===================== */
function handleRegistration(data) {
  const user = getSupabaseUser(data.authToken || data.accessToken);
  const leaderEmail = normalizeEmail(data.m1_email);
  if (leaderEmail !== user.email) throw new Error("The authenticated email must be the Team Leader's email address.");

  const existing = findRegistrationByEmail(user.email);
  if (existing) throw new Error("This email has already been used for registration. Registration ID: " + existing.registrationId);

  validateRegistration(data);

  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty("SPREADSHEET_ID");
  const folderId = properties.getProperty("FOLDER_ID");
  if (!spreadsheetId || !folderId) throw new Error("Backend has not been initialized. Run setup() once in Apps Script.");

  const registrationId = generateRegistrationId();
  const receipt = saveReceipt(data, registrationId, folderId);
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error("Registrations sheet not found.");
  ensureSubmissionTokenColumn(sheet);

  const rowData = {
    "Timestamp": new Date(), "Registration ID": registrationId, "Team Name": data.teamName || "", "Team Size": data.teamSize || "", "College Name": data.collegeName || "",
    "Member 1 - Full Name": data.m1_name || "", "Member 1 - Roll Number": data.m1_roll || "", "Member 1 - Email": data.m1_email || "", "Member 1 - Mobile": data.m1_phone || "", "Member 1 - Year": data.m1_year || "", "Member 1 - Branch": data.m1_branch || "", "Member 1 - Section": data.m1_section || "",
    "Member 2 - Full Name": data.m2_name || "", "Member 2 - Roll Number": data.m2_roll || "", "Member 2 - Email": data.m2_email || "", "Member 2 - Mobile": data.m2_phone || "", "Member 2 - Year": data.m2_year || "", "Member 2 - Branch": data.m2_branch || "", "Member 2 - Section": data.m2_section || "",
    "Member 3 - Full Name": data.m3_name || "", "Member 3 - Roll Number": data.m3_roll || "", "Member 3 - Email": data.m3_email || "", "Member 3 - Mobile": data.m3_phone || "", "Member 3 - Year": data.m3_year || "", "Member 3 - Branch": data.m3_branch || "", "Member 3 - Section": data.m3_section || "",
    "Payment Amount": CONFIG.PAYMENT_FEE, "UPI Transaction ID / UTR": data.utr || "", "Payment Receipt": receipt, "Status": "Pending", "Submission Token": data.submissionToken || ""
  };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  sheet.appendRow(headers.map(header => Object.prototype.hasOwnProperty.call(rowData, header) ? rowData[header] : ""));
  sendConfirmationEmails(data, registrationId);

  return jsonResponse({ success: true, registrationId: registrationId, message: "Registration submitted successfully." });
}

function validateRegistration(data) {
  if (!data.teamName) throw new Error("Team name is required.");
  if (!["2", "3"].includes(String(data.teamSize))) throw new Error("Invalid team size. Select 2 or 3.");
  if (!data.collegeName) throw new Error("College name is required.");
  validateMember(data, 1); validateMember(data, 2); if (String(data.teamSize) === "3") validateMember(data, 3);
  if (String(data.payAmount || "") !== String(CONFIG.PAYMENT_FEE)) throw new Error("Invalid payment amount. Registration fee is ₹300 per team.");
  if (!data.utr || !/^[A-Za-z0-9]{8,30}$/.test(String(data.utr).trim())) throw new Error("Invalid UPI Transaction ID / UTR.");
  if (!data.receiptBase64) throw new Error("Payment receipt is required.");
  if (!data.submissionToken) throw new Error("Submission token is missing. Please submit again.");

  const years = [data.m1_year, data.m2_year];
  if (String(data.teamSize) === "3") years.push(data.m3_year);
  if (years.some(year => !["2nd Year", "3rd Year", "4th Year"].includes(String(year)))) throw new Error("Only 2nd Year, 3rd Year and 4th Year students are allowed.");
  if (years.filter(year => year === "4th Year").length > 1) throw new Error("A team can have a maximum of one 4th-year student.");

  const emails = [], phones = [], rolls = [], count = String(data.teamSize) === "3" ? 3 : 2;
  for (let i = 1; i <= count; i++) {
    const email = normalizeEmail(data["m" + i + "_email"]);
    const phone = String(data["m" + i + "_phone"] || "").trim();
    const roll = String(data["m" + i + "_roll"] || "").trim().toLowerCase();
    if (emails.includes(email)) throw new Error("Each team member must have a different email ID.");
    if (phones.includes(phone)) throw new Error("Each team member must have a different mobile number.");
    if (rolls.includes(roll)) throw new Error("Each team member must have a different roll number.");
    emails.push(email); phones.push(phone); rolls.push(roll);
    const existing = findRegistrationByEmail(email);
    if (existing) throw new Error("A team member with email " + email + " is already registered under " + existing.registrationId + ".");
  }
}

function validateMember(data, number) {
  ["name", "roll", "email", "phone", "year", "branch", "section"].forEach(field => {
    const key = "m" + number + "_" + field;
    if (!data[key] || String(data[key]).trim() === "") throw new Error(key + " is required.");
  });
  if (!/^\d{10}$/.test(String(data["m" + number + "_phone"]).trim())) throw new Error("Member " + number + " mobile number must contain 10 digits.");
  validateEmail(normalizeEmail(data["m" + number + "_email"]));
}

function findRegistrationByEmail(email) {
  const normalized = normalizeEmail(email);
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!normalized || !spreadsheetId) return null;
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return null;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const emailColumns = ["Member 1 - Email", "Member 2 - Email", "Member 3 - Email"].map(name => headers.indexOf(name) + 1).filter(index => index > 0);
  const registrationIdColumn = headers.indexOf("Registration ID") + 1;
  const teamNameColumn = headers.indexOf("Team Name") + 1;
  const teamSizeColumn = headers.indexOf("Team Size") + 1;
  const collegeNameColumn = headers.indexOf("College Name") + 1;
  const utrColumn = headers.indexOf("UPI Transaction ID / UTR") + 1;
  const statusColumn = headers.indexOf("Status") + 1;

  if (!registrationIdColumn) return null;

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  for (let row = 0; row < rows.length; row++) {
    for (const column of emailColumns) {
      if (normalizeEmail(rows[row][column - 1]) === normalized) {
        const getVal = (name) => {
          const idx = headers.indexOf(name);
          return idx >= 0 ? String(rows[row][idx] || "") : "";
        };

        return {
          registrationId: String(rows[row][registrationIdColumn - 1] || ""),
          teamName: teamNameColumn ? String(rows[row][teamNameColumn - 1] || "") : "",
          teamSize: teamSizeColumn ? String(rows[row][teamSizeColumn - 1] || "") : "",
          collegeName: collegeNameColumn ? String(rows[row][collegeNameColumn - 1] || "") : "",
          utr: utrColumn ? String(rows[row][utrColumn - 1] || "") : "",
          status: statusColumn ? String(rows[row][statusColumn - 1] || "Pending") : "Pending",
          m1_name: getVal("Member 1 - Full Name"),
          m1_roll: getVal("Member 1 - Roll Number"),
          m1_email: getVal("Member 1 - Email"),
          m1_phone: getVal("Member 1 - Mobile"),
          m1_year: getVal("Member 1 - Year"),
          m1_branch: getVal("Member 1 - Branch"),
          m1_section: getVal("Member 1 - Section"),
          m2_name: getVal("Member 2 - Full Name"),
          m2_roll: getVal("Member 2 - Roll Number"),
          m2_email: getVal("Member 2 - Email"),
          m2_phone: getVal("Member 2 - Mobile"),
          m2_year: getVal("Member 2 - Year"),
          m2_branch: getVal("Member 2 - Branch"),
          m2_section: getVal("Member 2 - Section"),
          m3_name: getVal("Member 3 - Full Name"),
          m3_roll: getVal("Member 3 - Roll Number"),
          m3_email: getVal("Member 3 - Email"),
          m3_phone: getVal("Member 3 - Mobile"),
          m3_year: getVal("Member 3 - Year"),
          m3_branch: getVal("Member 3 - Branch"),
          m3_section: getVal("Member 3 - Section")
        };
      }
    }
  }
  return null;
}

/* ===================== REGISTRATION ID LOOKUP ===================== */
function getRegistrationIdJsonp(q) {
  const callback = q.callback;
  if (!isValidCallback(callback)) return textResponse("Invalid callback.");
  let result = findRegistrationByToken(String(q.token || ""));
  if (!result.success && q.email) {
    const existing = findRegistrationByEmail(String(q.email));
    if (existing) {
      result = { success: true, registrationId: existing.registrationId, data: existing };
    }
  }
  return ContentService.createTextOutput(callback + "(" + JSON.stringify(result) + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function findRegistrationByToken(token) {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!spreadsheetId) return { success: false, message: "Backend has not been initialized." };
  if (!token) return { success: false, message: "Submission token is missing." };
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return { success: false, message: "Registration not found yet." };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const tokenColumn = headers.indexOf("Submission Token") + 1;
  const registrationIdColumn = headers.indexOf("Registration ID") + 1;
  if (!tokenColumn || !registrationIdColumn) return { success: false, message: "Lookup columns not found." };

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][tokenColumn - 1] || "") === token) return { success: true, registrationId: String(values[i][registrationIdColumn - 1] || "") };
  }
  return { success: false, message: "Registration ID is still being generated." };
}

/* ===================== PAYMENT RECEIPT ===================== */
function saveReceipt(data, registrationId, folderId) {
  const base64 = String(data.receiptBase64 || "");
  if (!base64) throw new Error("Payment receipt is missing.");
  const bytes = Utilities.base64Decode(base64);
  if (bytes.length > CONFIG.MAX_FILE_SIZE) throw new Error("Payment receipt must be 10MB or smaller.");

  const mimeType = String(data.receiptType || "application/octet-stream");
  if (!["image/jpeg", "image/png", "application/pdf"].includes(mimeType)) throw new Error("Payment receipt must be JPG, PNG or PDF.");

  const safeName = String(data.receiptName || "receipt").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const blob = Utilities.newBlob(bytes, mimeType, registrationId + "_" + safeName);
  return DriveApp.getFolderById(folderId).createFile(blob).getUrl();
}

/* ===================== EMAILS ===================== */
function sendConfirmationEmails(data, registrationId) {
  const recipients = new Set();
  const count = String(data.teamSize) === "3" ? 3 : 2;
  for (let i = 1; i <= count; i++) {
    const email = normalizeEmail(data["m" + i + "_email"]);
    if (email) recipients.add(email);
  }

  const subject = "CODEX 4.0 - Registration Received | " + registrationId;
  const body = [
    "Your CODEX 4.0 registration has been received.", "",
    "Registration ID: " + registrationId,
    "Team Name: " + (data.teamName || "-"),
    "College: " + (data.collegeName || "-"),
    "Team Size: " + (data.teamSize || "-") + " members",
    "Payment Status: Pending verification", "",
    "Please keep your Registration ID for future communication and on-spot check-in.", "",
    "Coders' Club - GPREC", "CODEX 4.0"
  ].join("\n");

  recipients.forEach(email => { try { MailApp.sendEmail(email, subject, body); } catch (error) { console.error(error); } });
}

/* ===================== UTILITIES ===================== */
function generateRegistrationId() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  const sheet = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId).getSheetByName(CONFIG.SHEET_NAME) : null;
  const prefix = "CODEX4-";

  for (let attempt = 0; attempt < 20; attempt++) {
    const id = prefix + Math.random().toString(36).slice(2, 7).toUpperCase();
    if (!sheet || sheet.getLastRow() < 2) return id;
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
    const idColumn = headers.indexOf("Registration ID") + 1;
    if (!idColumn) return id;
    const values = sheet.getRange(2, idColumn, sheet.getLastRow() - 1, 1).getValues().flat().map(String);
    if (!values.includes(id)) return id;
  }
  throw new Error("Unable to generate a unique Registration ID. Please try again.");
}

function ensureSubmissionTokenColumn(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  if (!headers.includes("Submission Token")) sheet.getRange(1, sheet.getLastColumn() + 1).setValue("Submission Token");
}

function normalizeEmail(email) { return String(email || "").trim().toLowerCase(); }
function validateEmail(email) { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""))) throw new Error("Please enter a valid email address."); }
function isValidCallback(callback) { return !!callback && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback); }
function jsonResponse(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function textResponse(message) { return ContentService.createTextOutput(String(message)).setMimeType(ContentService.MimeType.TEXT); }
