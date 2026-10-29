# Marathi Offer Letter Automation: Requirements Specification

Version 1.0 (MVP) | Status: Draft for HR review | Date: 29 October 2026

## 1. Introduction

### 1.1 Purpose

This document defines the requirements for an automation that reads candidate details from a spreadsheet, personalizes an approved Marathi offer-letter template, generates one PDF per candidate, stores the PDFs in Google Drive, and emails each PDF to the matching candidate through Gmail.

### 1.2 Vision

Provide a reliable, secure, and easy-to-use process for creating and sending personalized Marathi offer letters with minimal manual effort.

### 1.3 Goals and success measures

| Goal | Success measure |
| --- | --- |
| Correct personalization | Every generated PDF matches its candidate record |
| Data quality | Required fields are validated before any PDF is generated or emailed |
| Safe testing | No candidate email is sent while dry-run mode is enabled |
| Human oversight | HR can review PDFs before production sending |
| Traceability | Every attempt has a clear status, timestamp, and error reason where applicable |
| Privacy | Each candidate receives only their own letter; data is visible only to authorized staff |

### 1.4 Out of scope (MVP)

- Electronic signatures and acceptance tracking
- Candidate portal or login system
- HRIS or payroll integrations
- Automatic offer approval workflows
- Bulk reminders and follow-up campaigns
- Multiple templates, multiple languages, advanced reporting

### 1.5 Definitions

| Term | Meaning |
| --- | --- |
| Dry run | Mode that creates PDFs but never sends email |
| Live mode | Mode that sends emails with PDF attachments |
| Effective joining date | Joining date after applying the default-date rule |
| Job | One processing attempt record for one candidate |

## 2. Stakeholders and users

| Role | Responsibility |
| --- | --- |
| HR executive | Maintains candidate data, runs the workflow, reviews PDFs |
| HR manager | Approves PDFs and authorizes live sending |
| Administrator | Manages access control, the automation account, and audit information |
| Candidate | Receives only their own offer letter |

## 3. Business rules

| ID | Rule |
| --- | --- |
| BR-01 | Default joining date is **1 October 2026**. |
| BR-02 | If a candidate has a joining date in the spreadsheet, that date is used. |
| BR-03 | If the joining-date cell is blank, 1 October 2026 is used. |
| BR-04 | A candidate's name alone is never treated as a unique identifier. |
| BR-05 | Records already marked SENT are never resent in a normal run. |
| BR-06 | Dry-run mode is the default and must be switched off explicitly for live sending. |

BR-01 to BR-03 must be confirmed with HR before production use.

## 4. Functional requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-01 | Read candidate records from a Google Sheet imported from Excel. | Must |
| FR-02 | Support required fields: Name, Designation, Location, Email. | Must |
| FR-03 | Support an optional Joining Date field. | Must |
| FR-04 | Use 1 October 2026 when Joining Date is blank. | Must |
| FR-05 | Validate required fields, email format, and joining date before processing. | Must |
| FR-06 | Use an approved Marathi Google Docs offer-letter template. | Must |
| FR-07 | Replace template placeholders with the correct candidate data. | Must |
| FR-08 | Export a separate PDF for each eligible candidate. | Must |
| FR-09 | Save generated PDFs in a restricted Google Drive folder. | Must |
| FR-10 | Record the PDF URL and processing status in the sheet. | Must |
| FR-11 | Send an individual Gmail message with the matching PDF attached. | Must |
| FR-12 | Use an approved Marathi email subject and body. | Must |
| FR-13 | Support dry-run mode that creates PDFs but sends no email. | Must |
| FR-14 | Skip records already marked SENT. | Must |
| FR-15 | Log failures and provide a safe retry process. | Must |
| FR-16 | Support manual execution and an optional time-driven trigger. | Should |
| FR-17 | Limit the number of records processed per run to respect execution limits. | Must |
| FR-18 | Record a timestamp for successful sending and, where possible, for each attempt. | Must |
| FR-19 | Detect unreplaced placeholders in the generated document before delivery. | Must |
| FR-20 | Flag invalid or incomplete rows clearly without stopping the rest of the batch. | Must |

