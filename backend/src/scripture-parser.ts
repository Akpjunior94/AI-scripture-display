/**
 * scripture-parser.ts — Detect Bible references in transcript text.
 *
 * Features:
 *   1. Normalize spoken number words to digits ("three sixteen" → "3 16")
 *   2. Full references: "Genesis chapter 1 verse 2"
 *   3. Context retention: "verse 3" reuses last book+chapter
 *   4. Verse ranges: "verse 1 to 5", "Genesis 1:1-5", "verses 1 through 3"
 */

export interface ParsedRef {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
}

/** Mutable context — tracks the last book+chapter so "verse 3" works. */
export interface ParserContext {
  book: string | null;
  chapter: number | null;
}

export function createParserContext(): ParserContext {
  return { book: null, chapter: null };
}

// ── Number-word → digit conversion ──────────────────────────────────
const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
};

function normalizeNumberWords(text: string): string {
  const words = text.split(/\s+/);
  const result: string[] = [];
  let i = 0;

  while (i < words.length) {
    const w = words[i].toLowerCase().replace(/[.,;:!?]+$/, "");

    if (
      ONES[w] !== undefined &&
      i + 1 < words.length &&
      words[i + 1].toLowerCase() === "hundred"
    ) {
      let val = ONES[w] * 100;
      i += 2;
      if (i < words.length && words[i].toLowerCase() === "and") i++;
      if (i < words.length) {
        const nxt = words[i].toLowerCase().replace(/[.,;:!?]+$/, "");
        if (TENS[nxt] !== undefined) {
          val += TENS[nxt];
          i++;
          if (
            i < words.length &&
            ONES[words[i].toLowerCase().replace(/[.,;:!?]+$/, "")] !== undefined
          ) {
            val += ONES[words[i].toLowerCase().replace(/[.,;:!?]+$/, "")];
            i++;
          }
        } else if (ONES[nxt] !== undefined) {
          val += ONES[nxt];
          i++;
        }
      }
      result.push(String(val));
      continue;
    }

    if (TENS[w] !== undefined) {
      let val = TENS[w];
      if (
        i + 1 < words.length &&
        ONES[words[i + 1].toLowerCase().replace(/[.,;:!?]+$/, "")] !== undefined
      ) {
        val += ONES[words[i + 1].toLowerCase().replace(/[.,;:!?]+$/, "")];
        i += 2;
      } else {
        i++;
      }
      result.push(String(val));
      continue;
    }

    if (ONES[w] !== undefined) {
      result.push(String(ONES[w]));
      i++;
      continue;
    }

    result.push(words[i]);
    i++;
  }

  return result.join(" ");
}

// ── Book aliases ────────────────────────────────────────────────────
const ALIASES: Record<string, string> = {
  gen: "Genesis", genesis: "Genesis",
  ex: "Exodus", exodus: "Exodus",
  lev: "Leviticus", leviticus: "Leviticus",
  num: "Numbers", numbers: "Numbers",
  deut: "Deuteronomy", deuteronomy: "Deuteronomy",
  josh: "Joshua", joshua: "Joshua",
  judg: "Judges", judges: "Judges",
  ruth: "Ruth",
  "1 sam": "1 Samuel", "1 samuel": "1 Samuel", "first samuel": "1 Samuel",
  "2 sam": "2 Samuel", "2 samuel": "2 Samuel", "second samuel": "2 Samuel",
  "1 kings": "1 Kings", "first kings": "1 Kings",
  "2 kings": "2 Kings", "second kings": "2 Kings",
  "1 chron": "1 Chronicles", "1 chronicles": "1 Chronicles", "first chronicles": "1 Chronicles",
  "2 chron": "2 Chronicles", "2 chronicles": "2 Chronicles", "second chronicles": "2 Chronicles",
  ezra: "Ezra", neh: "Nehemiah", nehemiah: "Nehemiah",
  esth: "Esther", esther: "Esther",
  job: "Job",
  ps: "Psalms", psalm: "Psalms", psalms: "Psalms",
  prov: "Proverbs", proverbs: "Proverbs",
  eccl: "Ecclesiastes", ecclesiastes: "Ecclesiastes",
  song: "Song of Solomon", "song of solomon": "Song of Solomon",
  isa: "Isaiah", isaiah: "Isaiah",
  jer: "Jeremiah", jeremiah: "Jeremiah",
  lam: "Lamentations", lamentations: "Lamentations",
  ezek: "Ezekiel", ezekiel: "Ezekiel",
  dan: "Daniel", daniel: "Daniel",
  hos: "Hosea", hosea: "Hosea",
  joel: "Joel", amos: "Amos",
  obad: "Obadiah", obadiah: "Obadiah",
  jonah: "Jonah", mic: "Micah", micah: "Micah",
  nah: "Nahum", nahum: "Nahum",
  hab: "Habakkuk", habakkuk: "Habakkuk",
  zeph: "Zephaniah", zephaniah: "Zephaniah",
  hag: "Haggai", haggai: "Haggai",
  zech: "Zechariah", zechariah: "Zechariah",
  mal: "Malachi", malachi: "Malachi",
  matt: "Matthew", matthew: "Matthew", mt: "Matthew",
  mark: "Mark", mk: "Mark",
  luke: "Luke", lk: "Luke",
  john: "John", jn: "John",
  acts: "Acts",
  rom: "Romans", romans: "Romans",
  "1 cor": "1 Corinthians", "1 corinthians": "1 Corinthians", "first corinthians": "1 Corinthians",
  "2 cor": "2 Corinthians", "2 corinthians": "2 Corinthians", "second corinthians": "2 Corinthians",
  gal: "Galatians", galatians: "Galatians",
  eph: "Ephesians", ephesians: "Ephesians",
  phil: "Philippians", philippians: "Philippians",
  col: "Colossians", colossians: "Colossians",
  "1 thess": "1 Thessalonians", "1 thessalonians": "1 Thessalonians", "first thessalonians": "1 Thessalonians",
  "2 thess": "2 Thessalonians", "2 thessalonians": "2 Thessalonians", "second thessalonians": "2 Thessalonians",
  "1 tim": "1 Timothy", "1 timothy": "1 Timothy", "first timothy": "1 Timothy",
  "2 tim": "2 Timothy", "2 timothy": "2 Timothy", "second timothy": "2 Timothy",
  titus: "Titus", philemon: "Philemon", phm: "Philemon",
  heb: "Hebrews", hebrews: "Hebrews",
  james: "James", jas: "James",
  "1 pet": "1 Peter", "1 peter": "1 Peter", "first peter": "1 Peter",
  "2 pet": "2 Peter", "2 peter": "2 Peter", "second peter": "2 Peter",
  "1 john": "1 John", "first john": "1 John",
  "2 john": "2 John", "second john": "2 John",
  "3 john": "3 John", "third john": "3 John",
  jude: "Jude",
  rev: "Revelation", revelation: "Revelation", revelations: "Revelation",
};

