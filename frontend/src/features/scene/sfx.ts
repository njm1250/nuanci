"use client";

import { useSyncExternalStore } from "react";
import type { Expression } from "./types";

// 효과음은 파일 없이 Web Audio로 그때그때 합성한다. 브라우저 정책상 사용자가 누른 뒤에만 소리가 나므로 클릭 처리 안에서 부른다
const KEY = "nuanci.sound";
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function enabledSnapshot() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function useSoundEnabled() {
  return useSyncExternalStore(
    (on) => {
      listeners.add(on);
      return () => listeners.delete(on);
    },
    enabledSnapshot,
    () => true,
  );
}

export function toggleSound() {
  try {
    localStorage.setItem(KEY, enabledSnapshot() ? "off" : "on");
  } catch {}
  listeners.forEach((l) => l());
}

function audio() {
  if (!enabledSnapshot() || typeof window === "undefined") return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Tone = { type?: OscillatorType; from: number; to?: number; at?: number; dur: number; vol?: number; vibrato?: number };

function tone({ type = "square", from, to = from, at = 0, dur, vol = 0.08, vibrato = 0 }: Tone) {
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  if (vibrato) {
    const lfo = c.createOscillator();
    const depth = c.createGain();
    lfo.frequency.value = vibrato;
    depth.gain.value = from * 0.06;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + dur);
  }
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise({ at = 0, dur, vol = 0.12, from = 1800, to = 200 }: { at?: number; dur: number; vol?: number; from?: number; to?: number }) {
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime + at;
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  src.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(gain).connect(master);
  src.start(t);
}

export const sfx = {
  tap: () => tone({ from: 660, to: 990, dur: 0.05, vol: 0.05 }),
  // 상대 반응마다 다른 소리. 어색하거나 어이없는 반응일수록 과장한다
  react: (e: Expression) => {
    switch (e) {
      case "puzzled":
        tone({ type: "sine", from: 260, to: 620, at: 0.08, dur: 0.28, vol: 0.12, vibrato: 18 });
        break;
      case "awkward":
        tone({ type: "triangle", from: 330, to: 300, at: 0.08, dur: 0.22, vol: 0.12, vibrato: 7 });
        tone({ type: "triangle", from: 262, to: 220, at: 0.32, dur: 0.38, vol: 0.12, vibrato: 7 });
        break;
      case "dizzy":
        tone({ type: "square", from: 900, to: 110, at: 0.05, dur: 0.55, vol: 0.07 });
        noise({ at: 0.58, dur: 0.18, vol: 0.25, from: 400, to: 80 });
        break;
      case "stuffed":
        tone({ type: "square", from: 140, to: 90, at: 0.08, dur: 0.3, vol: 0.09, vibrato: 25 });
        break;
      case "happy":
        tone({ from: 1047, at: 0.08, dur: 0.1, vol: 0.06 });
        tone({ from: 1319, at: 0.18, dur: 0.16, vol: 0.06 });
        break;
      case "delighted":
        [523, 659, 784, 1047].forEach((f, i) => tone({ from: f, at: 0.06 + i * 0.06, dur: 0.12, vol: 0.06 }));
        break;
      default:
        tone({ type: "sine", from: 440, at: 0.08, dur: 0.12, vol: 0.06 });
    }
  },
  // 과장된 동작에 붙는 쿵 소리
  thud: () => noise({ at: 0.1, dur: 0.16, vol: 0.3, from: 300, to: 60 }),
  whoosh: () => noise({ dur: 0.4, vol: 0.14, from: 300, to: 3000 }),
  clear: () => {
    [523, 659, 784].forEach((f, i) => tone({ from: f, at: 0.9 + i * 0.09, dur: 0.12, vol: 0.06 }));
    tone({ from: 1047, at: 1.18, dur: 0.4, vol: 0.07 });
    tone({ type: "triangle", from: 523, at: 1.18, dur: 0.4, vol: 0.06 });
  },
};
