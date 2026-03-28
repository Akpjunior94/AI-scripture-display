"use client";

import { AnimatePresence } from "framer-motion";
import { useDeepgram } from "@/hooks/useDeepgram";
import VerseCard from "@/components/VerseCard";
import StatusBadge from "@/components/StatusBadge";

export default function DisplayPage() {
  const { verseGroups, transcript, status, errorMsg, start, stop } = useDeepgram();

  return (
    <main className="relative flex min-h-screen flex-col items-center bg-[var(--bg-dark)] px-6 py-10">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="mb-8 flex w-full max-w-3xl items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-[var(--gold)]">
          Scripture Display
        </h1>
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          {status === "idle" || status === "error" ? (
            <button
              onClick={start}
              className="rounded-lg bg-[var(--gold)] px-5 py-2 text-sm font-semibold text-black transition hover:brightness-110"
            >
              Start Listening
            </button>
          ) : (
            <button
              onClick={stop}
              className="rounded-lg border border-white/20 bg-white/5 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Stop
            </button>
          )}
        </div>
      </header>

      {/* ── Error banner ──────────────────────────────────────── */}
      {status === "error" && errorMsg && (
        <div className="mb-6 w-full max-w-3xl rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-3">
          <p className="text-sm text-red-400">{errorMsg}</p>
        </div>
      )}

      {/* ── Live transcript ───────────────────────────────────── */}
      {transcript && status === "listening" && (
        <div className="mb-6 w-full max-w-3xl rounded-xl border border-white/5 bg-white/[0.03] px-6 py-3">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500 mb-1">
            Live Transcript
          </p>
          <p className="text-sm text-gray-400 italic leading-relaxed">
            {transcript}
          </p>
        </div>
      )}

      {/* ── Verse stream ──────────────────────────────────────── */}
      <section className="flex w-full flex-col items-center gap-5">
        <AnimatePresence mode="popLayout">
          {verseGroups.map((g, i) => (
            <VerseCard
              key={g.reference + g.timestamp}
              group={g}
              isLatest={i === 0}
            />
          ))}
        </AnimatePresence>

        {verseGroups.length === 0 && (
          <div className="mt-24 flex flex-col items-center gap-4 text-center">
            {/* Pulsing mic icon */}
            <div className="relative flex h-20 w-20 items-center justify-center">
              {status === "listening" && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--gold)]/20" />
              )}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-10 w-10 text-[var(--gold)]/70"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
                />
              </svg>
            </div>
            <p className="text-lg text-gray-500">
              {status === "idle"
                ? 'Click "Start Listening" to begin'
                : status === "connecting"
                  ? "Connecting\u2026"
                  : status === "error"
                    ? "Microphone or connection error"
                    : "Waiting for a scripture reference\u2026"}
            </p>
            <p className="text-sm text-gray-600">
              Speak a verse like &ldquo;John 3:16&rdquo; and it will appear
              here in real time.
            </p>
          </div>
        )}
      </section>

      {/* Subtle radial glow behind cards */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(212,168,83,0.06)_0%,transparent_70%)]" />
    </main>
  );
}
