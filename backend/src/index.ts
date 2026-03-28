/**
 * index.ts — Standalone Node.js WebSocket server.
 *
 * Flow:
 *   1. Browser connects via ws://localhost:8000
 *   2. Browser sends raw int16 PCM audio chunks
 *   3. Server pipes audio to Deepgram Nova-3 for live transcription
 *   4. Server parses scripture references from transcripts
 *   5. Server sends detected verses back to the browser
 */

import "dotenv/config";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { parseScriptureRefs, createParserContext } from "./scripture-parser.js";
import { lookupVerseRange } from "./verse-lookup.js";

const PORT = parseInt(process.env.PORT || "8000", 10);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || "";

if (!DEEPGRAM_API_KEY) {
  console.error(
    "\n⚠️  DEEPGRAM_API_KEY is not set!\n" +
      "   Get a free key at https://console.deepgram.com\n" +
      "   Then add it to backend/.env\n"
  );
}

// ── Debounce: avoid emitting the same verse repeatedly ───────────────
const lastEmitted = new Map<string, number>();
const DEBOUNCE_MS = 5000;

function shouldEmit(reference: string): boolean {
  const now = Date.now();
  const last = lastEmitted.get(reference) ?? 0;
  if (now - last < DEBOUNCE_MS) return false;
  lastEmitted.set(reference, now);
  return true;
}

// ── HTTP server (health check + CORS preflight) ─────────────────────
const httpServer = createServer((req, res) => {
  // CORS headers for all responses
  res.setHeader("Access-Control-Allow-Origin", FRONTEND_URL);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  res.writeHead(404);
  res.end();
});

// ── WebSocket server ─────────────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (clientWs: WebSocket, req) => {
  // Basic origin check
  const origin = req.headers.origin;
  if (origin && origin !== FRONTEND_URL) {
    console.warn(`[ws] Rejected connection from origin: ${origin}`);
    clientWs.close(1008, "Origin not allowed");
    return;
  }

  console.log("[ws] Client connected");

  if (!DEEPGRAM_API_KEY) {
    clientWs.send(
      JSON.stringify({
        type: "error",
        message: "DEEPGRAM_API_KEY not configured on the server.",
      })
    );
    clientWs.close();
    return;
  }

  // Open a live transcription session with Deepgram
  const deepgram = createClient(DEEPGRAM_API_KEY);
  const dgConnection = deepgram.listen.live({
    model: "nova-3",
    language: "en",
    smart_format: true,
    punctuate: true,
    interim_results: true,
    utterance_end_ms: 1500,
    vad_events: true,
    encoding: "linear16",
    sample_rate: 16000,
    channels: 1,
  });

  let transcriptBuffer = "";
  const parserCtx = createParserContext();

  dgConnection.on(LiveTranscriptionEvents.Open, () => {
    console.log("[deepgram] Connection opened");
  });

  dgConnection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
    const alt = data.channel?.alternatives?.[0];
    if (!alt) return;

    const text = alt.transcript;
    if (!text) return;

    const isFinal = data.is_final;

    // Send live transcript to client
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: "transcript", text, isFinal }));
    }

    // Only parse final transcripts for verse detection
    if (isFinal) {
      transcriptBuffer += " " + text;
      console.log(`[transcript] Final: "${text}"`);
      console.log(`[context] Book: ${parserCtx.book}, Chapter: ${parserCtx.chapter}`);

      const refs = parseScriptureRefs(transcriptBuffer, parserCtx);
      if (refs.length > 0) {
        console.log(`[parser] Found ${refs.length} ref(s):`, refs);
      }
      for (const ref of refs) {
        const refKey = `${ref.book}:${ref.chapter}:${ref.verseStart}-${ref.verseEnd}`;
        if (!shouldEmit(refKey)) continue;

        lookupVerseRange(ref.book, ref.chapter, ref.verseStart, ref.verseEnd).then((result) => {
          if (result) {
            console.log(`[verse] Emitting: ${result.reference} (${result.verses.length} verses)`);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: "verses",
                  reference: result.reference,
                  book: result.book,
                  chapter: result.chapter,
                  verseStart: result.verseStart,
                  verseEnd: result.verseEnd,
                  verses: result.verses,
                })
              );
            }
          } else {
            console.log(`[verse] Not found: ${ref.book} ${ref.chapter}:${ref.verseStart}-${ref.verseEnd}`);
          }
        });
      }

      // Clear the buffer after parsing — we've consumed these words.
      // Keep only a small tail for context across transcript boundaries.
      transcriptBuffer = transcriptBuffer.slice(-100);
    }
  });

  dgConnection.on(LiveTranscriptionEvents.Error, (err: any) => {
    console.error("[deepgram] Error:", err);
  });

  dgConnection.on(LiveTranscriptionEvents.Close, () => {
    console.log("[deepgram] Connection closed");
  });

  // Forward audio from browser → Deepgram
    clientWs.on("message", (data: Buffer) => {
      if (dgConnection.getReadyState() === WebSocket.OPEN) {
        dgConnection.send(new Uint8Array(data).buffer);
      }
    });

    clientWs.on("close", () => {
      console.log("[ws] Client disconnected");
      dgConnection.requestClose();
    });
  });

// ── Start ────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n✓ Backend WebSocket server running on ws://localhost:${PORT}`);
  console.log(`  Health check: http://localhost:${PORT}/health\n`);
});
