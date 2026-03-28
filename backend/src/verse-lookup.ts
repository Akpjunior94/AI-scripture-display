/**
 * verse-lookup.ts — Look up verse text from a Bible API, with local JSON cache.
 *
 * Supports single verses and ranges (e.g. Genesis 1:1-5).
 * Uses the free bible-api.com service (no API key needed).
 * Falls back to local verses.json for offline/cached verses.
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const localVerses: Record<string, string> = require("./verses.json");

// In-memory cache
const cache = new Map<string, string>();

export interface SingleVerse {
  number: number;
  text: string;
}

export interface VerseRangeResult {
  reference: string;       // e.g. "Genesis 1:1-5"
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  verses: SingleVerse[];   // individual verses in order
}

async function fetchSingle(book: string, chapter: number, verse: number): Promise<string | null> {
  const key = `${book} ${chapter}:${verse}`;

  if (cache.has(key)) return cache.get(key)!;
  if (localVerses[key]) {
    cache.set(key, localVerses[key]);
    return localVerses[key];
  }

  try {
    const query = `${book}+${chapter}:${verse}`;
    const url = `https://bible-api.com/${encodeURIComponent(query)}?translation=kjv`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.text) {
      const text = data.text.replace(/\n/g, " ").trim();
      cache.set(key, text);
      localVerses[key] = text;
      return text;
    }
  } catch (err) {
    console.warn(`[verse-lookup] API fetch failed for "${key}":`, err);
  }
  return null;
}

/** Try fetching an entire range in one API call, otherwise fall back to individual fetches. */
export async function lookupVerseRange(
  book: string,
  chapter: number,
  verseStart: number,
  verseEnd: number
): Promise<VerseRangeResult | null> {
  const count = verseEnd - verseStart + 1;
  const refLabel = verseStart === verseEnd
    ? `${book} ${chapter}:${verseStart}`
    : `${book} ${chapter}:${verseStart}-${verseEnd}`;

  // For a single verse, just fetch it
  if (count === 1) {
    const text = await fetchSingle(book, chapter, verseStart);
    if (!text) return null;
    return {
      reference: refLabel,
      book, chapter, verseStart, verseEnd,
      verses: [{ number: verseStart, text }],
    };
  }

  // Try batch API call: bible-api.com supports ranges like "Genesis 1:1-5"
  try {
    const query = `${book}+${chapter}:${verseStart}-${verseEnd}`;
    const url = `https://bible-api.com/${encodeURIComponent(query)}?translation=kjv`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (resp.ok) {
      const data = await resp.json();
      if (data.verses && Array.isArray(data.verses) && data.verses.length > 0) {
        const verses: SingleVerse[] = data.verses.map((v: any) => ({
          number: v.verse,
          text: (v.text || "").replace(/\n/g, " ").trim(),
        }));
        // Cache each verse individually
        for (const v of verses) {
          const key = `${book} ${chapter}:${v.number}`;
          cache.set(key, v.text);
          localVerses[key] = v.text;
        }
        return { reference: refLabel, book, chapter, verseStart, verseEnd, verses };
      }
    }
  } catch (err) {
    console.warn(`[verse-lookup] Range API failed for "${refLabel}":`, err);
  }

  // Fallback: fetch individually
  const verses: SingleVerse[] = [];
  for (let v = verseStart; v <= verseEnd; v++) {
    const text = await fetchSingle(book, chapter, v);
    if (text) {
      verses.push({ number: v, text });
    }
  }
  if (verses.length === 0) return null;
  return { reference: refLabel, book, chapter, verseStart, verseEnd, verses };
}
