import { google } from 'googleapis';
import { getMockRows } from './mock-data';

/**
 * True until real Google Sheets credentials are set in .env.local.
 * While true, fetchSheetRows() returns realistic dummy data instead
 * of throwing, so the rest of the app (chat, Claude, UI) can be built
 * and tested before the real sheet is ready.
 */
export function isDemoMode(): boolean {
  return !(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SHEET_ID
  );
}

/**
 * Fetches the raw rows from the shared Google Sheet as an array of
 * { headerName: cellValue } objects. This is the ONLY place that talks
 * to Google — read-only scope, so NEXUS can never modify the sheet.
 *
 * Requires a service account with "Viewer" access to the sheet, and
 * the following env vars (see .env.local.example):
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_PRIVATE_KEY
 *   GOOGLE_SHEET_ID
 *   GOOGLE_SHEET_RANGE (optional, defaults to "Sheet1")
 *
 * Falls back to dummy data automatically if those aren't set yet.
 */
export async function fetchSheetRows(): Promise<Record<string, string>[]> {
  if (isDemoMode()) {
    return getMockRows();
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY!;
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
  const range = process.env.GOOGLE_SHEET_RANGE || 'Sheet1';

  const key = rawKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });

  const values = res.data.values || [];
  if (values.length === 0) return [];

  const headers = values[0].map((h) => String(h ?? '').trim());
  const rows = values.slice(1).map((rowArr) => {
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = rowArr[i] !== undefined && rowArr[i] !== null ? String(rowArr[i]) : '';
    });
    return row;
  });

  return rows;
}