## 5. Non-functional requirements

| ID | Category | Requirement |
| --- | --- | --- |
| NFR-01 | Security | Restrict access to candidate data, templates, and PDFs to authorized staff. |
| NFR-02 | Privacy | Send each candidate only their own offer letter. |
| NFR-03 | Reliability | Handle invalid rows and failures without stopping all work. |
| NFR-04 | Auditability | Retain status, timestamps, PDF links, and error messages. |
| NFR-05 | Usability | HR staff can operate the workflow from the sheet without developer help. |
| NFR-06 | Maintainability | Use clear configuration values and documented setup. |
| NFR-07 | Localization | Preserve Marathi/Devanagari text and fonts in generated PDFs. |
| NFR-08 | Compliance | Respect Google Workspace permissions, quotas, and company policy. |

## 6. Data requirements

### 6.1 Spreadsheet columns

| Column | Type | Required | Managed by |
| --- | --- | --- | --- |
| Unique Candidate ID | Text | Recommended | HR |
| Name | Text | Yes | HR |
| Designation | Text | Yes | HR |
| Location | Text | Yes | HR |
| Email | Text | Yes | HR |
| Joining Date | Date | No (defaults per BR-01) | HR |
| Processing Status | Enum | System | Automation |
| PDF URL | URL | System | Automation |
| Last Attempt At | Timestamp | System | Automation |
| Email Sent At | Timestamp | System | Automation |
| Error Message | Text | System | Automation |

System-managed columns should be protected so HR cannot overwrite them accidentally.

### 6.2 Template placeholders

| Placeholder | Source column |
| --- | --- |
| {{candidate\_name}} | Name |
| {{designation}} | Designation |
| {{location}} | Location |
| {{joining\_date}} | Effective joining date |
| {{candidate\_email}} | Email (only if shown in the letter) |

### 6.3 Data model

**Candidate:** candidate\_id, name, designation, location, email, joining\_date (optional in source), effective\_joining\_date.

**OfferLetterJob:** job\_id, candidate\_id, status, template\_version, pdf\_file\_id, pdf\_url, attempt\_count, last\_attempt\_at, email\_sent\_at, error\_message, created\_at, updated\_at.

The spreadsheet can hold this model for the MVP. Rows must not be identified by row number alone, because rows can be sorted or moved. Gmail passwords and OAuth secrets must never be stored in the spreadsheet.

### 6.4 Processing states

| Status | Meaning |
| --- | --- |
| READY | Row is eligible for processing |
| PROCESSING | A run has claimed the row |
| PDF\_READY\_NOT\_SENT | PDF exists but no email has been sent |
| SENT | Gmail send succeeded and the sheet was updated |
| ERROR | A validation or processing error occurred |
| NEEDS\_REVIEW | Delivery outcome is uncertain or manual action is needed |

## 7. System design constraints

### 7.1 Architecture

HR user works in Google Sheets, which holds candidate records and status. Google Apps Script validates data, applies the default date, copies the Google Docs template, replaces placeholders, exports the PDF, saves it to Drive, updates the sheet, and sends the email through Gmail when live mode is on.

### 7.2 Technology stack (MVP)

| Layer | Choice |
| --- | --- |
| User interface | Google Sheets |
| Runtime | Google Apps Script (JavaScript) |
| Template | Google Docs, converted from the approved DOCX |
| PDF generation | Google Docs export / Drive conversion |
| Storage | Restricted Google Drive folder |
| Email | GmailApp or MailApp |
| Trigger | Manual first; installable time-driven trigger later |
| Monitoring | Apps Script execution logs plus sheet-level error messages |

No separate server is needed. A future stack (Python/FastAPI, Google APIs, PostgreSQL, Cloud Tasks, Cloud Run, React admin UI) should be built only if volume, multiple templates, approval workflows, integrations, or advanced reporting require it.

### 7.3 Triggers

- MVP: manual run from the Apps Script editor or a custom spreadsheet menu.
- After testing: an installable time-driven trigger (for example hourly) that processes only eligible rows, respects batch limits, and does not create duplicate triggers.

