import { NextResponse } from 'next/server';
import { fetchSheetRows, isDemoMode } from '@/lib/sheets';
import { normalizeRows } from '@/lib/normalize';
import { summarize } from '@/lib/query-engine';

// Always fetch fresh from the sheet — never statically cache this route.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = normalizeRows(await fetchSheetRows());
    const stats = summarize(rows);
    return NextResponse.json({ ...stats, demo: isDemoMode() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Something went wrong.';
    console.error('NEXUS /api/summary error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
