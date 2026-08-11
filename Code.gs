/**
 * CODEX 4.0
 * Google Apps Script Backend
 *
 * Frontend: Netlify
 * Storage: Google Sheets + Google Drive
 */

const CONFIG = {
  EVENT_NAME: "CODEX 4.0",
  ORGANIZER: "Coders' Club",
  PAYMENT_FEE: 300,
  SPREADSHEET_NAME: "CODEX 4.0 - Responses",
  SHEET_NAME: "Registrations",
  DRIVE_FOLDER_NAME: "CODEX 4.0 - Payment Receipts",
  MAX_FILE_SIZE: 10 * 1024 * 1024
};

const BASE_HEADERS = [
  "Timestamp",
  "Registration ID",
  "Team Name",
  "Team Size",
  "College Name",

  "Member 1 - Full Name",
  "Member 1 - Roll Number",
  "Member 1 - Email",
  "Member 1 - Mobile",
  "Member 1 - Year",
  "Member 1 - Branch",
  "Member 1 - Section",

  "Member 2 - Full Name",
  "Member 2 - Roll Number",
  "Member 2 - Email",
  "Member 2 - Mobile",
  "Member 2 - Year",
  "Member 2 - Branch",
  "Member 2 - Section",

  "Member 3 - Full Name",
  "Member 3 - Roll Number",
  "Member 3 - Email",
  "Member 3 - Mobile",
  "Member 3 - Year",
  "Member 3 - Branch",
  "Member 3 - Section",

  "Payment Amount",
  "UPI Transaction ID / UTR",
  "Payment Receipt",
  "Payment Status",
  "Submission Token"
];

/**
 * Run setup() once manually after replacing Code.gs.
 * It creates storage if needed and upgrades an existing sheet header
 * by adding any missing columns.
 */
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

  ensureHeaders(sheet);

  let folderId = props.getProperty("FOLDER_ID");

  if (!folderId) {
    const folder = DriveApp.createFolder(CONFIG.DRIVE_FOLDER_NAME);
    folderId = folder.getId();
    props.setProperty("FOLDER_ID", folderId);
  }

  Logger.log("CODEX 4.0 SETUP COMPLETE");
  Logger.log("Google Sheet: " + spreadsheet.getUrl());
  Logger.log("Google Drive Folder: " + DriveApp.getFolderById(folderId).getUrl());
}

/**
 * JSON GET health check and JSONP registration-ID lookup.
 */
function doGet(e) {
  const params = (e && e.parameter) || {};

  if (params.action === "getRegistrationId") {
    return registrationIdJsonp(params.token, params.callback);
  }

  return jsonResponse({
    success: true,
    message: "CODEX 4.0 backend is running."
  });
}

