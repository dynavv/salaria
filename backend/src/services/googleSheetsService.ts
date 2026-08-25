import { db } from '../db';

export interface GoogleSheetsData {
  transactions: any[];
  categories: any[];
  accounts: any[];
}

export function getGoogleSheetsUrl(): string {
  const row = db.prepare(`SELECT value FROM settings WHERE key = 'google_sheet_url'`).get() as { value: string } | undefined;
  return row?.value || process.env.GOOGLE_SHEET_URL || '';
}

export function setGoogleSheetsUrl(url: string) {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('google_sheet_url', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(url);
}

// Fetch all live data from Google Sheets Web App
export async function fetchGoogleSheetsData(): Promise<GoogleSheetsData | null> {
  const url = getGoogleSheetsUrl();
  if (!url) return null;

  try {
    const res = await fetch(url, { redirect: 'follow' });
    const data = await res.json();
    if (data && data.success && data.data) {
      return data.data;
    }
    return null;
  } catch (err: any) {
    console.error('Failed to fetch data from Google Sheets:', err.message);
    return null;
  }
}

// Perform Action on Google Sheets (create, delete, update)
export async function postGoogleSheetsAction(action: string, payload: any): Promise<any> {
  const url = getGoogleSheetsUrl();
  if (!url) return { success: false, error: 'Chưa cấu hình Google Sheet URL' };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
      redirect: 'follow',
    });
    return await res.json();
  } catch (err: any) {
    console.error('Failed to execute action on Google Sheets:', err.message);
    return { success: false, error: err.message };
  }
}
