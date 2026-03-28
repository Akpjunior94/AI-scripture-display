# AI Scripture Display

Real-time Bible verse display powered by voice recognition. A **Node.js** backend streams microphone audio to **Deepgram Nova-3** for live transcription, detects spoken scripture references (including number words like "three sixteen"), looks up the full verse text from a local cache or the **bible-api.com** API, and pushes the result over **WebSockets** to a **Next.js 15** frontend that renders animated verse cards.

---

## Features

- **Live speech-to-text** — Deepgram Nova-3 with VAD, smart formatting, and interim results
- **Spoken number support** — recognizes "John three sixteen" as well as "John 3:16"
- **Context retention** — say "Genesis 1 verse 2", then just "verse 3" and it continues in the same chapter
- **Verse ranges** — say "Genesis 1:1-5" or "verses 1 through 5" to fetch multiple verses at once
- **Pagination** — groups of 6+ verses paginate automatically (5 per page)
- **Full Bible coverage** — 110+ popular KJV verses cached locally; any other verse is fetched from bible-api.com on demand
- **5-second debounce** — prevents the same verse from being shown repeatedly
- **Animated UI** — Framer Motion spring animations, golden glow on the latest verse, dark theme

---

## Project Structure

```
AI-scripture-display/
├── backend/
│   ├── src/
│   │   ├── index.ts              # HTTP + WebSocket server (port 8000)
│   │   ├── scripture-parser.ts   # Number normalization + regex detection
│   │   ├── verse-lookup.ts       # Local JSON + Bible API lookup
│   │   └── verses.json           # 110+ pre-cached KJV verses
│   ├── .env.example              # Environment variable template
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx        # Root layout + metadata
│   │   │   ├── page.tsx          # Landing page
│   │   │   ├── globals.css       # Tailwind + custom CSS vars
│   │   │   └── display/
│   │   │       └── page.tsx      # Live verse display page
│   │   ├── components/
│   │   │   ├── VerseCard.tsx     # Animated verse card with pagination
│   │   │   └── StatusBadge.tsx   # Connection status indicator
│   │   └── hooks/
│   │       └── useDeepgram.ts    # Mic capture + WebSocket streaming hook
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   └── next.config.js
├── .gitignore
└── README.md
```

---

## Prerequisites

- **Node.js 18+**
- A **Deepgram API key** — get a free one at [console.deepgram.com](https://console.deepgram.com)
- A working microphone

---

## Quick Start

### 1. Backend

```bash
cd backend
npm install

# Create .env from the template and add your Deepgram key
cp .env.example .env
# Edit .env and set DEEPGRAM_API_KEY=your_key_here

# Start the dev server (with hot-reload)
npm run dev
```

The backend runs on **ws://localhost:8000**. You can verify with:

```bash
curl http://localhost:8000/health
# → {"status":"ok"}
```

### 2. Frontend

```bash
cd frontend
npm install

# Start the dev server
npm run dev
```

Open **http://localhost:3000/display** in your browser and click **"Start Listening"**.

---

## How It Works

```
Browser Mic → [float32 → int16 PCM] → WebSocket → Backend → Deepgram (speech-to-text)
                                                                   ↓
                                                       transcript text
                                                                   ↓
                                                       normalize number words
                                                       ("three sixteen" → "3 16")
                                                                   ↓
                                                       regex → { book, chapter, verse(s) }
                                                                   ↓
                                                       lookup → local JSON or bible-api.com
                                                                   ↓
                                       WebSocket ← { type: "verse", reference, verses[] }
                                                                   ↓
                                                       UI renders animated VerseCard
```

### Detailed pipeline

1. **Mic capture** — the browser uses `navigator.mediaDevices.getUserMedia()` to capture mono 16kHz audio, converts float32 → int16 PCM via a `ScriptProcessorNode`, and streams binary chunks over a WebSocket.

2. **Deepgram transcription** — the backend opens a live session with Deepgram Nova-3 (`linear16`, `16000 Hz`). Interim results are shown to the user as live transcript text. Only final transcripts are used for verse detection.

3. **Scripture parsing** — the parser first normalizes spoken number words to digits (e.g. "twenty three" → "23", "one hundred nineteen" → "119"), then runs a regex that matches 100+ book name aliases with chapter:verse patterns. It also handles:
   - Context retention: "verse 3" reuses the last mentioned book + chapter
   - Ranges: "Genesis 1:1-5", "verses 1 to 5", "verse 1 through 3"

4. **Verse lookup** — checked in order: in-memory cache → local `verses.json` (110+ KJV verses) → [bible-api.com](https://bible-api.com) (full Bible, KJV translation). Results are cached for the session.

5. **Display** — the frontend receives verse JSON via WebSocket and renders animated `VerseCard` components with Framer Motion. The latest verse gets a golden glow. Multi-verse groups paginate at 5 verses per page.

---

## Configuration

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `DEEPGRAM_API_KEY` | *(required)* | Your Deepgram API key |
| `PORT` | `8000` | WebSocket server port |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed CORS/WS origin |

### Frontend

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000` | Backend WebSocket URL |

Set frontend env vars in `frontend/.env.local`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Speech-to-text | [Deepgram](https://deepgram.com) Nova-3 (live WebSocket) |
| Backend runtime | Node.js + TypeScript (tsx) |
| WebSocket server | [ws](https://github.com/websockets/ws) |
| Bible text | Local JSON cache + [bible-api.com](https://bible-api.com) (KJV) |
| Frontend framework | [Next.js 15](https://nextjs.org) (App Router) |
| UI library | [React 19](https://react.dev) |
| Animations | [Framer Motion 11](https://www.framer.com/motion/) |
| Styling | [Tailwind CSS 3.4](https://tailwindcss.com) |

---

## License

MIT