const aliasKeys = Object.keys(ALIASES).sort((a, b) => b.length - a.length);
const bookPattern = aliasKeys
  .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

// ── Regex patterns ──────────────────────────────────────────────────

// Full reference: "Genesis 1:2", "John 3:16-18", "Genesis chapter 1 verse 2 to 5"
// Group 1: book, Group 2: chapter, Group 3: verse start, Group 4: verse end (optional)
const FULL_REF_REGEX = new RegExp(
  `(?:^|\\b)(${bookPattern})` +
    `(?:\\s+chapter)?\\s+` +
    `(\\d{1,3})` +
    `(?:` +
      `(?:\\s*[:.\\-]\\s*|\\s+verse\\s+|\\s+)` +
      `(\\d{1,3})` +
      `(?:\\s*(?:to|through|\\-)\\s*(\\d{1,3}))?` +
    `)?` +
    `(?=\\s|[.,;!?]|$)`,
  "gi"
);

// Contextual verse-only: "verse 3", "verse 4 to 7", "verses 1 to 5"
// Group 1: verse start, Group 2: verse end (optional)
const VERSE_ONLY_REGEX = /\bverses?\s+(\d{1,3})(?:\s*(?:to|through|\-)\s*(\d{1,3}))?(?=\s|[.,;!?]|$)/gi;

export function parseScriptureRefs(text: string, ctx: ParserContext): ParsedRef[] {
  const normalized = normalizeNumberWords(text);
  const results: ParsedRef[] = [];
  const seen = new Set<string>();

  // 1. Full references (Book Chapter:Verse[-End])
  FULL_REF_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = FULL_REF_REGEX.exec(normalized)) !== null) {
    const rawBook = match[1].trim().toLowerCase();
    const book = ALIASES[rawBook];
    if (!book) continue;

    const chapter = parseInt(match[2], 10);
    if (chapter < 1) continue;

    const verseStart = match[3] ? parseInt(match[3], 10) : 1;
    if (verseStart < 1) continue;

    const verseEnd = match[4] ? Math.min(parseInt(match[4], 10), verseStart + 30) : verseStart;

    const key = `${book}:${chapter}:${verseStart}-${verseEnd}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Update context
    ctx.book = book;
    ctx.chapter = chapter;

    results.push({ book, chapter, verseStart, verseEnd: Math.max(verseStart, verseEnd) });
  }

  // 2. Contextual verse-only references ("verse 3", "verse 4 to 7")
  if (ctx.book && ctx.chapter) {
    VERSE_ONLY_REGEX.lastIndex = 0;
    while ((match = VERSE_ONLY_REGEX.exec(normalized)) !== null) {
      const verseStart = parseInt(match[1], 10);
      if (verseStart < 1) continue;

      const verseEnd = match[2] ? Math.min(parseInt(match[2], 10), verseStart + 30) : verseStart;

      const key = `${ctx.book}:${ctx.chapter}:${verseStart}-${verseEnd}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        book: ctx.book,
        chapter: ctx.chapter,
        verseStart,
        verseEnd: Math.max(verseStart, verseEnd),
      });
    }
  }

  return results;
}
