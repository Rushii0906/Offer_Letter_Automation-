
/**
 * Marathi Offer Letter Automation
 * Phase 2: Generate test offer-letter PDFs
 *
 * Safety:
 * - TEST_MODE is true
 * - SEND_EMAILS is false
 * - No candidate emails are sent
 */

const PDF_CONFIG = {
  SHEET_NAME: "Candidates",

  TEMPLATE_DOC_ID:
    "1iYEfXmBQ0zo6ucqnu2Z3mDv4jfuyMe-PGVuTqFz9tZo",

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


/**
 * Step 1: Test Google Docs authorization.
 * Run this function first.
 * It does not create PDFs or send emails.
 */
function testGoogleDocsAuthorization() {
  const doc = DocumentApp.openById(
    PDF_CONFIG.TEMPLATE_DOC_ID
  );

  Logger.log(
    "Google Docs access successful: " + doc.getName()
  );
}


/**
 * Step 2: Generate test PDFs for valid candidates.
 * Invalid candidates are skipped.
 * No emails are sent.
 */
function generateTestOfferLetterPDFs() {
  if (
    PDF_CONFIG.TEST_MODE !== true ||
    PDF_CONFIG.SEND_EMAILS !== false
  ) {
    throw new Error(
      "Safety check failed. Keep TEST_MODE true and SEND_EMAILS false."
    );
  }

  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error(
      "No spreadsheet connected. Open this script from your Google Sheet."
    );
  }

  const sheet = spreadsheet.getSheetByName(
    PDF_CONFIG.SHEET_NAME
  );

  if (!sheet) {
    throw new Error(
      'Sheet "' + PDF_CONFIG.SHEET_NAME + '" not found.'
    );
  }

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    Logger.log("No candidate records found.");
    return;
  }

  const headers = values[0].map(
    header => String(header).trim()
  );

  const requiredHeaders = [
    "Candidate ID",
    "Name",
    "Designation",
    "Location",
    "Email",
    "Joining Date"
  ];

  const missingHeaders = requiredHeaders.filter(
    header => !headers.includes(header)
  );

  if (missingHeaders.length > 0) {
    throw new Error(
      "Missing columns: " + missingHeaders.join(", ")
    );
  }

  const headerSet = new Set(headers);

  if (headerSet.size !== headers.length) {
    throw new Error("Duplicate column headers detected.");
  }

  const index = {};

  headers.forEach((header, i) => {
    index[header] = i;
  });

  const timezone =
    spreadsheet.getSpreadsheetTimeZone();

  // Check the template and required access.
  const templateFile = DriveApp.getFileById(
    PDF_CONFIG.TEMPLATE_DOC_ID
  );

  if (templateFile.getMimeType() !== MimeType.GOOGLE_DOCS) {
    throw new Error(
      "The template must be a Google Docs document."
    );
  }

  // Use an existing folder with this name, or create one.
  const folderIterator = DriveApp.getFoldersByName(
    PDF_CONFIG.OUTPUT_FOLDER_NAME
  );

  const outputFolder = folderIterator.hasNext()
    ? folderIterator.next()
    : DriveApp.createFolder(
        PDF_CONFIG.OUTPUT_FOLDER_NAME
      );

  // Detect duplicate candidate IDs before generating files.
  const idCounts = new Map();

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    if (isEmptyCandidateRow_(row, index)) {
      continue;
    }

    const id = String(
      row[index["Candidate ID"]] || ""
    ).trim();

    if (id) {
      idCounts.set(id, (idCounts.get(id) || 0) + 1);
    }
  }

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  Logger.log("========== PDF TEST START ==========");
  Logger.log("Test mode: " + PDF_CONFIG.TEST_MODE);
  Logger.log("Emails enabled: " + PDF_CONFIG.SEND_EMAILS);

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    if (isEmptyCandidateRow_(row, index)) {
      continue;
    }

    const candidate = {
      id: String(row[index["Candidate ID"]] || "").trim(),
      name: String(row[index["Name"]] || "").trim(),
      designation: String(row[index["Designation"]] || "").trim(),
      location: String(row[index["Location"]] || "").trim(),
      email: String(row[index["Email"]] || "").trim(),
      joiningValue: row[index["Joining Date"]]
    };

    const errors = [];

    if (!candidate.id) {
      errors.push("Missing Candidate ID");
    } else if (idCounts.get(candidate.id) > 1) {
      errors.push("Duplicate Candidate ID");
    }

    if (!candidate.name) {
      errors.push("Missing Name");
    }

    if (!candidate.designation) {
      errors.push("Missing Designation");
    }

    if (!candidate.location) {
      errors.push("Missing Location");
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        candidate.email
      )
    ) {
      errors.push("Invalid Email");
    }

    const joiningDate = getJoiningDate_(
      candidate.joiningValue,
      timezone
    );

    if (!joiningDate) {
      errors.push("Invalid Joining Date");
    }

    if (errors.length > 0) {
      skipped++;

      Logger.log(
        "SKIPPED " +
        (candidate.id || "(no ID)") +
        ": " + errors.join("; ")
      );

      continue;
    }

    const formattedJoiningDate = Utilities.formatDate(
      joiningDate,
      timezone,
      "dd MMMM yyyy"
    );

    const placeholders = {
      "{{offer_date}}": formatOfferDate_(
        PDF_CONFIG.OFFER_DATE,
        timezone
      ),
      "{{candidate_name}}": candidate.name,
      "{{candidate_address}}": PDF_CONFIG.CANDIDATE_ADDRESS,
      "{{position}}": candidate.designation,
      "{{work_location}}": candidate.location,
      "{{monthly_salary}}": PDF_CONFIG.MONTHLY_SALARY,
      "{{working_hours}}": PDF_CONFIG.WORKING_HOURS,
      "{{probation_months}}": PDF_CONFIG.PROBATION_MONTHS,
      "{{contract_duration}}": PDF_CONFIG.CONTRACT_DURATION,
      "{{joining_date}}": formattedJoiningDate,
      "{{notice_days}}": PDF_CONFIG.NOTICE_DAYS,
      "{{company_name}}": PDF_CONFIG.COMPANY_NAME
    };

    const safeId = candidate.id.replace(
      /[\\/:*?"<>|]/g,
      "_"
    );

    const safeName = candidate.name.replace(
      /[\\/:*?"<>|]/g,
      "_"
    );

    const pdfName =
      "Offer_Letter_" + safeId + "_" + safeName;

    let workingCopy = null;

    try {
      workingCopy = templateFile.makeCopy(
        pdfName + "_TEMP",
        outputFolder
      );

      const document = DocumentApp.openById(
        workingCopy.getId()
      );

      const sections = [
        document.getBody(),
        document.getHeader(),
        document.getFooter()
      ].filter(section => section !== null);

      Object.keys(placeholders).forEach(placeholder => {
        sections.forEach(section => {
          section.replaceText(
            escapePdfRegex_(placeholder),
            String(placeholders[placeholder])
          );
        });
      });

      document.saveAndClose();

      const pdfBlob = workingCopy
        .getAs(MimeType.PDF)
        .setName(pdfName + ".pdf");

      const pdfFile = outputFolder.createFile(pdfBlob);

      // Remove the temporary editable copy after PDF creation.
      workingCopy.setTrashed(true);

      generated++;

      Logger.log(
        "PDF CREATED: " + pdfFile.getName()
      );
      Logger.log("PDF URL: " + pdfFile.getUrl());

    } catch (error) {
      failed++;

      Logger.log(
        "PDF ERROR for " +
        candidate.id +
        ": " + error.message
      );

      if (workingCopy) {
        try {
          workingCopy.setTrashed(true);
        } catch (cleanupError) {
          Logger.log(
            "Temporary copy cleanup failed: " +
            cleanupError.message
          );
        }
      }
    }
  }

  Logger.log("========== PDF TEST SUMMARY ==========");
  Logger.log("PDFs generated: " + generated);
  Logger.log("Candidates skipped: " + skipped);
  Logger.log("PDF errors: " + failed);
  Logger.log("Emails sent: 0");
  Logger.log("Output folder URL: " + outputFolder.getUrl());
  Logger.log("========== PDF TEST COMPLETE ==========");
}


