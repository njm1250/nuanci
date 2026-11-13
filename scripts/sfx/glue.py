"""고른 리액션 소리 13개를 한 결로 묶는 공통 마감.
재료(실제 녹음·칩·사운드폰트)가 달라도 같은 대역(200Hz~7.5kHz)·같은 작은 방 울림·같은 약한 포화·같은 길이 상한·같은 음량을 거치게 한다.
튀는 소리는 먼저 개별로 맞춘다: 신남 점프는 한 옥타브 올리고, 귀뚜라미·금관은 위쪽을 더 깎는다."""
import os, io, re, subprocess
import numpy as np
import soundfile as sf
from make import biquad, room, SR
from cohesion import SET

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "final-glue")
os.makedirs(OUT, exist_ok=True)


def load(p):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", p, "-f", "wav", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return sf.read(io.BytesIO(raw), dtype="float64")[0]


def mmax(p):
    o = subprocess.run(["ffmpeg", "-hide_banner", "-i", p, "-af", "apad=pad_dur=0.5,ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    return max(float(m) for m in re.findall(r"M:\s*(-?[\d.]+)", o))


def resample(x, rate):
    idx = np.arange(0, len(x), rate)
    return np.stack([np.interp(idx, np.arange(len(x)), x[:, c]) for c in range(2)], axis=1)


REF_LOUD = mmax(os.path.join(HERE, "final-react", "shocked-a-foley.mp3"))
MAXLEN = 0.8
PRE = {
    "delighted": lambda x: resample(x, 2.6),
    "awkward": lambda x: biquad(biquad(biquad(x, "lp", 4200), "lp", 4200), "peak", 2500, 1.0, 4.0),
    "angry": lambda x: biquad(x, "lp", 5000),
}

for name, path in SET.items():
    x = load(path + ".mp3")
    if name in PRE:
        x = PRE[name](x)
    x = x[: int(MAXLEN * SR)]
    # 같은 대역
    x = biquad(biquad(x, "hp", 200), "lp", 7500)
    # 같은 약한 포화: 큰 소리의 모서리만 살짝 둥글게
    x = x / (np.abs(x).max() + 1e-9)
    x = np.tanh(x * 1.6) / np.tanh(1.6)
    # 같은 작은 방
    x = room(x, wet=0.07, decay=0.22)
    x = x[: int((MAXLEN + 0.06) * SR)]
    f = min(len(x) // 3, int(0.06 * SR))
    x[-f:] *= np.linspace(1, 0, f)[:, None] ** 2
    x = x / np.abs(x).max() * 0.85
    wav = os.path.join(OUT, f"{name}.wav")
    sf.write(wav, x.astype(np.float32), SR, subtype="PCM_16")
    g = REF_LOUD - mmax(wav)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-af", f"volume={g:.2f}dB,alimiter=limit=0.89:attack=1:release=30:level=disabled", "-codec:a", "libmp3lame", "-b:a", "128k", os.path.join(OUT, f"{name}.mp3")], check=True)
print("ok")
