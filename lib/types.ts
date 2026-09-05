export interface CanonicalRow {
  date: Date | null;
  person: string;
  project: string;
  task: string;
  description: string;
  status: string;
  priority: string;
  due: Date | null;
  notes: string;
  lastUpdated: Date | null;
  raw: Record<string, string>;
}

export interface ChatRequestBody {
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  context?: { keyword?: string };
}

export interface CardRow {
  project: string;
  task: string;
  description: string;
  person: string;
  status: string;
  priority: string;
  date: string | null;
  due: string | null;
  notes: string;
}

export interface SheetStats {
  completed: number;
  due: number;
  ongoing: number;
  research: number;
  all: number;
}
