"""표정별 리액션 소리: CC0 녹음 후보를 다듬는다(앞 무음 자르기, 표정별 길이, 저역 정리, 꼬리 페이드, 음량을 고른 '띠용'에 맞춤).
슬라이드 휘슬은 녹음 하나에서 음이 올라가는 구간(어리둥절)과 내려가는 구간(어질)을 소리 높이 분석으로 찾아 잘라 쓴다."""
import os, io, re, subprocess, glob, json
import numpy as np
import soundfile as sf
from make import biquad, SR

HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, "foley-dl", "cand")
OUT = os.path.join(HERE, "final-foley")
os.makedirs(OUT, exist_ok=True)
REF = os.path.join(HERE, "final-react", "shocked-a-foley.mp3")

# 표정별 최대 길이(초). 대부분 0.5초 안팎, 울음만 길게
MAXLEN = {"awkward": 1.0, "crying": 1.2, "delighted": 0.7, "love": 0.5, "happy": 0.3, "sleepy": 1.0, "stuffed": 0.5, "neutral": 0.3, "stamp": 0.35, "angry": 0.8}


def load(p):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", p, "-f", "wav", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return sf.read(io.BytesIO(raw), dtype="float32")[0]


def onset(x, db=-36):
    env = np.abs(x).max(axis=1)
    return max(0, int(np.argmax(env > env.max() * 10 ** (db / 20))) - int(0.001 * SR))


def mmax(p):
    o = subprocess.run(["ffmpeg", "-hide_banner", "-i", p, "-af", "apad=pad_dur=0.5,ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    return max(float(m) for m in re.findall(r"M:\s*(-?[\d.]+)", o))


def finish(name, x, hp=180):
    x = biquad(x, "hp", hp)
    f = min(len(x) // 3, int(0.04 * SR))
    x[-f:] *= np.linspace(1, 0, f)[:, None] ** 2
    x = x / (np.abs(x).max() + 1e-9) * 0.85
    wav = os.path.join(OUT, f"{name}.wav")
    sf.write(wav, x.astype(np.float32), SR, subtype="PCM_16")
    g = REF_LOUD - mmax(wav)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-af", f"volume={g:.2f}dB,alimiter=limit=0.89:attack=1:release=30:level=disabled", "-codec:a", "libmp3lame", "-b:a", "128k", os.path.join(OUT, f"{name}.mp3")], check=True)
    print(f"{name:14s} {len(x)/SR:.2f}s")


def pitch_track(x, hop=0.02, win=0.05):
    m = x.mean(axis=1)
    h, w = int(hop * SR), int(win * SR)
    out = []
    for i in range(0, len(m) - w, h):
        seg = m[i : i + w] * np.hanning(w)
        X = np.abs(np.fft.rfft(seg, 8192))
        f = np.fft.rfftfreq(8192, 1 / SR)
        band = (f > 300) & (f < 4000)
        out.append((i, f[band][np.argmax(X[band])], np.sqrt((seg ** 2).mean())))
    return out


def sweep(x, direction, length=0.5):
    """음 높이가 length초 동안 가장 크게 오르거나(+1) 내리는(-1) 구간을 찾는다. 소리가 충분히 큰 구간만 본다"""
    tr = pitch_track(x)
    loud = max(r for _, _, r in tr)
    n = int(length / 0.02)
    best, bi = 0, 0
    for k in range(len(tr) - n):
        win = tr[k : k + n]
        if min(r for _, _, r in win) < loud * 0.15:
            continue
        d = (np.log2(win[-1][1]) - np.log2(win[0][1])) * direction
        if d > best:
            best, bi = d, tr[k][0]
    return x[bi : bi + int(length * SR)], best


REF_LOUD = mmax(REF)

# 슬라이드 휘슬: 올라가는 구간 → 어리둥절, 내려가는 구간 → 어질
whistle = load(os.path.join(CAND, "puzzled-1.mp3"))
for length in (0.45, 0.6):
    up, d_up = sweep(whistle, +1, length)
    finish(f"puzzled-{int(length*100)}", up.copy())
    down, d_dn = sweep(whistle, -1, length)
    finish(f"dizzy-{int(length*100)}", down.copy())
    print(f"  휘슬 {length}s: 오름 {d_up*12:.1f}반음, 내림 {d_dn*12:.1f}반음")

for p in sorted(glob.glob(os.path.join(CAND, "*.mp3"))):
    name = os.path.basename(p)[:-4]
    cue = name.rsplit("-", 1)[0]
    if cue in ("puzzled", "dizzy"):
        continue
    x = load(p)
    s = onset(x)
    x = x[s : s + int(MAXLEN[cue] * SR)]
    finish(name, x.copy(), hp=150 if cue == "stamp" else 180)
