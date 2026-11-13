"use client";

import { useSyncExternalStore } from "react";
import type { Expression } from "./types";

// 악기 소리는 실제 악기 녹음 사운드폰트(GeneralUser GS, 상업 이용 자유)로 연주해 scripts/sfx/make.py로 다듬은 /sfx/*.mp3, 말소리는 포만트 성대 음절이다. 이 에셋을 Web Audio 버퍼로 재생해
// 오실레이터 특유의 기계적 '띠링' 없이 자연스러운 나무·악기 촉감과 동물의숲식 말소리를 낸다
const KEY = "nuanci.sound";
const listeners = new Set<() => void>();

type DecodedClip = {
  buffer: AudioBuffer;
  onset: number;
};

type SfxName =
  | "tap"
  | "good"
  | "good-sparkle"
  | "meh"
  | "meh-puzzled"
  | "bad"
  | "bad-dizzy"
  | "bad-shocked"
  | "flip"
  | "equip"
  | "place"
  | "whoosh"
  | "box-shake"
  | "box-open"
  | "punch"
  | "streak"
  | "reward"
  | "clear-1"
  | "clear-2"
  | "clear-3"
  | "poke-partner"
  | "poke-me"
  | "voice-partner"
  | "voice-me"
  | "voice-mochi";

const CORE_PREFETCH: SfxName[] = [
  "tap",
  "good",
  "good-sparkle",
  "meh",
  "meh-puzzled",
  "bad",
  "bad-dizzy",
  "bad-shocked",
  "whoosh",
  "flip",
  "voice-partner",
  "voice-me",
  "voice-mochi",
];

const ALL_CLIPS: SfxName[] = [
  ...CORE_PREFETCH,
  "equip",
  "place",
  "box-shake",
  "box-open",
  "punch",
  "streak",
  "reward",
  "clear-1",
  "clear-2",
  "clear-3",
  "poke-partner",
  "poke-me",
];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const rawCache = new Map<SfxName, Promise<ArrayBuffer | null>>();
const clipCache = new Map<SfxName, Promise<DecodedClip | null>>();
const readyClips = new Map<SfxName, DecodedClip>();
let activeSpeechStop: (() => void) | null = null;

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
  const nextOn = !enabledSnapshot();
  try {
    localStorage.setItem(KEY, nextOn ? "on" : "off");
  } catch {}
  if (!nextOn) stopSpeech();
  listeners.forEach((l) => l());
  if (nextOn) sfx.soundOn();
}

export function stopSpeech() {
  activeSpeechStop?.();
  activeSpeechStop = null;
}

// MP3 인코더 앞부분 무음 패딩을 건너뛰도록 실제 소리 시작 지점을 찾는다
function detectOnset(buf: AudioBuffer) {
  const len = Math.min(buf.length, Math.floor(buf.sampleRate * 0.08));
  for (let i = 0; i < len; i++) {
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      if (Math.abs(buf.getChannelData(ch)[i]) > 0.0025) {
        return Math.max(0, (i - 8) / buf.sampleRate);
      }
    }
  }
  return 0;
}

