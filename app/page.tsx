'use client';

import { useEffect, useRef, useState } from 'react';
import { CardRow, SheetStats } from '@/lib/types';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  rows?: CardRow[];
}

const SUGGESTIONS = [
  'Good morning. Catch me up on yesterday.',
  'What should I focus on today?',
  'What is overdue?',
  'What is pending?',
  'What did the team complete yesterday?',
  'What is due today?',
];

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function badgeClass(status: string): string {
  return status.replace(' ', '-');
}

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SheetStats | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [lastKeyword, setLastKeyword] = useState<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/summary')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setConnectionError(data.error);
        else {
          setStats(data);
          setDemoMode(Boolean(data.demo));
        }
      })
      .catch(() => setConnectionError('Could not reach the server.'));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || loading) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, history, context: { keyword: lastKeyword } }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [...prev, { role: 'assistant', content: `Something went wrong: ${data.error}` }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.text, rows: data.rows }]);
        if (data.keyword) setLastKeyword(data.keyword);
        if (data.stats) setStats(data.stats);
        setDemoMode(Boolean(data.demo));
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Couldn't reach the server. Check your connection and try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <>
      <div className="field" />
      <div className="grid-overlay" />
      <div className="app">
        <div className="topbar">
          <div className="brand">
            <div className="brand-mark" />
            <div>
              <div className="brand-name">NEXUS</div>
              <div className="brand-sub">Work Intelligence</div>
            </div>
          </div>
          <div className="status-cluster">
            {stats && (
              <div className="stat-chips">
                <div className="chip pending"><b>{stats.pending}</b>&nbsp;Pending</div>
                <div className="chip overdue"><b>{stats.overdue}</b>&nbsp;Overdue</div>
                <div className="chip done"><b>{stats.completedThisWeek}</b>&nbsp;Done this wk</div>
              </div>
            )}
            <div className="sync-pill">
              <span className={`sync-dot ${connectionError ? 'error' : demoMode ? 'demo' : ''}`} />
              <span>{connectionError ? 'Offline' : demoMode ? 'Demo Data' : 'Synced'}</span>
            </div>
          </div>
        </div>

        {connectionError && (
          <div className="error-banner">
            Couldn&apos;t reach the Google Sheet: {connectionError}. Check your .env.local credentials.
          </div>
        )}

        {!connectionError && demoMode && (
          <div className="info-banner">
            Running on demo data — no Google Sheet connected yet. Add your credentials to .env.local to switch to your real sheet.
          </div>
        )}

        {empty ? (
          <div className="hero">
            <div className={`orb-wrap ${loading ? 'thinking' : ''}`}>
              <div className="orb-ring r3" />
              <div className="orb-ring r2" />
              <div className="orb-ring" />
              <div className="orb-core" />
            </div>
            <div className="hero-title">Good morning. What do you need to know?</div>
            <div className="hero-sub">
              Connected to your team&apos;s shared sheet. Ask about pending work, overdue items, or what happened yesterday.
            </div>
            <div className="chips-row">
              {SUGGESTIONS.map((s) => (
                <div key={s} className="suggest-chip" onClick={() => send(s)}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="chat-panel">
            <div className="messages" ref={scrollRef}>
              {messages.map((m, i) => (
                <div key={i} className={`msg-row ${m.role === 'user' ? 'user' : 'ai'}`}>
                  <div className={`avatar ${m.role === 'user' ? 'user' : 'ai'}`}>
                    {m.role === 'user' ? 'YOU' : ''}
                  </div>
                  <div className="bubble-col">
                    <div className="bubble" dangerouslySetInnerHTML={{ __html: m.content }} />
                    {m.rows && m.rows.length > 0 && (
                      <div className="card-grid">
                        {m.rows.map((row, j) => (
                          <div className="rcard" key={j}>
                            <div className="rcard-top">
                              <div className="rcard-title">{row.project} · {row.task}</div>
                              <span className={`badge ${badgeClass(row.status)}`}>{row.status}</span>
                            </div>
                            <div className="rcard-meta">
                              <span>👤 {row.person || '—'}</span>
                              <span>⚑ {row.priority || '—'}</span>
                              <span>📅 Logged {fmtDate(row.date)}</span>
                              <span>⏱ Due {fmtDate(row.due)}</span>
                            </div>
                            <div className="rcard-desc">{row.description}</div>
                            {row.notes && <div className="rcard-foot">Note: {row.notes}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="msg-row ai">
                  <div className="avatar ai" />
                  <div className="bubble-col">
                    <div className="bubble thinking-line">
                      Scanning sheet rows
                      <div className="dot-flow"><span /><span /><span /></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="input-bar">
          <div className="input-shell">
            <input
              type="text"
              placeholder="Ask NEXUS about your team's work..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              disabled={loading}
            />
          </div>
          <button className="send-btn" onClick={() => send()} disabled={loading} aria-label="Send">
            <svg viewBox="0 0 24 24" width={15} height={15} fill="none">
              <path d="M4 12L20 4L14 20L11 13L4 12Z" fill="#080b10" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
