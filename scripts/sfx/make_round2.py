"""리액션 소리 2차: 물건 소리 대신 만화식 상징음. 모두 0.6초 안팎으로 짧게.
녹음(CC0)은 신남·좋아함만 쓰고, 나머지는 사운드폰트 악기와 둥근 칩 소리로 만든다."""
import os, io, subprocess, re
import numpy as np
import soundfile as sf
import make
from make import render, SR, biquad, CELESTA, MUSICBOX, PIZZ, MARIMBA

HERE = make.HERE
C2 = os.path.join(HERE, "foley-dl", "cand2")
OUT = os.path.join(HERE, "final-r2")
os.makedirs(OUT, exist_ok=True)
REF = os.path.join(HERE, "final-react", "shocked-a-foley.mp3")
HARP, MUTED_TPT, BRASS, TIMPANI = 46, 59, 61, 47


def mmax(p):
    o = subprocess.run(["ffmpeg", "-hide_banner", "-i", p, "-af", "apad=pad_dur=0.5,ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    return max(float(m) for m in re.findall(r"M:\s*(-?[\d.]+)", o))


REF_LOUD = mmax(REF)


def load(p):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", p, "-f", "wav", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return sf.read(io.BytesIO(raw), dtype="float32")[0]


def trim(x, db=-40):
    env = np.abs(x).max(axis=1)
    s = max(0, int(np.argmax(env > env.max() * 10 ** (db / 20))) - int(0.001 * SR))
    x = x[s:]
    env = np.abs(x).max(axis=1)
    e = len(env) - int(np.argmax(env[::-1] > env.max() * 10 ** (-50 / 20)))
    return x[: e + int(0.03 * SR)]


def finish(name, x, hp=200, maxlen=None):
    x = trim(np.asarray(x, dtype=np.float64))
    if maxlen:
        x = x[: int(maxlen * SR)]
    x = biquad(x, "hp", hp)
    f = min(len(x) // 3, int(0.05 * SR))
    x[-f:] *= np.linspace(1, 0, f)[:, None] ** 2
    x = x / (np.abs(x).max() + 1e-9) * 0.85
    wav = os.path.join(OUT, f"{name}.wav")
    sf.write(wav, x.astype(np.float32), SR, subtype="PCM_16")
    g = REF_LOUD - mmax(wav)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-af", f"volume={g:.2f}dB,alimiter=limit=0.89:attack=1:release=30:level=disabled", "-codec:a", "libmp3lame", "-b:a", "128k", os.path.join(OUT, f"{name}.mp3")], check=True)
    print(f"{name:14s} {len(x)/SR:.2f}s")


def chip(freqs, durs, glide_ms=14, vib=(6.5, 0.01), lp=5000, decay=0.45):
    """둥근 칩 소리(삼각파에 사각파 조금, 짧은 미끄러짐, 6kHz 아래)"""
    seg, prev = [], freqs[0]
    for f, d in zip(freqs, durs):
        n = int(d * SR)
        g = min(n, int(glide_ms / 1000 * SR))
        seg.append(np.concatenate([np.linspace(prev, f, g), np.full(n - g, f)]))
        prev = f
    fr = np.concatenate(seg)
    t = np.arange(len(fr)) / SR
    fr = fr * (1 + vib[1] * np.sin(2 * np.pi * vib[0] * t) * np.clip(t / 0.08, 0, 1))
    ph = np.cumsum(fr) / SR % 1.0
    x = 0.8 * (2 * np.abs(2 * ph - 1) - 1) + 0.2 * np.where(ph < 0.5, 1.0, -1.0)
    x *= np.minimum(1, t / 0.004) * np.exp(-np.maximum(0, t - 0.02) / (sum(durs) * decay))
    return biquad(x[:, None].repeat(2, axis=1), "lp", lp)


def resample(x, rate):
    idx = np.arange(0, len(x), rate)
    return np.stack([np.interp(idx, np.arange(len(x)), x[:, c]) for c in range(2)], axis=1)


def mix(*layers):
    n = max(len(l) + int(at * SR) for l, at, g in layers)
    out = np.zeros((n, 2))
    for l, at, g in layers:
        i = int(at * SR)
        out[i : i + len(l)] += l * g
    return out


# 기분 좋음 "뾰롱": 위로 반짝이는 네 음(도·미·솔·높은 도). A 하프, B 둥근 칩
finish("happy-a-harp", render([(HARP, False, [(0, 84, 96, 0.3), (0.035, 88, 98, 0.3), (0.07, 91, 102, 0.3), (0.105, 96, 108, 0.4)]), (CELESTA, False, [(0.105, 96, 60, 0.3)])], 0.7))
finish("happy-b-chip", chip([1047, 1319, 1568, 2093], [0.035, 0.035, 0.035, 0.18], glide_ms=6))

# 신남 "뿅": 녹음 그대로(통통 튀는 점프 · 짧은 띠용 · 8비트 점프)
for i in (1, 2, 3):
    x = load(os.path.join(C2, f"delighted-{i}.mp3"))
    if i == 2:  # 이 띠용은 낮아서 휴대폰에서 사라진다. 한 옥타브 올린다
        x = resample(x, 2.0)
    finish(f"delighted-{i}", x, maxlen=0.45)

# 좋아함 "두근두근": 심장 녹음을 두 옥타브 올려 휴대폰에서도 들리게 하고 두 번 뛰게. B는 끝에 분홍빛 반짝임
for i in (1, 2):
    beat = trim(load(os.path.join(C2, f"love-{i}.mp3")))[: int(0.3 * SR)]
    beat = resample(beat, 4.0)
    finish(f"love-{i}", mix((beat, 0, 1.0), (beat, 0.17, 0.85)), hp=250)
beat = resample(trim(load(os.path.join(C2, "love-1.mp3")))[: int(0.3 * SR)], 4.0)
finish("love-b-twinkle", mix((beat, 0, 1.0), (beat, 0.17, 0.85), (render([(CELESTA, False, [(0, 96, 70, 0.2), (0.05, 100, 74, 0.3)])], 0.5), 0.3, 0.5)), hp=250)

# 화남 "부글/빠밤": A 금관 두 음 불협(짧게 끊음), B 팀파니 '둥' + 칩 부르르 떨림
finish("angry-a-brass", render([(BRASS, False, [(0, 62, 112, 0.1), (0.12, 61, 118, 0.2)])], 0.5), hp=220)
finish("angry-b-rumble", mix((render([(TIMPANI, False, [(0, 55, 118, 0.3)])], 0.6), 0, 1.0), (chip([330, 311], [0.05, 0.3], vib=(16, 0.04), decay=0.6), 0.02, 0.35)), hp=220)

# 울음 "와앙~": A 뮤트 트럼펫 한 음이 처지며 떨림, B 둥근 칩이 처짐
finish("crying-a-trumpet", render([(MUTED_TPT, False, [(0, 72, 100, 0.55, (-1.0, 0.12, 0.4))])], 0.9), hp=220)
finish("crying-b-chip", chip([784, 740, 622], [0.12, 0.12, 0.35], glide_ms=60, vib=(7, 0.025), decay=0.6))

# 졸림 "자장": 오르골 세 음이 천천히 내려감(솔·미·도). B는 칩으로 더 느리게
finish("sleepy-a-musicbox", render([(MUSICBOX, False, [(0, 91, 86, 0.3), (0.16, 88, 80, 0.3), (0.32, 84, 76, 0.5)])], 1.0))
finish("sleepy-b-chip", chip([784, 659, 523], [0.16, 0.16, 0.3], glide_ms=40, vib=(4, 0.01), decay=0.7, lp=3500))

# 배부름 "통통": 배를 두드리는 낮은 봉고 두 번(드럼 채널). B는 마림바 낮은 두 음
finish("stuffed-a-bongo", render([(0, True, [(0, 61, 110, 0.1), (0.13, 61, 100, 0.1)])], 0.5), hp=200)
finish("stuffed-b-marimba", render([(MARIMBA, False, [(0, 60, 112, 0.15), (0.13, 60, 100, 0.2)]), (PIZZ, False, [(0, 48, 90, 0.2)])], 0.6), hp=180)