function fetchRaw(name: SfxName): Promise<ArrayBuffer | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  let p = rawCache.get(name);
  if (!p) {
    p = fetch(`/sfx/${name}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null);
    rawCache.set(name, p);
  }
  return p;
}

function createAudio() {
  if (ctx || !enabledSnapshot() || typeof window === "undefined") return;
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = 0.85;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -4;
  limiter.knee.value = 8;
  limiter.ratio.value = 6;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.06;
  master.connect(limiter).connect(ctx.destination);
}

function audio() {
  if (!enabledSnapshot() || typeof window === "undefined") return null;
  createAudio();
  if (ctx && ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function loadClip(c: AudioContext, name: SfxName): Promise<DecodedClip | null> {
  const cached = readyClips.get(name);
  if (cached) return Promise.resolve(cached);
  let p = clipCache.get(name);
  if (!p) {
    p = fetchRaw(name)
      .then(async (raw) => {
        if (!raw) return null;
        const decoded = await c.decodeAudioData(raw.slice(0));
        const clip = { buffer: decoded, onset: detectOnset(decoded) };
        readyClips.set(name, clip);
        return clip;
      })
      .catch(() => null);
    clipCache.set(name, p);
  }
  return p;
}

function warmUpAll() {
  createAudio();
  if (ctx && ctx.state === "suspended") void ctx.resume();
  if (!ctx) return;
  for (const name of ALL_CLIPS) void loadClip(ctx, name);
}

// 화면 진입 직후 작은 오디오 파일을 미리 받아 두고, 첫 사용자 입력 순간 AudioContext를 열어 바로 디코딩한다
export function primeAudio() {
  if (enabledSnapshot()) {
    for (const name of CORE_PREFETCH) void fetchRaw(name);
  }
  window.addEventListener("pointerdown", warmUpAll, { once: true, capture: true });
  window.addEventListener("keydown", warmUpAll, { once: true, capture: true });
  return () => {
    window.removeEventListener("pointerdown", warmUpAll, { capture: true });
    window.removeEventListener("keydown", warmUpAll, { capture: true });
  };
}

function playClip(
  name: SfxName,
  { at = 0, vol = 0.85, rate = 1 }: { at?: number; vol?: number; rate?: number } = {},
) {
  const c = audio();
  if (!c || !master) return;
  const out = master;

  const trigger = (clip: DecodedClip, delayOffset = 0) => {
    const t = c.currentTime + Math.max(0, at - delayOffset);
    const src = c.createBufferSource();
    src.buffer = clip.buffer;
    src.playbackRate.value = rate;
    const gain = c.createGain();
    gain.gain.value = vol;
    src.connect(gain).connect(out);
    src.start(t, clip.onset);
  };

  const ready = readyClips.get(name);
  if (ready) {
    trigger(ready);
    return;
  }
  const requestedAt = performance.now();
  void loadClip(c, name).then((clip) => {
    if (!clip || !enabledSnapshot()) return;
    const elapsed = (performance.now() - requestedAt) / 1000;
    if (elapsed > 0.6 && at === 0) return;
    trigger(clip, elapsed);
  });
}

const VOICE_SLOTS = 6;
const VOICE_SLOT_SEC = 0.12;
const VOICE_PLAY_DUR = 0.072;

// 영어·한국어 문장의 실제 음절·띄어쓰기·쉼표·문장 부호(?·!)를 읽어 동물의숲식 말소리 타임라인을 만든다
function tokenizeSpeech(line: string, stepSec: number) {
  const clean = line.trim();
  const steps: { at: number; accent: number; slot: number }[] = [];
  let cursor = 0;
  let i = 0;

  while (i < clean.length && steps.length < 22) {
    const ch = clean[i];
    if (ch === " ") {
      cursor += 0.024;
      i++;
      continue;
    }
    if (ch === "," || ch === "…" || ch === ";") {
      cursor += 0.055;
      i++;
      continue;
    }
    if (/[가-힣]/.test(ch)) {
      steps.push({ at: cursor, accent: 1, slot: ch.charCodeAt(0) % VOICE_SLOTS });
      cursor += stepSec;
      i++;
      continue;
    }
    if (/[aeiouyAEIOUY]/.test(ch)) {
      let end = i + 1;
      while (end < clean.length && /[aeiouyAEIOUY]/.test(clean[end])) end++;
      const wordEnd = end >= clean.length || !/[a-zA-Z]/.test(clean[end]);
      const silentE = wordEnd && end - i === 1 && (ch === "e" || ch === "E") && steps.length > 0 && clean[i - 1] !== " ";
      if (!silentE) {
        steps.push({ at: cursor, accent: 1, slot: ch.toLowerCase().charCodeAt(0) % VOICE_SLOTS });
        cursor += stepSec;
      }
      i = end;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      steps.push({ at: cursor, accent: 1.04, slot: i % VOICE_SLOTS });
      cursor += stepSec;
    }
    i++;
  }

  if (steps.length === 0 && clean.length > 0) {
    steps.push({ at: 0, accent: 1, slot: 0 }, { at: stepSec, accent: 0.95, slot: 1 });
  } else if (steps.length === 1 && clean.length > 1) {
    steps.push({ at: stepSec * 0.85, accent: 0.92, slot: (steps[0].slot + 1) % VOICE_SLOTS });
  }
  return steps;
}

const VOICE_CLIP: Record<"partner" | "me" | "mochi", { clip: SfxName; step: number; vol: number }> = {
  partner: { clip: "voice-partner", step: 0.064, vol: 0.52 },
  me: { clip: "voice-me", step: 0.06, vol: 0.5 },
  mochi: { clip: "voice-mochi", step: 0.068, vol: 0.54 },
};

// 대사가 뜨면 문장 길이만큼 성대 음절 버퍼를 억양에 맞춰 재생하고, 다음 대사로 넘기면 즉시 끊는 정리 함수를 돌려준다
function blip(kind: "partner" | "me" | "mochi" | "narration", line = ""): () => void {
  stopSpeech();
  if (kind === "narration" || line === "……") {
    playClip("tap", { vol: 0.16, rate: 0.78 });
    return () => {};
  }
  const c = audio();
  if (!c || !master) return () => {};

  const profile = VOICE_CLIP[kind];
  const trimmed = line.trim();
  const isQuestion = trimmed.endsWith("?");
  const isExclaim = trimmed.endsWith("!");
  const stepSec = isExclaim ? profile.step * 0.88 : profile.step;
  const tokens = tokenizeSpeech(trimmed || "...", stepSec);

  const speechBus = c.createGain();
  speechBus.gain.value = 1;
  speechBus.connect(master);
  const sources: AudioBufferSourceNode[] = [];

  let stopped = false;
  const cancel = () => {
    if (stopped) return;
    stopped = true;
    const now = c.currentTime;
    try {
      speechBus.gain.cancelScheduledValues(now);
      speechBus.gain.setValueAtTime(Math.max(0.0001, speechBus.gain.value), now);
      speechBus.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
    } catch {}
    for (const s of sources) {
      try {
        s.stop(now + 0.03);
      } catch {}
    }
    if (activeSpeechStop === cancel) activeSpeechStop = null;
  };
  activeSpeechStop = cancel;

  const schedule = (clip: DecodedClip) => {
    if (stopped) return;
    const total = tokens.length;
    const now = c.currentTime;
    tokens.forEach((tok, idx) => {
      const progress = total <= 1 ? 1 : idx / (total - 1);
      const last = idx === total - 1;
      const arc = Math.sin(progress * Math.PI) * 0.06;
      const questionLift = last && isQuestion ? 0.16 : idx === total - 2 && isQuestion ? 0.07 : 0;
      const exclaimLift = last && isExclaim ? 0.08 : 0;
      const endDip = last && !isQuestion && !isExclaim ? -0.05 : 0;
      const jitterRate = (Math.random() * 2 - 1) * 0.035;
      const rate = Math.max(0.75, Math.min(1.4, 1 + arc + questionLift + exclaimLift + endDip + jitterRate));

      const src = c.createBufferSource();
      src.buffer = clip.buffer;
      src.playbackRate.value = rate;

      const startAt = now + tok.at;
      const g = c.createGain();
      const syllGain = profile.vol * tok.accent * (last && (isQuestion || isExclaim) ? 1.12 : 1);
      g.gain.setValueAtTime(syllGain, startAt);
      g.gain.setValueAtTime(syllGain, startAt + VOICE_PLAY_DUR - 0.01);
      g.gain.linearRampToValueAtTime(0.0001, startAt + VOICE_PLAY_DUR);
      src.connect(g).connect(speechBus);

      const offset = clip.onset + tok.slot * VOICE_SLOT_SEC;
      src.start(startAt, offset, VOICE_PLAY_DUR);
      sources.push(src);
    });
  };

  const ready = readyClips.get(profile.clip);
  if (ready) {
    schedule(ready);
  } else {
    void loadClip(c, profile.clip).then((clip) => {
      if (clip && !stopped && enabledSnapshot()) schedule(clip);
    });
  }

  return cancel;
}

const CLEAR_CLIPS: SfxName[] = ["clear-1", "clear-2", "clear-3"];

export const sfx = {
  // O: 로즈우드 마림바 + 우쿨렐레 3화음 롤
  good: (expression?: Expression) => {
    const clip: SfxName = expression === "delighted" || expression === "love" ? "good-sparkle" : "good";
    playClip(clip, { vol: 0.9, rate: 0.99 + Math.random() * 0.02 });
  },

  // △: 부드러운 로즈우드 2타 ("으음…")
  meh: (expression?: Expression) => {
    playClip(expression === "puzzled" ? "meh-puzzled" : "meh", { vol: 0.85, rate: 0.99 + Math.random() * 0.02 });
  },

  // X: 펠트 우드·손북 하강 2타 ("어이쿠")
  bad: (expression?: Expression) => {
    const clip: SfxName =
      expression === "dizzy" || expression === "sleepy"
        ? "bad-dizzy"
        : expression === "shocked" || expression === "angry"
          ? "bad-shocked"
          : "bad";
    playClip(clip, { vol: 0.88, rate: 0.99 + Math.random() * 0.02 });
  },

  // 클릭: 짧고 명쾌한 나무 블록 탭(연타 시 미세 피치 변화)
  tap: () => playClip("tap", { vol: 0.45, rate: 0.96 + Math.random() * 0.08 }),

  // 캐릭터나 Mochi를 직접 찌를 때의 짧은 입소리 대답
  poke: (who: "me" | "partner") => {
    playClip(who === "partner" ? "poke-partner" : "poke-me", { vol: 0.72, rate: 0.97 + Math.random() * 0.06 });
  },

  // 복습 카드 펼치기·아지트 착용/배치·장면 전환
  flip: () => playClip("flip", { vol: 0.48, rate: 0.97 + Math.random() * 0.06 }),
  equip: () => playClip("equip", { vol: 0.55, rate: 0.97 + Math.random() * 0.06 }),
  place: () => playClip("place", { vol: 0.65, rate: 0.97 + Math.random() * 0.06 }),
  whoosh: () => playClip("whoosh", { vol: 0.58 }),

  blip,

  reward: (at = 0) => playClip("reward", { at, vol: 0.88 }),
  streak: (at = 0) => playClip("streak", { at, vol: 0.85 }),
  punch: () => playClip("punch", { vol: 0.78 }),
  boxShake: () => playClip("box-shake", { vol: 0.72 }),
  boxOpen: () => playClip("box-open", { vol: 0.88 }),

  clear: () => {
    const clip = CLEAR_CLIPS[Math.floor(Math.random() * CLEAR_CLIPS.length)];
    playClip(clip, { at: 0.2, vol: 0.88 });
  },

  soundOn: () => playClip("tap", { vol: 0.45, rate: 1.15 }),
};