/**
 * Receives registration data from Netlify.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({
        success: false,
        message: "No registration data received."
      });
    }

    let data;

    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      return jsonResponse({
        success: false,
        message: "Invalid registration data."
      });
    }

    const props = PropertiesService.getScriptProperties();
    const spreadsheetId = props.getProperty("SPREADSHEET_ID");
    const folderId = props.getProperty("FOLDER_ID");

    if (!spreadsheetId || !folderId) {
      throw new Error("Backend has not been initialized. Run setup() first.");
    }

    validateRegistration(data);

    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);

    if (!sheet) throw new Error("Registrations sheet not found.");

    ensureHeaders(sheet);

    // Prevent duplicate POSTs for the same browser submission.
    const existing = findByToken(sheet, data.submissionToken);
    if (existing) {
      return jsonResponse({
        success: true,
        registrationId: existing.registrationId,
        message: "Registration already received."
      });
    }

    // Registration ID is created only here and saved with the submission token.
    const registrationId = generateRegistrationId(sheet);

    const receiptUrl = saveReceipt(
      data,
      registrationId,
      folderId
    );

    const row = [
      new Date(),
      registrationId,
      clean(data.teamName),
      data.teamSize,
      clean(data.collegeName),

      clean(data.m1_name),
      clean(data.m1_roll),
      clean(data.m1_email),
      clean(data.m1_phone),
      clean(data.m1_year),
      clean(data.m1_branch),
      clean(data.m1_section),

      clean(data.m2_name),
      clean(data.m2_roll),
      clean(data.m2_email),
      clean(data.m2_phone),
      clean(data.m2_year),
      clean(data.m2_branch),
      clean(data.m2_section),

      data.teamSize === "3" ? clean(data.m3_name) : "",
      data.teamSize === "3" ? clean(data.m3_roll) : "",
      data.teamSize === "3" ? clean(data.m3_email) : "",
      data.teamSize === "3" ? clean(data.m3_phone) : "",
      data.teamSize === "3" ? clean(data.m3_year) : "",
      data.teamSize === "3" ? clean(data.m3_branch) : "",
      data.teamSize === "3" ? clean(data.m3_section) : "",

      CONFIG.PAYMENT_FEE,
      clean(data.utr),
      receiptUrl,
      "Pending",
      data.submissionToken
    ];

    sheet.appendRow(row);

    return jsonResponse({
      success: true,
      registrationId: registrationId,
      message: "Registration submitted successfully."
    });

  } catch (error) {
    console.error(error);

    return jsonResponse({
      success: false,
      message: error.message || "Unable to process registration."
    });

  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}

/**
 * Validates all rules independently of frontend JavaScript.
 */
function validateRegistration(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid registration data.");
  }

  if (!clean(data.teamName)) {
    throw new Error("Team name is required.");
  }

  if (data.teamSize !== "2" && data.teamSize !== "3") {
    throw new Error("Team size must be 2 or 3 members.");
  }

  if (!clean(data.collegeName)) {
    throw new Error("College name is required.");
  }

  validateMember(data, 1);
  validateMember(data, 2);

  if (data.teamSize === "3") {
    validateMember(data, 3);
  }

  const years = [
    clean(data.m1_year),
    clean(data.m2_year)
  ];

  if (data.teamSize === "3") {
    years.push(clean(data.m3_year));
  }

  const allowedYears = ["2nd Year", "3rd Year", "4th Year"];

  if (years.some(y => allowedYears.indexOf(y) === -1)) {
    throw new Error("Only 2nd Year, 3rd Year and 4th Year students are eligible.");
  }

  const fourthYearCount = years.filter(y => y === "4th Year").length;

  if (fourthYearCount > 1) {
    throw new Error("A team can have a maximum of one 4th-year student.");
  }

  // Fixed amount: never trust a participant-supplied amount.
  if (Number(data.payAmount) !== CONFIG.PAYMENT_FEE) {
    throw new Error("Invalid payment amount.");
  }

  const utr = clean(data.utr);

  if (!utr) {
    throw new Error("UPI Transaction ID / UTR is required.");
  }

  if (!/^[A-Za-z0-9]{8,30}$/.test(utr)) {
    throw new Error("Invalid UPI Transaction ID / UTR.");
  }

  if (!data.receiptBase64) {
    throw new Error("Payment receipt is required.");
  }

  if (!data.submissionToken || !/^[A-Za-z0-9_-]{16,100}$/.test(data.submissionToken)) {
    throw new Error("Invalid submission token.");
  }

  validateReceiptSize(data.receiptBase64);
}

/**
 * Member-level validation.
 */
function validateMember(data, number) {
  const prefix = "m" + number + "_";

  const fields = [
    "name",
    "roll",
    "email",
    "phone",
    "year",
    "branch",
    "section"
  ];

  fields.forEach(field => {
    if (!clean(data[prefix + field])) {
      throw new Error("Member " + number + ": " + field + " is required.");
    }
  });

  const phone = clean(data[prefix + "phone"]);
  if (!/^[0-9]{10}$/.test(phone)) {
    throw new Error("Member " + number + " mobile number must contain 10 digits.");
  }

  const email = clean(data[prefix + "email"]);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email address for Member " + number + ".");
  }
}

/**
 * Receipt size check.
 */
