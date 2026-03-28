# AI Scripture Display

Real-time Bible verse display powered by voice recognition. A FastAPI backend listens to your microphone via **Faster-Whisper**, detects scripture references with **pythonbible**, looks up the full text from a local **SQLite** database, and pushes the result over **WebSockets** to a **Next.js** frontend that renders the verse with smooth animations.

---

## Project Structure

```
AI-scripture-display/
├── backend/
│   ├── main.py               # FastAPI app + WebSocket endpoint
│   ├── audio_listener.py     # Mic capture + Whisper transcription
│   ├── scripture_detector.py # pythonbible + regex reference detection
│   ├── verse_lookup.py       # SQLite query layer
│   ├── init_db.py            # Seed the Bible database
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx          # Landing page
│   │   │   ├── globals.css
│   │   │   └── display/
│   │   │       └── page.tsx      # Live verse display
│   │   ├── components/
│   │   │   ├── VerseCard.tsx
│   │   │   └── StatusBadge.tsx
│   │   └── hooks/
│   │       └── useVerseSocket.ts
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   └── next.config.js
└── README.md
```

---

## Quick Start

### 1. Backend

```bash
cd backend

# Create a virtual environment
python -m venv .venv && source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initialise the Bible database
python init_db.py

# Start the API server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

> **Note:** The first run will download the Whisper `base.en` model (~150 MB).

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open **http://localhost:3000/display** in your browser.

---

## How It Works

1. **Audio capture** — `sounddevice` streams 16 kHz mono audio from the default microphone.
2. **Transcription** — Every 3-second chunk is fed to **Faster-Whisper** (`base.en`, int8). Segments with an average log-probability below −1.0 (roughly <90 % confidence) are discarded.
3. **Scripture detection** — `pythonbible.get_references()` parses the transcript; a regex fallback catches patterns like *"John 3:16"*. A 5-second debounce prevents the same verse from being emitted repeatedly.
4. **Database lookup** — The detected reference is matched against the SQLite `verses` table to retrieve the full verse text.
5. **WebSocket broadcast** — The FastAPI server pushes `{ "reference": "...", "text": "..." }` to all connected clients.
6. **Display** — The Next.js `/display` page receives the JSON via a native `WebSocket`, and renders an animated `VerseCard` with Framer Motion.

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000/ws/verses` | WebSocket URL the frontend connects to |

You can set the env var in a `.env.local` file in the `frontend/` directory.

---

## Requirements

- **Python 3.11+**
- **Node.js 18+**
- A working microphone
