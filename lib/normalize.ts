import { CanonicalRow } from './types';
import { ColumnMapping } from './detect-columns';

/**
 * Fallback ONLY: used for any field the AI-based detection (detect-columns.ts)
 * didn't confidently map, or if that call fails entirely (network issue, etc).
 * Keeps the app working even in a worst-case scenario.
 */
const FIELD_PATTERNS: [keyof Omit<CanonicalRow, 'raw'>, RegExp][] = [
  ['due', /due|target|deadline/i],
  ['lastUpdated', /last.?updated|updated.?(on|at)?$/i],
  ['person', /person|owner|assignee|assigned|who/i],
  ['project', /project|client|account/i],
  ['status', /status|state/i],
  ['priority', /priority/i],
  ['notes', /note|comment|remark/i],
  ['task', /task|title/i],
  ['description', /description|details|summary|activity/i],
  ['date', /date/i],
];

function parseDate(val: string | undefined): Date | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  const direct = new Date(trimmed);
  if (!isNaN(direct.getTime())) return direct;

  // Try dd/mm/yyyy or dd-mm-yyyy (common outside the US)
  const m = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? `20${y}` : y;
    const alt = new Date(`${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`);
    if (!isNaN(alt.getTime())) return alt;
  }

  return null;
}

function mapHeadersFallback(headers: string[]): Partial<Record<keyof Omit<CanonicalRow, 'raw'>, string>> {
  const map: Partial<Record<keyof Omit<CanonicalRow, 'raw'>, string>> = {};
  for (const header of headers) {
    for (const [canonical, pattern] of FIELD_PATTERNS) {
      if (!(canonical in map) && pattern.test(header)) {
        map[canonical] = header;
        break;
      }
    }
  }
  return map;
}

export function normalizeRows(rawRows: Record<string, string>[], aiMapping: ColumnMapping = {}): CanonicalRow[] {
  if (rawRows.length === 0) return [];

  const headers = Object.keys(rawRows[0]);
  const fallback = mapHeadersFallback(headers);
  // AI-detected mapping wins wherever it found something; keyword fallback
  // fills in anything it missed.
  const map = { ...fallback, ...aiMapping };

  return rawRows
    .filter((r) => Object.values(r).some((v) => v && v.trim() !== ''))
    .map((r) => ({
      date: parseDate(map.date ? r[map.date] : undefined),
      person: (map.person ? r[map.person] : '') || '',
      project: (map.project ? r[map.project] : '') || '',
      task: (map.task ? r[map.task] : '') || '',
      description: (map.description ? r[map.description] : '') || '',
      status: (map.status ? r[map.status] : '').trim(),
      priority: (map.priority ? r[map.priority] : '') || '',
      due: parseDate(map.due ? r[map.due] : undefined),
      notes: (map.notes ? r[map.notes] : '') || '',
      lastUpdated: parseDate(map.lastUpdated ? r[map.lastUpdated] : undefined),
      raw: r,
    }));
}

