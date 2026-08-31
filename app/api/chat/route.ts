import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { fetchSheetRows, isDemoMode } from '@/lib/sheets';
import { normalizeRows } from '@/lib/normalize';
import { analyzeQuery, filterRows, summarize, deriveStatus } from '@/lib/query-engine';
import { ChatRequestBody, CardRow } from '@/lib/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Always fetch fresh from the sheet — never statically cache this route.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestBody = await req.json();
    const { message, history = [], context = {} } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Missing "message" in request body.' }, { status: 400 });
    }

    // 1. Pull the latest sheet data (source of truth, read-only).
    const rawRows = await fetchSheetRows();
    const rows = normalizeRows(rawRows);

    // 2. Parse the question into filters and narrow down to relevant rows
    //    BEFORE anything reaches the LLM. This keeps context small and
    //    grounded, and means the model literally cannot see rows outside
    //    what was matched.
    const filters = analyzeQuery(message, context);
    const matched = filterRows(rows, filters);
    const stats = summarize(rows);

    const contextRows = matched.slice(0, 40).map((r) => ({
      date: r.date ? r.date.toISOString().slice(0, 10) : null,
      person: r.person,
      project: r.project,
      task: r.task,
      description: r.description,
      status: deriveStatus(r),
      priority: r.priority,
      due: r.due ? r.due.toISOString().slice(0, 10) : null,
      notes: r.notes,
    }));

    // 3. Ask Claude to phrase the answer, strictly grounded in the matched rows.
    const systemPrompt = `You are NEXUS, a personal work assistant answering questions about a team's shared Google Sheet.

Rules:
- Only use the JSON rows given below. Never invent tasks, people, or numbers that aren't there.
- If nothing relevant was found, say so plainly and don't guess.
- Be concise and conversational — 1 to 4 sentences. The interface renders the matching rows as cards separately, so don't re-list every row in your own words; summarize and highlight what matters.
- Today's date is ${new Date().toISOString().slice(0, 10)}.
- Overall team snapshot right now: ${stats.pending} pending, ${stats.overdue} overdue, ${stats.completedThisWeek} completed this week.
${isDemoMode() ? '- NOTE: no real sheet is connected yet, so this is placeholder demo data for testing purposes, not the real team\'s work.' : ''}

Matched rows for this question (${contextRows.length} of ${rows.length} total rows in the sheet):
${JSON.stringify(contextRows, null, 2)}`;

    const completion = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
      max_tokens: 400,
      system: systemPrompt,
      messages: [
        ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
        { role: 'user' as const, content: message },
      ],
    });

    const textBlock = completion.content.find((c) => c.type === 'text');
    const text = textBlock && 'text' in textBlock ? textBlock.text : "I couldn't generate a response.";

    const cardRows: CardRow[] = matched.slice(0, 8).map((r) => ({
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
      text,
      rows: cardRows,
      stats,
      keyword: filters.keyword || null,
      demo: isDemoMode(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Something went wrong.';
    console.error('NEXUS /api/chat error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
