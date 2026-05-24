import { useEffect, useMemo, useRef, useState } from "react";
import { linkify } from "./linkify";

type LogRow = { id: number; ts: number; message: string };
type LogsResponse = { key: string; logs: LogRow[] };

const POLL_MS = 10_000;
const SCROLL_STICKY_PX = 40;

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtTime(ts: number, todayKey: string): string {
  const d = new Date(ts);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
  return localDayKey(d) === todayKey
    ? time
    : `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`;
}

function fmtFullLocal(ts: number): string {
  // Long human-readable string with the resolved IANA zone, e.g.
  // "2026-05-24 07:44:07.677 America/Los_Angeles (UTC-07:00)"
  const d = new Date(ts);
  const tzName =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const offset = `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)} ${tzName} (${offset})`;
}

const LOCAL_TZ_LABEL = (() => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
  const offsetMin = -new Date().getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  return `${tz} (UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)})`;
})();

export function LogsPage({ logKey }: { logKey: string }) {
  const [logs, setLogs] = useState<LogRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Track whether user is "stuck" to bottom before each update.
  const wasAtBottomRef = useRef<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function fetchOnce() {
      // Capture scroll state before mutating DOM.
      const el = scrollerRef.current;
      if (el) {
        const distFromBottom =
          el.scrollHeight - el.clientHeight - el.scrollTop;
        wasAtBottomRef.current = distFromBottom <= SCROLL_STICKY_PX;
      }

      try {
        const res = await fetch(`/api/logs/${encodeURIComponent(logKey)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as LogsResponse;
        if (cancelled) return;
        setLogs(data.logs);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) {
          timer = setTimeout(fetchOnce, POLL_MS);
        }
      }
    }

    fetchOnce();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [logKey]);

  // After logs change, scroll to bottom if user was already there.
  useEffect(() => {
    if (logs === null) return;
    if (wasAtBottomRef.current && scrollerRef.current) {
      const el = scrollerRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [logs]);

  const todayKey = useMemo(() => localDayKey(new Date()), [logs]);

  const filtered = useMemo(() => {
    if (!logs) return [];
    if (filter.trim() === "") return logs;
    const needle = filter.toLowerCase();
    return logs.filter((l) => l.message.toLowerCase().includes(needle));
  }, [logs, filter]);

  return (
    <div className="h-screen flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex items-center gap-3 px-4 py-2 border-b border-zinc-200 bg-zinc-100/80 backdrop-blur sticky top-0 z-10 dark:border-zinc-800 dark:bg-zinc-900/60">
        <a
          href="/"
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          logs-drain
        </a>
        <span className="text-zinc-400 dark:text-zinc-600">·</span>
        <span className="font-mono text-sm text-zinc-800 dark:text-zinc-200">
          {logKey}
        </span>
        <span className="text-xs text-zinc-500 ml-2">
          {logs ? `${logs.length} line${logs.length === 1 ? "" : "s"}` : "…"}
          {filter && logs ? ` · ${filtered.length} matching` : ""}
        </span>
        <div className="flex-1" />
        <span
          className="text-xs text-zinc-500 mr-2 hidden sm:inline"
          title="Timestamps shown in your browser's local time zone"
        >
          {LOCAL_TZ_LABEL}
        </span>
        {error && (
          <span className="text-xs text-red-600 dark:text-red-400" title={error}>
            connection error (last data shown)
          </span>
        )}
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="filter…"
          className="w-64 rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500"
        />
      </header>

      <div
        ref={scrollerRef}
        className="flex-1 overflow-auto font-mono text-sm"
      >
        {logs === null && (
          <div className="p-4 text-zinc-500">loading…</div>
        )}
        {logs !== null && logs.length === 0 && (
          <div className="p-4 text-zinc-500">
            no logs yet for{" "}
            <span className="text-zinc-800 dark:text-zinc-300">{logKey}</span>
          </div>
        )}
        {logs !== null && logs.length > 0 && filtered.length === 0 && (
          <div className="p-4 text-zinc-500">no lines match filter</div>
        )}
        {filtered.length > 0 && (
          <ol className="py-1">
            {filtered.map((l) => (
              <li
                key={l.id}
                className="flex gap-3 px-4 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-900/50"
              >
                <span
                  className="shrink-0 text-zinc-500 select-none tabular-nums"
                  title={fmtFullLocal(l.ts)}
                >
                  {fmtTime(l.ts, todayKey)}
                </span>
                <span className="whitespace-pre-wrap break-words text-zinc-800 dark:text-zinc-200">
                  {linkify(l.message)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
