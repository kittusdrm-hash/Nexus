const CANONICAL_FIELDS = [
  'date',
  'person',
  'project',
  'task',
  'description',
  'status',
  'priority',
  'due',
  'notes',
  'lastUpdated',
] as const;

export type CanonicalField = (typeof CANONICAL_FIELDS)[number];
export type ColumnMapping = Partial<Record<CanonicalField, string>>;

// In-memory cache so we only re-ask Gemini when the sheet's headers actually
// change, not on every single question. Resets on cold start — that's fine,
// it just means the first request after a deploy pays this cost once.
let cache: { headersKey: string; mapping: ColumnMapping } | null = null;

/**
 * Asks Gemini to map this sheet's ACTUAL column headers (whatever your team
 * calls them) to NEXUS's standard concepts. This means renaming or rewording
 * columns never breaks NEXUS again — no hardcoded keyword list to maintain.
 */
export async function detectColumnMapping(headers: string[]): Promise<ColumnMapping> {
  if (headers.length === 0) return {};

  const headersKey = headers.join('|');
  if (cache && cache.headersKey === headersKey) {
    return cache.mapping;
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  if (!geminiKey) return {};

  const prompt = `You are mapping spreadsheet column headers to standard field names for a work-tracking tool.

Actual headers in this sheet: ${JSON.stringify(headers)}

Standard fields and what each means:
- date: when the work was logged or started
- person: who is responsible / assigned
- project: which project or client this belongs to
- task: a short task name or title
- description: longer free text describing the activity or details
- status: current status (e.g. pending, done, closed, ongoing)
- priority: urgency level
- due: deadline / target completion date
- notes: extra remarks or comments
- lastUpdated: when this row was last modified

Return ONLY a JSON object mapping each standard field to the EXACT matching header string from the list above — copy the header text exactly as given, don't paraphrase it. Omit any standard field that has no reasonable match. Return no prose, no markdown fences, just the raw JSON object.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 300, responseMimeType: 'application/json' },
        }),
      }
    );

    if (!res.ok) return {};

    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return {};

    const parsed = JSON.parse(text);
    const clean: ColumnMapping = {};
    for (const field of CANONICAL_FIELDS) {
      const value = parsed[field];
      // Only trust it if it's an exact header we actually have —
      // guards against the model inventing a header name.
      if (typeof value === 'string' && headers.includes(value)) {
        clean[field] = value;
      }
    }

    cache = { headersKey, mapping: clean };
    return clean;
  } catch {
    // Any failure here (network, bad JSON, etc) just means we fall back
    // to keyword matching in normalize.ts — never breaks the app.
    return {};
  }
}
