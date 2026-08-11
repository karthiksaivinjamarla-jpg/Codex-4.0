/**
 * CODEX 4.0 - Google Apps Script Backend
 * Netlify frontend -> Google Apps Script -> Google Sheets + Drive
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

/* =========================================================
   FIRST TIME SETUP
   Run setup() ONCE manually.
   It also upgrades an existing sheet by adding Submission Token.
   ========================================================= */

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
    "Status",
    "Submission Token"
  ];

  const lastColumn = sheet.getLastColumn();

  if (sheet.getLastRow() === 0 || lastColumn === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const existingHeaders = sheet
      .getRange(1, 1, 1, lastColumn)
      .getValues()[0]
      .map(String);

    // Add any missing headers at the end without disturbing existing data.
    const missing = headers.filter(h => !existingHeaders.includes(h));

    if (missing.length) {
      sheet
        .getRange(1, existingHeaders.length + 1, 1, missing.length)
        .setValues([missing]);
    }
  }

  sheet.setFrozenRows(1);
  sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .setFontWeight("bold");
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

/* =========================================================
   WEB APP
   ========================================================= */

function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const action = params.action || "";

  if (action === "getRegistrationId") {
    return getRegistrationIdJsonp(params);
  }

  return jsonResponse({
    success: true,
    message: "CODEX 4.0 backend is running."
  });
}

/* =========================================================
   RECEIVE REGISTRATION
   ========================================================= */

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

    const registrationId = generateRegistrationId();

    let receiptUrl = "";
    if (data.receiptBase64) {
      receiptUrl = saveReceipt(data, registrationId, folderId);
    }

    const sheet = SpreadsheetApp
      .openById(spreadsheetId)
      .getSheetByName(CONFIG.SHEET_NAME);

    if (!sheet) {
      throw new Error("Registrations sheet not found.");
    }

    ensureSubmissionTokenColumn(sheet);

    const row = [
      new Date(),
      registrationId,
      data.teamName || "",
      data.teamSize || "",
      data.collegeName || "",

      data.m1_name || "",
      data.m1_roll || "",
      data.m1_email || "",
      data.m1_phone || "",
      data.m1_year || "",
      data.m1_branch || "",
      data.m1_section || "",

      data.m2_name || "",
      data.m2_roll || "",
      data.m2_email || "",
      data.m2_phone || "",
      data.m2_year || "",
      data.m2_branch || "",
      data.m2_section || "",

      data.m3_name || "",
      data.m3_roll || "",
      data.m3_email || "",
      data.m3_phone || "",
      data.m3_year || "",
      data.m3_branch || "",
      data.m3_section || "",

      CONFIG.PAYMENT_FEE,
      data.utr || "",
      receiptUrl,
      "Pending",
      data.submissionToken || ""
    ];

    // Write by header mapping so an older sheet remains compatible.
    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0]
      .map(String);

    const valuesByHeader = {};
    const headerValues = [
      "Timestamp", "Registration ID", "Team Name", "Team Size", "College Name",
      "Member 1 - Full Name", "Member 1 - Roll Number", "Member 1 - Email",
      "Member 1 - Mobile", "Member 1 - Year", "Member 1 - Branch", "Member 1 - Section",
      "Member 2 - Full Name", "Member 2 - Roll Number", "Member 2 - Email",
      "Member 2 - Mobile", "Member 2 - Year", "Member 2 - Branch", "Member 2 - Section",
      "Member 3 - Full Name", "Member 3 - Roll Number", "Member 3 - Email",
      "Member 3 - Mobile", "Member 3 - Year", "Member 3 - Branch", "Member 3 - Section",
      "Payment Amount", "UPI Transaction ID / UTR", "Payment Receipt", "Status",
      "Submission Token"
    ];

    headerValues.forEach((header, i) => {
      valuesByHeader[header] = row[i];
    });

    const outputRow = headers.map(h =>
      Object.prototype.hasOwnProperty.call(valuesByHeader, h)
        ? valuesByHeader[h]
        : ""
    );

    sheet.appendRow(outputRow);

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
    } catch (e) {}
  }
}

/* =========================================================
   REGISTRATION ID LOOKUP
   ========================================================= */

