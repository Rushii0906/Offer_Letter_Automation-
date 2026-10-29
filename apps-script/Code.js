
/**
 * Marathi Offer Letter Automation
 * Phase 1: Candidate Data Validation
 *
 * Features:
 * - Checks spreadsheet and Candidates sheet
 * - Validates required column headers
 * - Detects duplicate headers and Candidate IDs
 * - Validates candidate details and email format
 * - Applies a default joining date when blank
 * - Reports valid, invalid, and skipped rows
 *
 * SAFETY:
 * - Does not generate PDFs
 * - Does not send emails
 * - Does not modify spreadsheet data
 */

const CONFIG = {
  SHEET_NAME: "Candidates",
  TEMPLATE_DOC_ID: "1Wh-m7bEZbDOApuRzogmQZoBuHhAvg4u6n6ioqrWvOuA",
  OUTPUT_FOLDER_ID: "",
  OUTPUT_FOLDER_NAME: "Offer Letter PDFs - TEST",
  DEFAULT_JOINING_DATE: "2026-10-01",
  OFFER_DATE: "2026-10-29",
  MONTHLY_SALARY: "18,000",
  WORKING_HOURS: "8",
  PROBATION_MONTHS: "3",
  CONTRACT_DURATION: "11 months",
  NOTICE_DAYS: "30",
  CANDIDATE_ADDRESS: "To be added",
  COMPANY_NAME: "Sarthak Management Services LLP",
  TEST_MODE: true,
  SEND_EMAILS: false
};

function testCandidateData() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error(
      "No spreadsheet is connected. Open Apps Script from your Google Sheet."
    );
  }

  const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    throw new Error(
      'Sheet "' + CONFIG.SHEET_NAME + '" was not found.'
    );
  }

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    Logger.log("No candidate records found.");
    Logger.log("Valid records: 0");
    Logger.log("Invalid records: 0");
    Logger.log("Skipped empty rows: 0");
    Logger.log("Emails sent: 0");
    return;
  }

  // Normalize headers by trimming surrounding spaces.
  const headers = values[0].map(
    header => String(header).trim()
  );

  // Check for empty or duplicate header names.
  const emptyHeaderColumns = [];

  headers.forEach((header, i) => {
    if (!header) {
      emptyHeaderColumns.push(i + 1);
    }
  });

  if (emptyHeaderColumns.length > 0) {
    throw new Error(
      "Empty header(s) found in column(s): " +
      emptyHeaderColumns.join(", ")
    );
  }

  const seenHeaders = new Set();
  const duplicateHeaders = new Set();

  headers.forEach(header => {
    if (seenHeaders.has(header)) {
      duplicateHeaders.add(header);
    }
    seenHeaders.add(header);
  });

  if (duplicateHeaders.size > 0) {
    throw new Error(
      "Duplicate column headers: " +
      Array.from(duplicateHeaders).join(", ")
    );
  }

  // Confirm all required columns exist.
  const requiredColumns = [
    "Candidate ID",
    "Name",
    "Designation",
    "Location",
    "Email",
    "Joining Date"
  ];

  const missingColumns = requiredColumns.filter(
    column => !headers.includes(column)
  );

  if (missingColumns.length > 0) {
    throw new Error(
      "Missing columns: " + missingColumns.join(", ")
    );
  }

  // Map column names to their indexes.
  const index = {};

  headers.forEach((header, i) => {
    index[header] = i;
  });

  const timezone = spreadsheet.getSpreadsheetTimeZone();

  // Parse the default joining date in the spreadsheet timezone.
  const defaultJoiningDate = Utilities.parseDate(
    CONFIG.DEFAULT_JOINING_DATE,
    timezone,
    "yyyy-MM-dd"
  );

  if (isNaN(defaultJoiningDate.getTime())) {
    throw new Error(
      "Invalid DEFAULT_JOINING_DATE in CONFIG."
    );
  }

  // First pass: count Candidate ID occurrences.
  // All rows sharing a duplicate ID will be marked invalid.
  const idCounts = new Map();

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    const candidateId = String(
      row[index["Candidate ID"]] == null
        ? ""
        : row[index["Candidate ID"]]
    ).trim();

    const isEmpty = isCompletelyEmptyRow_(
      row,
      requiredColumns.map(column => index[column])
    );

    if (!isEmpty && candidateId) {
      idCounts.set(
        candidateId,
        (idCounts.get(candidateId) || 0) + 1
      );
    }
  }

  let valid = 0;
  let invalid = 0;
  let skipped = 0;

  Logger.log("========== VALIDATION START ==========");
  Logger.log("Sheet: " + CONFIG.SHEET_NAME);
  Logger.log("Spreadsheet timezone: " + timezone);
  Logger.log(
    "Default joining date: " +
    Utilities.formatDate(
      defaultJoiningDate,
      timezone,
      CONFIG.DATE_FORMAT
    )
  );

  // Second pass: validate every candidate.
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowNumber = i + 1;

    // Read only the columns needed for validation.
    const candidateId = String(
      row[index["Candidate ID"]] == null
        ? ""
        : row[index["Candidate ID"]]
    ).trim();

    const name = String(
      row[index["Name"]] == null
        ? ""
        : row[index["Name"]]
    ).trim();

    const designation = String(
      row[index["Designation"]] == null
        ? ""
        : row[index["Designation"]]
    ).trim();

    const location = String(
      row[index["Location"]] == null
        ? ""
        : row[index["Location"]]
    ).trim();

    const email = String(
      row[index["Email"]] == null
        ? ""
        : row[index["Email"]]
    ).trim();

    const joiningValue = row[index["Joining Date"]];

    // Ignore rows where all required fields are empty.
    if (
      isCompletelyEmptyRow_(
        row,
        requiredColumns.map(column => index[column])
      )
    ) {
      skipped++;
      continue;
    }

    const errors = [];

    if (!candidateId) {
      errors.push("Missing Candidate ID");
    } else if (idCounts.get(candidateId) > 1) {
      errors.push("Duplicate Candidate ID");
    }

    if (!name) {
      errors.push("Missing Name");
    }

    if (!designation) {
      errors.push("Missing Designation");
    }

    if (!location) {
      errors.push("Missing Location");
    }

    // Basic email format validation.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Invalid Email");
    }

    // Determine the effective joining date.
    let effectiveDate = null;

    if (
      joiningValue === "" ||
      joiningValue === null ||
      joiningValue === undefined
    ) {
      effectiveDate = new Date(defaultJoiningDate.getTime());
    } else {
      effectiveDate = parseJoiningDate_(
        joiningValue,
        timezone
      );
    }

    if (
      !effectiveDate ||
      isNaN(effectiveDate.getTime())
    ) {
      errors.push("Invalid Joining Date");
    }

    if (errors.length > 0) {
      invalid++;

      Logger.log(
        "ROW " + rowNumber +
        " | " + (candidateId || "(no ID)") +
        " | INVALID: " + errors.join("; ")
      );

      continue;
    }

    valid++;

    Logger.log(
      "ROW " + rowNumber +
      " | " + candidateId +
      " | " + name +
      " | " + designation +
      " | " + location +
      " | " + email +
      " | Joining Date: " +
      Utilities.formatDate(
        effectiveDate,
        timezone,
        CONFIG.DATE_FORMAT
      ) +
      (
        joiningValue === "" ||
        joiningValue === null ||
        joiningValue === undefined
          ? " (default applied)"
          : ""
      )
    );
  }

  Logger.log("========== TEST SUMMARY ==========");
  Logger.log("Total data rows: " + (values.length - 1));
  Logger.log("Valid records: " + valid);
  Logger.log("Invalid records: " + invalid);
  Logger.log("Skipped empty rows: " + skipped);
  Logger.log("Emails sent: 0");
  Logger.log("PDFs generated: 0");
  Logger.log("========== VALIDATION COMPLETE ==========");
}