## 8. Reliability and duplicate protection

- Mark a row PROCESSING before work begins.
- Use a script lock to prevent overlapping executions.
- Use a stable candidate/job ID and check existing job status before acting.
- Never resend SENT rows during a normal rerun.
- If an error occurs before sending, record it and allow a controlled retry.
- If sending may have succeeded but the status update failed, mark the row NEEDS\_REVIEW and reconcile Gmail activity before retrying.
- Do not claim exactly-once delivery: Gmail sending and sheet updates cannot be committed atomically.

## 9. Security and privacy requirements

- Restrict the spreadsheet, template, script, and output folder to authorized staff.
- Run the automation under an approved Google Workspace account with least-privilege access.
- Review Apps Script authorization scopes and organization admin policies.
- Do not use public links for confidential PDFs.
- Do not expose a live-send control to unauthorized users.
- Retain data and logs only as long as company policy requires.

## 10. User interface requirements

Google Sheets is the primary interface for the MVP.

- Freeze the header row and add filters.
- Apply data validation for dates and required fields.
- Protect system-managed columns.
- Use consistent status values (Section 6.4).
- Use conditional formatting to distinguish success, pending, and error states.
- Default to dry-run mode; require explicit confirmation and show the recipient count before a live batch.
- Let HR inspect the PDF and recipient for each row directly from the sheet.

Optional later: an automation control panel (mode, template and folder connection status, last run, counts, and buttons for Validate, Generate, Review, Send Approved Batch, Retry Failed) and a per-candidate review view with Approve and Mark for Correction actions.

## 11. User stories and acceptance criteria

| ID | User story | Acceptance criteria |
| --- | --- | --- |
| US-01 | As an HR executive, I want to maintain candidate data in a spreadsheet so I can manage offer-letter details in one place. | One row per candidate; Name, Designation, Location, Email required; blank Joining Date defaults to 1 October 2026; invalid rows flagged clearly. |
| US-02 | As an HR executive, I want an approved Marathi template so every candidate gets a consistent official document. | Placeholders exist for all variable fields; Marathi content, layout, and signature area stay intact; unreplaced placeholders are detected before delivery. |
| US-03 | As an HR executive, I want a personalized PDF per eligible candidate so I need not create letters manually. | Separate PDF per eligible row; correct details in each; saved in the designated Drive folder; URL recorded in the sheet. |
| US-04 | As an HR executive, I want each candidate to receive only their own PDF so confidential information is not shared. | Individual message to the email in the same row; only that candidate's PDF attached; approved subject and body; sent status and timestamp recorded. |
| US-05 | As an HR manager, I want a dry-run mode so I can review documents before any email is sent. | Dry run never calls the send function; PDFs available for review; records marked PDF\_READY\_NOT\_SENT. |
| US-06 | As an HR executive, I want errors logged and retryable so temporary failures do not force a full restart. | Errors recorded per row; SENT rows not resent; failed rows retryable after review; ambiguous outcomes warned about rather than blindly resent. |
| US-07 | As an administrator, I want access controls and audit information so data is protected and actions are reviewable. | Only authorized staff can access the sheet, template, and folder; automation runs under an approved account; status and timestamps retained per policy. |

## 12. Audit of existing assets (pre-implementation)

**Word template:** confirm it is the current approved Marathi letter; agree exact placeholders; check headers, footers, tables, signature, logo, page breaks, and fonts; convert a copy to Google Docs and compare the exported PDF with the original; confirm Devanagari renders correctly.

**Excel data:** confirm sheet names and headings; check blanks, duplicates, malformed emails, and date formats; determine whether Joining Date is a real date or text; define a stable Candidate ID; identify eligible rows.

**Google Workspace:** confirm access to Drive, Docs, Sheets, and Gmail; confirm the owning/running account; confirm Gmail and Apps Script quotas; check folder permissions and sharing; confirm company policy allows sending offer letters from this account.

