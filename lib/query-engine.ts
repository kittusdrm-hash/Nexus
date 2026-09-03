import { CanonicalRow, SheetStats } from './types';

export interface Filters {
  dateScope?: 'yesterday' | 'today' | 'tomorrow' | 'week';
  status?: 'Pending' | 'Completed' | 'Overdue' | 'In Progress';
  dueScope?: 'today' | 'tomorrow';
  intent?: 'focus' | 'catchup' | 'latest';
  keyword?: string;
}

function stripTime(d: Date): number {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function isSameDay(a: Date, b: Date): boolean {
  return stripTime(a) === stripTime(b);
}
export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}
export function isYesterday(d: Date): boolean {
  return isSameDay(d, daysAgo(1));
}
export function isTomorrow(d: Date): boolean {
  return isSameDay(d, daysFromNow(1));
}
export function isThisWeek(d: Date): boolean {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return stripTime(d) >= stripTime(start) && stripTime(d) <= stripTime(end);
}

/** A row counts as Overdue if it has a due date in the past and isn't marked Completed,
 *  regardless of what the sheet's Status column literally says. */
export function deriveStatus(row: CanonicalRow): string {
  const raw = (row.status || '').toLowerCase();
  if (raw.includes('complete') || raw.includes('done') || raw.includes('closed') || raw.includes('finished') || raw.includes('resolved')) return 'Completed';
  if (row.due && stripTime(row.due) < stripTime(new Date())) return 'Overdue';
  if (raw.includes('progress') || raw.includes('ongoing')) return 'In Progress';
  return 'Pending';
}

const STOP_WORDS = new Set([
  'show', 'me', 'everything', 'related', 'to', 'what', 'is', 'was', 'are', 'the', 'a', 'an',
  'on', 'for', 'about', 'did', 'work', 'pending', 'completed', 'complete', 'overdue', 'today',
  'yesterday', 'tomorrow', 'focus', 'should', 'i', 'catch', 'up', 'good', 'morning', 'there',
  'that', 'those', 'it', 'still', 'from', 'due', 'latest', 'update', 'give', 'tell', 'and', 'of',
  'week', 'this', 'my', 'please', 'can', 'you',
]);

export function analyzeQuery(
  query: string,
  lastContext: { keyword?: string } = {}
): Filters {
  const q = query.toLowerCase();
  const f: Filters = {};

  if (/\byesterday\b/.test(q)) f.dateScope = 'yesterday';
  else if (/\btoday\b/.test(q)) f.dateScope = 'today';
  else if (/\btomorrow\b/.test(q)) f.dateScope = 'tomorrow';
  else if (/this week/.test(q)) f.dateScope = 'week';

  if (/overdue/.test(q)) f.status = 'Overdue';
  else if (/pending/.test(q)) f.status = 'Pending';
  else if (/complet(ed|e)/.test(q)) f.status = 'Completed';
  else if (/in.?progress|ongoing/.test(q)) f.status = 'In Progress';

  if (/due today/.test(q)) f.dueScope = 'today';
  if (/due tomorrow/.test(q)) f.dueScope = 'tomorrow';

  if (/focus/.test(q)) f.intent = 'focus';
  if (/catch (me )?up|good morning|summar/.test(q)) f.intent = 'catchup';
  if (/latest (update|on)/.test(q)) f.intent = 'latest';

  const words = q
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  if (words.length) {
    f.keyword = words.join(' ');
  } else if (lastContext.keyword && /\b(there|that|those|same|it)\b/.test(q)) {
    // short follow-up like "what's pending there?" inherits the last topic
    f.keyword = lastContext.keyword;
  }

  return f;
}

export function filterRows(rows: CanonicalRow[], f: Filters): CanonicalRow[] {
  const matched = rows.filter((row) => {
    const status = deriveStatus(row);

    if (f.status && status !== f.status) return false;
    if (f.dateScope === 'yesterday' && !(row.date && isYesterday(row.date))) return false;
    if (f.dateScope === 'today' && !(row.date && isToday(row.date))) return false;
    if (f.dateScope === 'tomorrow' && !(row.due && isTomorrow(row.due))) return false;
    if (f.dateScope === 'week' && !(row.date && isThisWeek(row.date))) return false;
    if (f.dueScope === 'today' && !(row.due && isToday(row.due))) return false;
    if (f.dueScope === 'tomorrow' && !(row.due && isTomorrow(row.due))) return false;
    if (f.intent === 'focus' && !((row.due && isToday(row.due)) || status === 'Overdue')) return false;

    if (f.keyword) {
      const hay = `${row.project} ${row.task} ${row.description} ${row.notes} ${row.person}`.toLowerCase();
      const hit = f.keyword.split(' ').some((w) => w.length > 2 && hay.includes(w));
      if (!hit) return false;
    }

    return true;
  });

  const priorityRank = (p: string) => {
    const v = (p || '').toLowerCase();
    if (v.startsWith('high')) return 0;
    if (v.startsWith('med')) return 1;
    return 2;
  };

  return matched.sort(
    (a, b) =>
      priorityRank(a.priority) - priorityRank(b.priority) ||
      (b.date?.getTime() || 0) - (a.date?.getTime() || 0)
  );
}

export function summarize(rows: CanonicalRow[]): SheetStats {
  let pending = 0;
  let overdue = 0;
  let completedThisWeek = 0;

  for (const row of rows) {
    const status = deriveStatus(row);
    if (status === 'Pending' || status === 'In Progress') pending++;
    if (status === 'Overdue') overdue++;
    if (status === 'Completed' && row.date && isThisWeek(row.date)) completedThisWeek++;
  }

  return { pending, overdue, completedThisWeek };
}
