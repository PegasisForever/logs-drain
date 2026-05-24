import { useState, type FormEvent } from "react";
import { navigate } from "./App";

const KEY_RE = /^[A-Za-z0-9._-]{1,128}$/;

export function HomePage() {
  const [key, setKey] = useState("");
  const valid = KEY_RE.test(key);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    navigate(`/logs/${encodeURIComponent(key)}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          logs-drain
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Enter a key to view its logs.
        </p>
        <div className="flex gap-2">
          <input
            autoFocus
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="my-job"
            className="flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-600 dark:focus:border-zinc-600"
          />
          <button
            type="submit"
            disabled={!valid}
            className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 disabled:bg-zinc-200 disabled:text-zinc-400 dark:bg-emerald-700 dark:hover:bg-emerald-600 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
          >
            View
          </button>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Allowed: letters, digits, <code>._-</code>, up to 128 chars.
        </p>
      </form>
    </main>
  );
}
