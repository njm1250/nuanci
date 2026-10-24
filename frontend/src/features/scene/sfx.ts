"use client";

import { useSyncExternalStore } from "react";

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

// 실로폰처럼 맑게 울리도록 기본음에 배음을 얹고 빠르게 사라지게 한다. 단순한 삐 소리보다 악기 음색이 더 잘 알아들어진다
function bell(freq: number, at = 0, dur = 0.45, vol = 0.12) {
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime + at;
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  out.connect(master);
  for (const [ratio, level] of [
    [1, 1],
    [2, 0.35],
    [4.01, 0.12],
  ]) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * ratio;
    g.gain.value = level;
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
}

// 틀렸을 때 쓰는 낮고 둥근 음. 거친 버저 대신 고역을 깎은 삼각파로 부드럽게 낸다
function low(freq: number, at = 0, dur = 0.2, vol = 0.14) {
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  filter.type = "lowpass";
  filter.frequency.value = 1200;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(filter).connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function whooshNoise() {
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime;
  const dur = 0.35;
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  src.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(300, t);
  filter.frequency.exponentialRampToValueAtTime(2500, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.08, t + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(gain).connect(master);
  src.start(t);
}

export const sfx = {
  // 자연스러움: 위로 올라가는 맑은 두 음 "띠링"
  good: () => {
    bell(1319, 0.02, 0.35);
    bell(1976, 0.11, 0.5);
  },
  // 맥락 주의: 중간 높이 한 음 "통"
  meh: () => bell(880, 0.02, 0.4, 0.1),
  // 직역: 아래로 내려가는 부드러운 두 음 "뚜둥"
  bad: () => {
    low(392, 0.02, 0.16);
    low(311, 0.17, 0.3);
  },
  whoosh: whooshNoise,
  // 장면을 끝내면 판정음 뒤에 짧은 팡파르
  clear: () => [1047, 1319, 1568, 2093].forEach((f, i) => bell(f, 0.7 + i * 0.08, i === 3 ? 0.7 : 0.3, 0.09)),
};