function validateReceiptSize(base64) {
  const approximateSize = Math.floor(base64.length * 0.75);

  if (approximateSize > CONFIG.MAX_FILE_SIZE) {
    throw new Error("Payment receipt exceeds the 10MB limit.");
  }
}

/**
 * Saves receipt as RegistrationID_originalfilename.
 */
function saveReceipt(data, registrationId, folderId) {
  validateReceiptSize(data.receiptBase64);

  const bytes = Utilities.base64Decode(data.receiptBase64);

  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "application/pdf"
  ];

  const mimeType = data.receiptType || "application/octet-stream";

  if (allowedMimeTypes.indexOf(mimeType) === -1) {
    throw new Error("Unsupported payment receipt type.");
  }

  const originalName = clean(data.receiptName) || "payment-receipt";
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = registrationId + "_" + safeName;

  const blob = Utilities.newBlob(
    bytes,
    mimeType,
    filename
  );

  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(blob);

  return file.getUrl();
}

/**
 * Registration ID format:
 * CDX26-0001, CDX26-0002, ...
 */
function generateRegistrationId(sheet) {
  const lastRow = sheet.getLastRow();
  const nextNumber = Math.max(1, lastRow);

  return "CDX26-" + String(nextNumber).padStart(4, "0");
}

/**
 * Finds an already submitted token to prevent duplicate rows.
 */
function findByToken(sheet, token) {
  if (!token || sheet.getLastRow() < 2) return null;

  const headers = getHeaders(sheet);
  const tokenColumn = headers.indexOf("Submission Token") + 1;
  const idColumn = headers.indexOf("Registration ID") + 1;

  if (!tokenColumn || !idColumn) return null;

  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
    .getValues();

  for (let i = 0; i < values.length; i++) {
    if (String(values[i][tokenColumn - 1]) === String(token)) {
      return {
        registrationId: values[i][idColumn - 1]
      };
    }
  }

  return null;
}

/**
 * JSONP endpoint used only to retrieve the ID for the submission token.
 */
function registrationIdJsonp(token, callback) {
  if (!token || !callback) {
    return jsonResponse({
      success: false,
      message: "Missing token or callback."
    });
  }

  // Callback must be a simple JS identifier generated by our frontend.
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(callback)) {
    return jsonResponse({
      success: false,
      message: "Invalid callback."
    });
  }

  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty("SPREADSHEET_ID");

  if (!spreadsheetId) {
    return jsonpResponse(callback, {
      success: false,
      message: "Backend is not initialized."
    });
  }

  const sheet = SpreadsheetApp
    .openById(spreadsheetId)
    .getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    return jsonpResponse(callback, {
      success: false,
      message: "Registrations sheet not found."
    });
  }

  const result = findByToken(sheet, token);

  if (!result) {
    return jsonpResponse(callback, {
      success: false,
      message: "Registration not found yet."
    });
  }

  return jsonpResponse(callback, {
    success: true,
    registrationId: result.registrationId
  });
}

/**
 * Makes sure existing sheets have the latest required headers.
 */
function ensureHeaders(sheet) {
  const existingLastColumn = sheet.getLastColumn();

  if (existingLastColumn === 0) {
    sheet.getRange(1, 1, 1, BASE_HEADERS.length).setValues([BASE_HEADERS]);
  } else {
    const currentHeaders = getHeaders(sheet);
    const missing = BASE_HEADERS.filter(h => currentHeaders.indexOf(h) === -1);

    if (missing.length > 0) {
      sheet
        .getRange(1, existingLastColumn + 1, 1, missing.length)
        .setValues([missing]);
    }
  }

  sheet.setFrozenRows(1);
  sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .setFontWeight("bold");
  sheet.autoResizeColumns(1, sheet.getLastColumn());
}

function getHeaders(sheet) {
  if (sheet.getLastColumn() === 0) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function clean(value) {
  return value === null || value === undefined
    ? ""
    : String(value).trim();
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonpResponse(callback, data) {
  return ContentService
    .createTextOutput(callback + "(" + JSON.stringify(data) + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
