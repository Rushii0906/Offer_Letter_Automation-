
PROJECT REQUIREMENTS
====================

Project: Automated Marathi Offer Letter Generation and Email Delivery

1. INPUT FILES
--------------
- Marathi offer letter template (.docx)
- Candidate data spreadsheet (.xlsx)

2. CANDIDATE DATA FIELDS
------------------------
- Name
- Designation
- Location
- Email
- Joining Date (optional)

3. DEFAULT VALUES
-----------------
- Default joining date: 01 October 2026

4. OUTPUT
---------
- Individual personalized offer letter for each candidate
- PDF format
- PDFs stored in Google Drive
- PDF URL recorded in Google Sheets

5. EMAIL AUTOMATION
-------------------
- Gmail / Google Workspace integration
- Individual email for each candidate
- Personalized Marathi email subject and body
- Corresponding PDF attached to each email

6. VALIDATION
-------------
- Required field validation
- Email format validation
- Joining date validation
- Duplicate-send prevention using email status
- Processing and error logs

7. TECHNOLOGY
-------------
- Google Apps Script
- Google Docs
- Google Sheets
- Google Drive
- Gmail

8. SECURITY
-----------
- Google account authorization
- Restricted access to candidate data
- PDF review before sending
- Gmail sending quotas must be respected
