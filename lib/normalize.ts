import { CanonicalRow } from './types';

/**
 * The sheet's exact column names may vary ("Owner" vs "Person",
 * "Deadline" vs "Due Date", etc). We match headers by pattern instead
 * of exact string so NEXUS keeps working if the team tweaks column
 * names slightly.
 */
const FIELD_PATTERNS: [keyof Omit<CanonicalRow, 'raw'>, RegExp][] = [
  ['due', /due/i],
  ['lastUpdated', /last.?updated|updated.?(on|at)?$/i],
  ['person', /person|owner|assignee|assigned|who/i],
  ['project', /project|client|account/i],
  ['status', /status|state/i],
  ['priority', /priority/i],
  ['notes', /note|comment|remark/i],
  ['task', /task|activity|title/i],
  ['description', /description|details|summary/i],
  ['date', /^date$|work.?date|log.?date|entry.?date/i],
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

function mapHeaders(headers: string[]): Partial<Record<keyof Omit<CanonicalRow, 'raw'>, string>> {
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

export function normalizeRows(rawRows: Record<string, string>[]): CanonicalRow[] {
  if (rawRows.length === 0) return [];

  const headers = Object.keys(rawRows[0]);
  const map = mapHeaders(headers);

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
