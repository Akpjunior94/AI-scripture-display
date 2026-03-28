"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { VerseGroup } from "@/hooks/useDeepgram";

const VERSES_PER_PAGE = 5;

interface Props {
  group: VerseGroup;
  isLatest: boolean;
}

export default function VerseCard({ group, isLatest }: Props) {
  const [page, setPage] = useState(0);

  const totalVerses = group.verses.length;
  const totalPages = Math.ceil(totalVerses / VERSES_PER_PAGE);
  const start = page * VERSES_PER_PAGE;
  const visibleVerses = group.verses.slice(start, start + VERSES_PER_PAGE);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={`relative w-full max-w-3xl rounded-2xl border px-8 py-6 backdrop-blur-md transition-colors duration-700 ${
        isLatest
          ? "border-[var(--gold)]/60 bg-white/[0.07] shadow-[0_0_40px_rgba(212,168,83,0.15)]"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      {isLatest && (
        <motion.span
          layoutId="glow"
          className="absolute -inset-px -z-10 rounded-2xl bg-gradient-to-br from-[var(--gold)]/20 to-transparent blur-xl"
        />
      )}

      {/* Reference badge */}
      <p
        className={`mb-4 font-sans text-sm font-semibold tracking-widest uppercase ${
          isLatest ? "text-[var(--gold)]" : "text-[var(--gold)]/60"
        }`}
      >
        {group.reference}
      </p>

      {/* Verse list */}
      <div className="space-y-3">
        {visibleVerses.map((v) => (
          <div key={v.number} className="flex gap-3">
            <span
              className={`mt-1 shrink-0 font-sans text-xs font-bold ${
                isLatest ? "text-[var(--gold)]/80" : "text-[var(--gold)]/40"
              }`}
            >
              {v.number}
            </span>
            <p
              className={`font-serif leading-relaxed ${
                isLatest ? "text-xl text-white" : "text-lg text-gray-400"
              }`}
            >
              {v.text}
            </p>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-md px-3 py-1 text-xs font-medium text-gray-400 transition hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            &larr; Prev
          </button>
          <span className="text-xs text-gray-500">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-md px-3 py-1 text-xs font-medium text-gray-400 transition hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </motion.div>
  );
}
