import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetRows, isDemoMode } from '@/lib/sheets';
import { normalizeRows } from '@/lib/normalize';
import { detectColumnMapping } from '@/lib/detect-columns';
import { filterByCategory, sortRows, deriveStatus, categoryCounts, QuickCategory } from '@/lib/query-engine';
import { CardRow } from '@/lib/types';

// Always fetch fresh from the sheet — never statically cache this route.
export const dynamic = 'force-dynamic';

const VALID_CATEGORIES: QuickCategory[] = ['completed', 'due', 'ongoing', 'research', 'all'];

export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get('category') as QuickCategory | null;

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Use one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    const rawRows = await fetchSheetRows();
    const headers = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
    const aiMapping = await detectColumnMapping(headers);
    const rows = normalizeRows(rawRows, aiMapping);

    const matched = sortRows(filterByCategory(rows, category));

    const cardRows: CardRow[] = matched.map((r) => ({
      project: r.project,
      task: r.task,
      description: r.description,
      person: r.person,
      status: deriveStatus(r),
      priority: r.priority,
      date: r.date ? r.date.toISOString() : null,
      due: r.due ? r.due.toISOString() : null,
      notes: r.notes,
    }));

    return NextResponse.json({
      category,
      rows: cardRows,
      count: cardRows.length,
      stats: categoryCounts(rows),
      demo: isDemoMode(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Something went wrong.';
    console.error('NEXUS /api/category error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
