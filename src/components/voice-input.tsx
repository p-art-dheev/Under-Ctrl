"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Browser speech recognition (Web Speech API). It is not in TypeScript's DOM
// types, and Chromium-based browsers and Safari implement it behind a prefix.
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

const ctor = (): RecognitionCtor | null => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const subscribe = () => () => {};

const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. Allow it in the browser's site settings.",
  "service-not-allowed": "Microphone access was blocked. Allow it in the browser's site settings.",
  "no-speech": "I didn't hear anything. Try again.",
  "audio-capture": "No microphone was found.",
  network: "Speech recognition needs a network connection.",
};

/**
 * Dictation button. `onStart` fires when listening begins; `onText` receives all
 * text spoken so far in that session (interim results included), so the parent
 * can merge it with whatever was typed before. Renders nothing in browsers without speech recognition.
 */
export function VoiceInput({ onStart, onText, onError, disabled, className }: { onStart?: () => void; onText: (spoken: string) => void; onError?: (message: string) => void; disabled?: boolean; className?: string }) {
  const supported = useSyncExternalStore(subscribe, () => ctor() !== null, () => false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  useEffect(() => () => rec.current?.stop(), []);
  if (!supported) return null;

  const toggle = () => {
    if (listening) return rec.current?.stop();
    const R = ctor()!;
    const r = new R();
    r.lang = navigator.language || "en-US";
    r.continuous = true;
    r.interimResults = true;
    let spoken = "";
    r.onresult = (e) => {
      spoken = Array.from(e.results, (res) => res[0].transcript).join("").trim();
      onText(spoken);
    };
    r.onerror = (e) => {
      if (e.error !== "aborted") onError?.(ERRORS[e.error] ?? "Voice input stopped unexpectedly.");
    };
    r.onend = () => {
      setListening(false);
      rec.current = null;
    };
    rec.current = r;
    try {
      onStart?.();
      r.start();
      setListening(true);
    } catch {
      rec.current = null;
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-pressed={listening}
      aria-label={listening ? "Stop voice input" : "Speak your message"}
      title={listening ? "Stop voice input" : "Speak your message"}
      className={cn(
        "relative grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-brand hover:text-brand disabled:opacity-50",
        listening && "border-danger bg-danger-soft text-danger hover:border-danger hover:text-danger",
        className,
      )}
    >
      {listening ? <span className="absolute inset-0 rounded-lg border border-danger motion-safe:animate-ping" aria-hidden /> : null}
      {listening ? <MicOff size={16} aria-hidden /> : <Mic size={16} aria-hidden />}
    </button>
  );
}