**Existing automation (if any):** review the current script and configuration; confirm template, folder, and spreadsheet IDs; verify dry-run is the default; review status handling, duplicate protection, error logging, and retry logic; test behavior when execution stops after an email is sent but before the status update.

**Audit deliverables:** data quality issue list, confirmed column-to-placeholder mapping, confirmed template and folder IDs, permission and quota checklist, test cases, and known risks.

## 13. MVP scope and definition of done

### 13.1 MVP scope

1. One approved Marathi Google Docs template.
2. One Google Sheet of candidate records.
3. Required fields: Name, Designation, Location, Email.
4. Optional Joining Date with default 1 October 2026.
5. Field validation and row-level status.
6. Individual PDF generation and Drive storage.
7. PDF URL saved to the candidate row.
8. Dry-run mode and manual HR review.
9. Individual Gmail delivery with the matching PDF.
10. SENT status, timestamp, and error logging.
11. Safe rerun behavior and basic duplicate-send safeguards.
12. Manual run first; time-driven trigger only after approval.

### 13.2 Test and acceptance checklist

| ID | Test | Expected result |
| --- | --- | --- |
| T-01 | Run with at least three sample records: blank joining date, invalid email, non-default joining date | Each handled per its rule |
| T-02 | Blank joining date | PDF shows 1 October 2026 |
| T-03 | Valid records | Correct Marathi PDF per record, details match the row |
| T-04 | Invalid email record | Not emailed; error logged against the row |
| T-05 | Dry-run mode | Zero emails sent; status PDF\_READY\_NOT\_SENT |
| T-06 | Live test to an internal address | Email contains only the matching PDF |
| T-07 | Rerun after success | Rows marked SENT are not resent |
| T-08 | Error and timestamp visibility | HR can see errors and timestamps in the sheet |
| T-09 | Interrupted run after send | Row flagged NEEDS\_REVIEW, not blindly resent |
| T-10 | HR sign-off | Approval obtained before processing real candidate data |

## 14. Implementation plan

| Phase | Activities |
| --- | --- |
| 1. Discovery and audit | Inspect the DOCX template and Excel file; confirm columns, placeholders, date behavior, approved email text; confirm permissions and quotas. |
| 2. Template and data setup | Convert a copy of the DOCX to Google Docs; create the Sheet and output folder; add status, URL, timestamp, and error columns; restrict access. |
| 3. PDF generation | Implement validation and placeholder replacement; generate PDFs in dry-run mode; check fonts, formatting, dates, and names. |
| 4. Email delivery | Test to an internal address; verify attachment-to-candidate matching; add send status, timestamp, and failure handling. |
| 5. Scheduling and rollout | Obtain HR sign-off; enable live mode; add a time-driven trigger if required; monitor early runs. |

## 15. Risks

| Risk | Mitigation |
| --- | --- |
| Marathi font or layout changes during DOCX to Google Docs conversion | Compare exported PDF with the original; test with real Devanagari content early |
| Incorrect or duplicate email addresses | Validate format; flag duplicates; HR review before live send |
| Date parsing errors from locale or text-formatted dates | Normalize dates; data validation on the column |
| Gmail quotas or Apps Script execution limits | Batch limits per run; trigger-based processing |
| Duplicate delivery after an ambiguous failure | PROCESSING lock, NEEDS\_REVIEW state, Gmail reconciliation |
| Excessive Drive sharing exposing offer letters | Restricted folder, no public links, access review |

## 16. Assumptions and open questions

**Assumption:** the default joining date applies only when the Excel cell is blank.

**Open questions for HR:**

1. Should joining dates appear in Marathi or English date format?
2. Should the outgoing email be entirely in Marathi?
3. Who approves each PDF before it is sent?
4. What is the expected number of candidates per batch?
5. Which Workspace account should send the emails?
6. How long should PDFs and logs be retained?

## 17. Recommendation

Start with a controlled MVP using Google Sheets, Google Docs, Drive, Gmail, and Apps Script. Keep dry-run mode enabled until HR has reviewed sample PDFs. Then test email delivery with an internal address before enabling a live batch or a scheduled trigger.
