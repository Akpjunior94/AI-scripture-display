"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface SingleVerse {
  number: number;
  text: string;
}

export interface VerseGroup {
  reference: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  verses: SingleVerse[];
  timestamp: number;
}

export type Status = "idle" | "connecting" | "listening" | "error";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export function useDeepgram() {
  const [verseGroups, setVerseGroups] = useState<VerseGroup[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const cleanup = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    ctxRef.current?.close();
    ctxRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && ws.readyState <= WebSocket.OPEN) {
      ws.close();
    }
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setStatus("idle");
    setErrorMsg("");
  }, [cleanup]);

  const start = useCallback(async () => {
    if (wsRef.current) return;
    setStatus("connecting");
    setErrorMsg("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("listening");

        const audioCtx = new AudioContext({ sampleRate: 16000 });
        ctxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const float32 = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          ws.send(int16.buffer);
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "verses") {
            setVerseGroups((prev) => [
              {
                reference: msg.reference,
                book: msg.book,
                chapter: msg.chapter,
                verseStart: msg.verseStart,
                verseEnd: msg.verseEnd,
                verses: msg.verses,
                timestamp: Date.now(),
              },
              ...prev.slice(0, 19),
            ]);
          } else if (msg.type === "transcript") {
            setTranscript(msg.text);
          } else if (msg.type === "error") {
            setErrorMsg(msg.message || "Server error");
            setStatus("error");
            cleanup();
          }
        } catch {
          // ignore non-JSON frames
        }
      };

      ws.onclose = () => {
        if (!wsRef.current) return;
        cleanup();
        setStatus((prev) => (prev === "error" ? prev : "idle"));
      };

      ws.onerror = () => {
        setErrorMsg("Cannot connect to backend — is it running on " + WS_URL + "?");
        setStatus("error");
        cleanup();
      };
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone permission denied"
          : "Failed to start — check mic and backend";
      setErrorMsg(msg);
      setStatus("error");
    }
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return { verseGroups, transcript, status, errorMsg, start, stop };
}
