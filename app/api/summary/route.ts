import { NextResponse } from 'next/server';
import { fetchSheetRows, isDemoMode } from '@/lib/sheets';
import { normalizeRows } from '@/lib/normalize';
import { detectColumnMapping } from '@/lib/detect-columns';
import { categoryCounts } from '@/lib/query-engine';

// Always fetch fresh from the sheet — never statically cache this route.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rawRows = await fetchSheetRows();
    const headers = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
    const aiMapping = await detectColumnMapping(headers);
    const rows = normalizeRows(rawRows, aiMapping);
    const stats = categoryCounts(rows);
    return NextResponse.json({ ...stats, demo: isDemoMode() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Something went wrong.';
    console.error('NEXUS /api/summary error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
