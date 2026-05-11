"use client";

import { useFormStatus } from "react-dom";
import { createSession } from "@/app/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-accent-600/30 transition hover:bg-accent-400 disabled:opacity-60"
    >
      {pending ? "Planning…" : "Research →"}
    </button>
  );
}

export function QueryBox() {
  return (
    <form action={createSession} className="relative w-full max-w-2xl">
      <input
        name="query"
        required
        autoFocus
        placeholder="Ask anything — products, research, comparisons, places, jobs…"
        className="w-full rounded-2xl border border-ink-600 bg-ink-800/70 px-5 py-5 pr-32 text-base text-white placeholder:text-ink-500 outline-none backdrop-blur transition focus:border-accent-500"
      />
      <Submit />
    </form>
  );
}