function getRegistrationIdJsonp(params) {
  const callback = params.callback;

  if (!callback || !/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService
      .createTextOutput("Invalid callback.")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  const token = String(params.token || "").trim();

  let result = {
    success: false,
    message: "Registration ID not found yet."
  };

  if (token) {
    result = findRegistrationByToken(token);
  }

  return ContentService
    .createTextOutput(
      callback + "(" + JSON.stringify(result) + ");"
    )
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function findRegistrationByToken(token) {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty("SPREADSHEET_ID");

  if (!spreadsheetId) {
    return {
      success: false,
      message: "Backend has not been initialized."
    };
  }

  const sheet = SpreadsheetApp
    .openById(spreadsheetId)
    .getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet || sheet.getLastRow() < 2) {
    return {
      success: false,
      message: "Registration not found yet."
    };
  }

  const tokenColumn = findHeaderColumn(sheet, "Submission Token");
  const idColumn = findHeaderColumn(sheet, "Registration ID");

  if (!tokenColumn || !idColumn) {
    return {
      success: false,
      message: "Registration lookup columns are missing."
    };
  }

  const rowCount = sheet.getLastRow() - 1;

  const tokens = sheet
    .getRange(2, tokenColumn, rowCount, 1)
    .getValues();

  for (let i = 0; i < tokens.length; i++) {
    if (String(tokens[i][0]).trim() === token) {
      const registrationId = sheet
        .getRange(i + 2, idColumn)
        .getDisplayValue();

      if (registrationId) {
        return {
          success: true,
          registrationId: registrationId
        };
      }
    }
  }

  return {
    success: false,
    message: "Registration ID not found yet."
  };
}

function ensureSubmissionTokenColumn(sheet) {
  if (!findHeaderColumn(sheet, "Submission Token")) {
    sheet
      .getRange(1, sheet.getLastColumn() + 1)
      .setValue("Submission Token");
  }
}

function findHeaderColumn(sheet, headerName) {
  if (sheet.getLastColumn() === 0) return 0;

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(v => String(v).trim());

  const index = headers.indexOf(headerName);
  return index === -1 ? 0 : index + 1;
}

/* =========================================================
   VALIDATION
   ========================================================= */

function validateRegistration(data) {
  if (!data.teamName) {
    throw new Error("Team name is required.");
  }

  if (data.teamSize !== "2" && data.teamSize !== "3") {
    throw new Error("Invalid team size. Select 2 or 3.");
  }

  if (!data.collegeName) {
    throw new Error("College name is required.");
  }

  validateMember(data, 1);
  validateMember(data, 2);

  if (data.teamSize === "3") {
    validateMember(data, 3);
  }

  const expectedFee = String(CONFIG.PAYMENT_FEE);
  if (String(data.payAmount || "") !== expectedFee) {
    throw new Error("Invalid payment amount. Registration fee is ₹300 per team.");
  }

  if (!data.utr) {
    throw new Error("UPI Transaction ID / UTR is required.");
  }

  if (!/^[A-Za-z0-9]{8,30}$/.test(String(data.utr).trim())) {
    throw new Error("Invalid UPI Transaction ID / UTR.");
  }

  if (!data.receiptBase64) {
    throw new Error("Payment receipt is required.");
  }

  if (!data.submissionToken) {
    throw new Error("Submission token is missing. Please submit again.");
  }

  const years = [data.m1_year, data.m2_year];

  if (data.teamSize === "3") {
    years.push(data.m3_year);
  }

  const allowedYears = ["2nd Year", "3rd Year", "4th Year"];

  if (years.some(y => !allowedYears.includes(String(y)))) {
    throw new Error(
      "Only 2nd Year, 3rd Year and 4th Year students are allowed."
    );
  }

  const fourthYearCount = years.filter(y => y === "4th Year").length;

  if (fourthYearCount > 1) {
    throw new Error(
      "A team can have a maximum of one 4th-year student."
    );
  }
}

function validateMember(data, number) {
  const fields = [
    `m${number}_name`,
    `m${number}_roll`,
    `m${number}_email`,
    `m${number}_phone`,
    `m${number}_year`,
    `m${number}_branch`,
    `m${number}_section`
  ];

  fields.forEach(field => {
    if (!data[field] || String(data[field]).trim() === "") {
      throw new Error(`${field} is required.`);
    }
  });

  const phone = String(data[`m${number}_phone`]).trim();
  if (!/^[0-9]{10}$/.test(phone)) {
    throw new Error(`Member ${number} mobile number must contain 10 digits.`);
  }

  const email = String(data[`m${number}_email`]).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`Invalid email address for Member ${number}.`);
  }
}

/* =========================================================
   RECEIPT -> GOOGLE DRIVE
   ========================================================= */

function saveReceipt(data, registrationId, folderId) {
  const base64 = String(data.receiptBase64 || "");

  const approximateSize = Math.floor(base64.length * 0.75);

  if (approximateSize > CONFIG.MAX_FILE_SIZE) {
    throw new Error("Payment receipt exceeds the 10 MB limit.");
  }

  const bytes = Utilities.base64Decode(base64);
  const mimeType = data.receiptType || "application/octet-stream";
  const originalName = data.receiptName || "payment-receipt";

  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = registrationId + "_" + safeName;

  const blob = Utilities.newBlob(bytes, mimeType, filename);

  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(blob);

  return file.getUrl();
}

/* =========================================================
   REGISTRATION ID
   ========================================================= */

function generateRegistrationId() {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty("SPREADSHEET_ID");

  const sheet = SpreadsheetApp
    .openById(spreadsheetId)
    .getSheetByName(CONFIG.SHEET_NAME);

  const idColumn = findHeaderColumn(sheet, "Registration ID");

  if (!idColumn) {
    throw new Error("Registration ID column not found.");
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return "CODEX4-0001";
  }

  const ids = sheet
    .getRange(2, idColumn, lastRow - 1, 1)
    .getDisplayValues()
    .flat();

  let maxNumber = 0;

  ids.forEach(id => {
    const match = String(id).match(/^CODEX4-(\d+)$/);
    if (match) {
      maxNumber = Math.max(maxNumber, Number(match[1]));
    }
  });

  return "CODEX4-" + String(maxNumber + 1).padStart(4, "0");
}

/* =========================================================
   JSON RESPONSE
   ========================================================= */

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
