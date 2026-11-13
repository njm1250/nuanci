"""표정별 리액션 소리 시안: 먼저 '놀람(shocked)' 하나를 세 가지 결로 만든다.
A 실제 띠용(현실 소리 = 뜻이 바로 통함) / B 도트 삐융(둥근 칩, 트라이톤 위로) / C 섞기(마림바 딱 + 칩 미끄러짐 + 짧은 실제 띠용)"""
import os, subprocess, io, sys
import numpy as np
import soundfile as sf
import make
from make import render, MARIMBA, XYLO, biquad, SR

HERE = make.HERE
FOLEY = os.path.join(HERE, "foley-dl")
OUT = os.path.join(HERE, "out-react")
os.makedirs(OUT, exist_ok=True)


def load(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "wav", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return sf.read(io.BytesIO(raw), dtype="float32")[0]


def trim(x, db=-42, keep_ms=1):
    env = np.abs(x).max(axis=1)
    s = max(0, int(np.argmax(env > env.max() * 10 ** (db / 20))) - int(keep_ms / 1000 * SR))
    return x[s:]


def fade_tail(x, ms=40):
    f = min(len(x) // 3, int(ms / 1000 * SR))
    x[-f:] *= np.linspace(1, 0, f)[:, None] ** 2
    return x


def chip(freqs, durs, glide_ms=18, duty=0.5, vib=(6.5, 0.012), lp=5500, crush=48):
    """둥근 칩 소리: 삼각파에 사각파를 조금 섞고(배음으로 작은 스피커에서도 들림), 음 사이를 짧게 미끄러지고,
    살짝 떨고, 6kHz 아래로 깎고, 비트크러시는 아주 약하게만 건다"""
    seg = []
    prev = freqs[0]
    for f, d in zip(freqs, durs):
        n = int(d * SR)
        g = min(n, int(glide_ms / 1000 * SR))
        fr = np.concatenate([np.linspace(prev, f, g), np.full(n - g, f)])
        seg.append(fr)
        prev = f
    fr = np.concatenate(seg)
    t = np.arange(len(fr)) / SR
    fr = fr * (1 + vib[1] * np.sin(2 * np.pi * vib[0] * t) * np.clip(t / 0.08, 0, 1))
    ph = np.cumsum(fr) / SR % 1.0
    tri = 2 * np.abs(2 * ph - 1) - 1
    sq = np.where(ph < duty, 1.0, -1.0)
    x = 0.78 * tri + 0.22 * sq
    env = np.minimum(1, t / 0.004) * np.exp(-np.maximum(0, t - 0.02) / (sum(durs) * 0.45))
    x = x * env
    x = np.round(x * crush) / crush
    x = biquad(x[:, None].repeat(2, axis=1), "lp", lp)
    return x


def mix(*layers):
    n = max(len(l) + int(at * SR) for l, at, g in layers)
    out = np.zeros((n, 2))
    for l, at, g in layers:
        i = int(at * SR)
        out[i : i + len(l)] += l * g
    return out


def finish(name, x, hp=250):
    x = biquad(x, "hp", hp)  # 휴대폰 스피커는 200Hz 아래를 거의 못 낸다. 정체성은 250Hz 위에 둔다
    x = trim(x)
    x = fade_tail(x)
    x = x / np.abs(x).max() * 0.85
    wav = os.path.join(OUT, f"{name}.wav")
    sf.write(wav, x.astype(np.float32), SR, subtype="PCM_16")
    print(f"{name:20s} {len(x)/SR:.2f}s")


# A 실제 띠용: 입 하프 스프링을 거의 그대로. 앞을 잘라 바로 터지게 하고 0.55초에서 접는다
boing = trim(load(os.path.join(FOLEY, "boing-harp-down.mp3")))[: int(0.55 * SR)]
finish("shocked-a-foley", boing.copy())

# B 도트 삐융: 미(659Hz) → 트라이톤 위 라#(932Hz)로 튀어 오르고, 한 번 더 살짝 올라가 떨며 끝난다
b = chip([659, 932, 988], [0.05, 0.07, 0.2])
finish("shocked-b-chip", b)

# C 섞기: 실로폰 '딱'(지금 소리와 이어지는 나무 결) + 칩 미끄러짐 + 아주 짧은 실제 띠용을 뒤에 살짝
hit = render([(XYLO, False, [(0, 84, 112, 0.08)])], 0.3)
slide = chip([700, 1050], [0.03, 0.16], glide_ms=90, vib=(9, 0.02))
# 이 띠용 녹음은 낮은 소리가 많아 휴대폰에서 사라진다. 한 옥타브 올리고(재생 속도 2배) 낮은 쪽을 한 번 더 깎는다
short_boing = trim(load(os.path.join(FOLEY, "boing-short.mp3")))
short_boing = np.stack([np.interp(np.arange(0, len(short_boing), 2.0), np.arange(len(short_boing)), short_boing[:, c]) for c in range(2)], axis=1)
short_boing = biquad(biquad(short_boing, "hp", 300), "hp", 300)
finish("shocked-c-hybrid", mix((hit, 0, 0.9), (slide, 0.015, 0.55), (short_boing, 0.07, 0.8)))
