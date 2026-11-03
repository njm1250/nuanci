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

function create() {
  if (ctx || !enabledSnapshot() || typeof window === "undefined") return;
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
}

function audio() {
  if (!enabledSnapshot() || typeof window === "undefined") return null;
  create();
  if (ctx!.state === "suspended") void ctx!.resume();
  return ctx;
}

// AudioContext를 처음 만드는 데 시간이 꽤 걸려서, 고르는 클릭 안에서 만들면 그 클릭의 반응이 늦어진다.
// 화면을 처음 누르기 시작하는 순간(pointerdown·keydown) 미리 만들어 두고, 소리는 클릭에서 낸다. 정리 함수를 돌려주어 effect에서 쓴다
export function primeAudio() {
  window.addEventListener("pointerdown", create, { once: true, capture: true });
  window.addEventListener("keydown", create, { once: true, capture: true });
  return () => {
    window.removeEventListener("pointerdown", create, { capture: true });
    window.removeEventListener("keydown", create, { capture: true });
  };
}

// 고역을 한 번 깎아 귀를 찌르는 쇳소리를 막는다. 판정음·보상음은 모두 이 필터를 거친다
let tone: BiquadFilterNode | null = null;
function toneOut(c: AudioContext) {
  if (!tone) {
    tone = c.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 4200;
    tone.Q.value = 0.5;
    tone.connect(master!);
  }
  return tone;
}

let click: AudioBuffer | null = null;
function clickBuffer(c: AudioContext) {
  if (!click) {
    click = c.createBuffer(1, Math.ceil(c.sampleRate * 0.03), c.sampleRate);
    const data = click.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return click;
}

// 나무 건반(마림바)처럼: 채가 닿는 짧은 '톡'과 둥근 몸통음. 배음은 금방 사라지고 기본음만 남는다.
// 사인파에 정수배 배음만 얹으면 휴대폰 알림음처럼 들려서, 배음을 건반처럼 어긋나게 두고 칠 때마다 높이를 아주 조금 흔든다
function mallet(freq: number, at = 0, dur = 0.5, vol = 0.16) {
  const c = audio();
  if (!c || !master) return;
  const out = toneOut(c);
  const t = c.currentTime + at;
  const f = freq * (0.996 + Math.random() * 0.008);
  for (const [ratio, level, life] of [
    [1, 1, dur],
    [3.93, 0.22, dur * 0.18],
    [9.2, 0.05, 0.04],
  ]) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.value = f * ratio;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * level, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + life);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + life + 0.05);
  }
  const src = c.createBufferSource();
  const band = c.createBiquadFilter();
  const g = c.createGain();
  src.buffer = clickBuffer(c);
  band.type = "bandpass";
  band.frequency.value = Math.min(f * 2, 3000);
  band.Q.value = 2;
  g.gain.setValueAtTime(vol * 0.5, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
  src.connect(band).connect(g).connect(out);
  src.start(t);
}

// 틀렸을 때: 아래로 미끄러지는 둥근 "뿌웅". 음이 살짝 처져서 버저보다 우스꽝스럽다
function droop(from: number, to: number, at = 0, dur = 0.28, vol = 0.15) {
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  filter.type = "lowpass";
  filter.frequency.value = 900;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(filter).connect(gain).connect(toneOut(c));
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

// 상자·펀치용 낮은 북 "툭": 음이 빠르게 떨어지는 사인. 휴대폰 스피커가 150Hz 아래를 거의 못 내서 그보다 높게 친다
function thump(freq: number, at = 0, vol = 0.22) {
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq * 1.8, t);
  osc.frequency.exponentialRampToValueAtTime(freq, t + 0.05);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  osc.connect(gain).connect(toneOut(c));
  osc.start(t);
  osc.stop(t + 0.2);
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

// 대사 한 줄이 뜰 때 나는 짧고 작은 "띡". 고역을 깎은 삼각파라 거슬리지 않고, 말하는 사람마다 높이가 조금 달라 누가 말하는지 귀로도 구분된다.
// 같은 소리가 반복돼도 기계적으로 들리지 않게 높이를 살짝씩 흔든다
const BLIP_PITCH = { partner: 620, me: 500, mochi: 860, narration: 400 } as const;
function blip(kind: keyof typeof BLIP_PITCH) {
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.value = BLIP_PITCH[kind] * (0.97 + Math.random() * 0.06);
  filter.type = "lowpass";
  filter.frequency.value = 1800;
  const vol = kind === "narration" ? 0.025 : 0.04;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  osc.connect(filter).connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + 0.09);
}

const FANFARES = [
  [523, 659, 784, 1047],
  [392, 523, 659, 784, 1047],
  [659, 587, 659, 784, 1047],
  [523, 784, 659, 1047],
];

export const sfx = {
  // O: 위로 올라가는 두 음 "또롱"
  good: () => {
    mallet(659, 0.02, 0.35);
    mallet(988, 0.11, 0.55);
  },
  // △: 중간 높이 한 음 "통"
  meh: () => mallet(523, 0.02, 0.4, 0.13),
  // X: 아래로 처지는 "뿌웅"
  bad: () => droop(392, 233, 0.02, 0.36),
  whoosh: whooshNoise,
  blip,
  // 새 물건을 얻을 때 올라가는 네 음. 팡파르 뒤에 이어지도록 at으로 늦출 수 있다
  reward: (at = 0) => {
    [784, 1047, 1319, 1568].forEach((f, i) => mallet(f, at + i * 0.07, i === 3 ? 0.7 : 0.25, 0.12));
  },
  // 연속 기록이 이어질 때: 짧게 올라가는 두 음
  streak: (at = 0) => {
    mallet(494, at, 0.25, 0.12);
    mallet(740, at + 0.09, 0.45, 0.12);
  },
  // 엔딩 펀치라인 뒤 개그 마무리 "두둥 탁"
  punch: () => {
    thump(196, 0);
    thump(147, 0.12);
    mallet(1568, 0.3, 0.25, 0.06);
  },
  // 깜짝 상자가 열리는 소리: 낮게 툭 한 번
  boxOpen: () => thump(220, 0),
  // 장면을 끝내면 정답 여부와 상관없이 판정음 뒤에 팡파르가 울린다. 매번 같은 소리에 무뎌지지 않게 멜로디는 무작위로 고른다
  clear: () => {
    const melody = FANFARES[Math.floor(Math.random() * FANFARES.length)];
    melody.forEach((f, i) => mallet(f, 0.75 + i * 0.08, i === melody.length - 1 ? 0.7 : 0.3, 0.12));
  },
};