/**
 * Return true when the required candidate fields are blank.
 */
function isEmptyCandidateRow_(row, index) {
  const columns = [
    "Candidate ID",
    "Name",
    "Designation",
    "Location",
    "Email",
    "Joining Date"
  ];

  return columns.every(column => {
    const value = row[index[column]];

    return (
      value === "" ||
      value === null ||
      value === undefined ||
      (typeof value === "string" &&
        value.trim() === "")
    );
  });
}


/**
 * Resolve joining date, using the configured default if blank.
 */
function getJoiningDate_(value, timezone) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return Utilities.parseDate(
      PDF_CONFIG.DEFAULT_JOINING_DATE,
      timezone,
      "yyyy-MM-dd"
    );
  }

  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return null;
    }

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

  if (typeof value === "string") {
    const text = value.trim();

    // Accept only unambiguous ISO date strings.
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      try {
        const date = Utilities.parseDate(
          text,
          timezone,
          "yyyy-MM-dd"
        );

        return Utilities.formatDate(
          date,
          timezone,
          "yyyy-MM-dd"
        ) === text ? date : null;
      } catch (error) {
        return null;
      }
    }
  }

  return null;
}


/**
 * Format the configured offer date.
 */
function formatOfferDate_(isoDate, timezone) {
  const date = Utilities.parseDate(
    isoDate,
    timezone,
    "yyyy-MM-dd"
  );

  return Utilities.formatDate(
    date,
    timezone,
    "dd MMMM yyyy"
  );
}


/**
 * Escape placeholder text for DocumentApp.replaceText(),
 * which interprets its search string as a regular expression.
 */
function escapePdfRegex_(text) {
  return text.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function sendGmailTestToSelf() {
  // Replace this with YOUR OWN email address.
  const TEST_EMAIL = "your-email@example.com";

  // This is the generated PDF for Aarav's test record.
  const TEST_PDF_ID = "REPLACE_WITH_TEST_PDF_ID";

  if (
    !TEST_EMAIL ||
    TEST_EMAIL === "your-email@gmail.com"
  ) {
    throw new Error(
      "Replace TEST_EMAIL with your own email address first."
    );
  }

  const pdfFile = DriveApp.getFileById(TEST_PDF_ID);

  if (pdfFile.getMimeType() !== MimeType.PDF) {
    throw new Error("The attachment is not a PDF.");
  }

  GmailApp.sendEmail(
    TEST_EMAIL,
    "TEST - Marathi Offer Letter PDF",
    "Hello,\n\nThis is a test email from the Marathi Offer Letter Automation project. The sample offer-letter PDF is attached for review.\n\nNo candidate emails have been sent.\n\nRegards,\nSarthak Management Services LLP",
    {
      attachments: [pdfFile.getBlob()],
      name: "Sarthak Management Services LLP"
    }
  );

  Logger.log("Test email sent to: " + TEST_EMAIL);
  Logger.log("Candidate emails sent: 0");
}