/**
 * Returns true when all required candidate fields are blank.
 */
function isCompletelyEmptyRow_(row, requiredIndexes) {
  return requiredIndexes.every(index => {
    const value = row[index];

    return (
      value === "" ||
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "")
    );
  });
}


/**
 * Parses a joining date.
 *
 * Preferred input: a real Google Sheets date cell.
 * Supported text inputs:
 * - yyyy-MM-dd
 * - dd-MM-yyyy
 * - dd/MM/yyyy
 * - dd-MMM-yyyy (for example, 15-Oct-2026)
 *
 * Ambiguous date strings are not guessed.
 */
function parseJoiningDate_(value, timezone) {
  // Google Sheets date cells are normally returned as Date objects.
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return null;
    }

    // Use the spreadsheet's calendar date, avoiding a time-of-day shift.
    const dateText = Utilities.formatDate(
      value,
      timezone,
      "yyyy-MM-dd"
    );

    return Utilities.parseDate(
      dateText,
      timezone,
      "yyyy-MM-dd"
    );
  }

  // Reject unexpected types such as numeric serial values or booleans.
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  if (!text) {
    return null;
  }

  let match;

  // yyyy-MM-dd
  match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    return parseStrictDate_(
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
      timezone
    );
  }

  // dd-MM-yyyy or dd/MM/yyyy
  match = text.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);

  if (match) {
    return parseStrictDate_(
      Number(match[3]),
      Number(match[2]),
      Number(match[1]),
      timezone
    );
  }

  // dd-MMM-yyyy, e.g. 15-Oct-2026
  match = text.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);

  if (match) {
    const months = {
      jan: 1, feb: 2, mar: 3, apr: 4,
      may: 5, jun: 6, jul: 7, aug: 8,
      sep: 9, oct: 10, nov: 11, dec: 12
    };

    const month = months[match[2].toLowerCase()];

    if (!month) {
      return null;
    }

    return parseStrictDate_(
      Number(match[3]),
      month,
      Number(match[1]),
      timezone
    );
  }

  // Unknown or ambiguous format: reject instead of guessing.
  return null;
}


/**
 * Constructs a date and verifies that the calendar components match.
 * This prevents impossible dates such as 31-Feb-2026 from rolling over.
 */
function parseStrictDate_(year, month, day, timezone) {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 1900 ||
    year > 2100 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const dateText =
    String(year).padStart(4, "0") + "-" +
    String(month).padStart(2, "0") + "-" +
    String(day).padStart(2, "0");

  try {
    const date = Utilities.parseDate(
      dateText,
      timezone,
      "yyyy-MM-dd"
    );

    const roundTrip = Utilities.formatDate(
      date,
      timezone,
      "yyyy-MM-dd"
    );

    return roundTrip === dateText ? date : null;
  } catch (error) {
    return null;
  }
}
