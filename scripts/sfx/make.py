"""nuanci 효과음 v2: 사운드폰트(GeneralUser GS)의 실제 악기 녹음으로 연주하고, 맑게 들리도록 다듬는다.
먹먹함의 원인(타격음 부족, 200~500Hz 뭉침, 긴 잔향)을 겨냥해 저역 정리 + 타격 고음 보강 + 짧은 방 울림만 쓴다."""
import os, sys, subprocess
import numpy as np
import soundfile as sf
from scipy import signal
import tinysoundfont

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
SF2 = os.path.join(HERE, "sf", "GeneralUser-GS.sf2")
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

# GM 악기 번호(0부터)
GLOCK, CELESTA, MUSICBOX, VIBES, MARIMBA, XYLO, KALIMBA, PIZZ, NYLON, WOODBLOCK, STEELDRUM = 9, 8, 10, 11, 12, 13, 108, 45, 24, 115, 114


def render(parts, length):
    """parts: [(program, is_drums, [(t, key, vel, dur, bend_semitones_or_None)])]"""
    synth = tinysoundfont.Synth(samplerate=SR)
    sfid = synth.sfload(SF2)
    events = []
    for ch, (prog, drums, notes) in enumerate(parts):
        chan = 9 if drums else ch
        synth.program_select(chan, sfid, 128 if drums else 0, 0 if drums else prog, is_drums=drums)
        synth.pitchbend_range(chan, 2)
        for n in notes:
            t, key, vel, dur = n[:4]
            bend = n[4] if len(n) > 4 else None
            events.append((t, "on", chan, key, vel))
            events.append((t + dur, "off", chan, key, 0))
            if bend:
                # 음이 난 뒤 짧게 미끄러지는 꺾임(놀람·실망의 억양)
                steps = 12
                for i in range(1, steps + 1):
                    v = int(8192 + 8191 * max(-1, min(1, bend[0] / 2)) * (i / steps))
                    events.append((t + bend[1] + bend[2] * i / steps, "bend", chan, v, 0))
                events.append((t + dur + 0.01, "bend", chan, 8192, 0))
    events.sort(key=lambda e: e[0])
    total = int(length * SR)
    out = np.zeros((total, 2), dtype=np.float32)
    pos = 0
    for t, kind, chan, a, b in events + [(length, "end", 0, 0, 0)]:
        upto = min(total, int(t * SR))
        if upto > pos:
            buf = synth.generate(upto - pos)
            out[pos:upto] = np.frombuffer(buf, dtype=np.float32).reshape(-1, 2)
            pos = upto
        if kind == "on":
            synth.noteon(chan, a, b)
        elif kind == "off":
            synth.noteoff(chan, a)
        elif kind == "bend":
            synth.pitchbend(chan, a)
    return out


def biquad(x, kind, f, q=0.707, gain_db=0.0):
    b, a = {
        "hp": lambda: signal.butter(2, f / (SR / 2), "highpass"),
        "lp": lambda: signal.butter(2, f / (SR / 2), "lowpass"),
    }.get(kind, lambda: (None, None))()
    if b is not None:
        return signal.lfilter(b, a, x, axis=0)
    A = 10 ** (gain_db / 40)
    w = 2 * np.pi * f / SR
    alpha = np.sin(w) / (2 * q)
    cw = np.cos(w)
    if kind == "peak":
        b = [1 + alpha * A, -2 * cw, 1 - alpha * A]
        a = [1 + alpha / A, -2 * cw, 1 - alpha / A]
    elif kind == "highshelf":
        sA = np.sqrt(A)
        b = [A * ((A + 1) + (A - 1) * cw + 2 * sA * alpha), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - 2 * sA * alpha)]
        a = [(A + 1) - (A - 1) * cw + 2 * sA * alpha, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - 2 * sA * alpha]
    return signal.lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=0)


_rng = np.random.default_rng(7)


def room(x, wet=0.1, decay=0.28):
    """작은 나무 방 울림. 짧고 고역 위주라 소리를 넓혀 주되 뭉개지 않는다"""
    n = int(decay * SR)
    t = np.arange(n) / SR
    ir = np.stack([_rng.standard_normal(n), _rng.standard_normal(n)], axis=1) * np.exp(-t / (decay / 6.9))[:, None]
    ir[: int(0.006 * SR)] = 0
    ir = biquad(ir, "hp", 600)
    ir /= np.sqrt((ir ** 2).sum(axis=0, keepdims=True))
    pad = np.vstack([x, np.zeros((n, 2))])
    rev = np.stack([signal.fftconvolve(pad[:, c], ir[:, c])[: len(pad)] for c in range(2)], axis=1)
    return pad + wet * rev


def master(x, hp=170, air=2.5, presence=2.0, mud=-2.5, wet=0.09, decay=0.28, peak_db=-1.5, tail=0.05):
    x = biquad(x, "hp", hp)
    x = biquad(x, "peak", 380, q=1.0, gain_db=mud)
    x = biquad(x, "peak", 3800, q=0.9, gain_db=presence)
    x = biquad(x, "highshelf", 9000, gain_db=air)
    x = room(x, wet, decay)
    # 첫 타격이 바로 들리게 앞 무음을 잘라 낸다(1ms만 남김)
    env = np.abs(x).max(axis=1)
    thr = env.max() * 10 ** (-48 / 20)
    start = max(0, int(np.argmax(env > thr)) - int(0.001 * SR))
    x = x[start:]
    # 꼬리: 들리지 않는 부분은 자르고 짧게 페이드
    env = np.abs(x).max(axis=1)
    thr = env.max() * 10 ** (-54 / 20)
    end = len(env) - int(np.argmax(env[::-1] > thr))
    x = x[: min(len(x), end + int(tail * SR))]
    f = int(min(len(x) // 3, tail * SR))
    x[-f:] *= np.linspace(1, 0, f)[:, None] ** 2
    # 부드러운 피크 제한 후 정규화
    x = np.tanh(x / np.abs(x).max() * 1.2) / np.tanh(1.2)
    return x * 10 ** (peak_db / 20)


def save(name, x, **m):
    y = master(x, **m)
    wav = os.path.join(OUT, f"{name}.wav")
    sf.write(wav, y.astype(np.float32), SR, subtype="PCM_16")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "128k", os.path.join(OUT, f"{name}.mp3")], check=True)
    print(f"{name:14s} {len(y)/SR:5.2f}s")


def bell_pair(notes, prog_body=MARIMBA, prog_top=GLOCK, top_vel=0.38, top_shift=12, body_vel=1.0):
    """나무 몸통(마림바) + 한 옥타브 위 쇠 종(글로켄)을 겹쳐 타격의 '딱'과 맑은 울림을 같이 낸다"""
    body = [(t, k, int(v * body_vel), d, *rest) for (t, k, v, d, *rest) in notes]
    top = [(t, k + top_shift, int(v * top_vel), d) for (t, k, v, d, *_) in notes]
    return [(prog_body, False, body), (prog_top, False, top)]


def main():
    # 정답: 위로 통통 올라가는 두 음 + 마지막 화음. 밝은 장3도(솔→도·미)
    save("good", render(bell_pair([(0, 79, 112, 0.25), (0.085, 84, 120, 0.4), (0.085, 88, 104, 0.4)]), 0.9), hp=140, air=0.5, mud=-1.0)
    # 정답(신남): 위에 첼레스타 반짝임 세 알
    save("good-sparkle", render(bell_pair([(0, 79, 112, 0.25), (0.085, 84, 120, 0.4), (0.085, 88, 104, 0.4)]) + [(CELESTA, False, [(0.16, 96, 80, 0.2), (0.21, 100, 76, 0.2), (0.26, 103, 82, 0.3)])], 1.0), hp=140, air=0.5, mud=-1.0)
    # 애매: 칼림바 두 음이 살짝 내려앉는 "음…"
    save("meh", render([(KALIMBA, False, [(0, 76, 104, 0.25), (0.13, 74, 96, 0.35)]), (MARIMBA, False, [(0, 64, 70, 0.25), (0.13, 62, 64, 0.35)])], 0.8), air=2.0)
    # 갸웃: 두 번째 음이 위로 휘는 물음표 억양
    save("meh-puzzled", render([(KALIMBA, False, [(0, 74, 104, 0.2), (0.12, 77, 100, 0.4, (1.0, 0.03, 0.14))]), (MARIMBA, False, [(0, 62, 66, 0.2)])], 0.8), air=2.0)
    # 오답: 실로폰이 짧게 미끄러져 내려가는 "어이쿠". 높은 음역이라 먹먹하지 않고, 꺾임으로 아쉬움을 낸다
    save("bad", render([(XYLO, False, [(0, 76, 110, 0.12), (0.1, 71, 108, 0.35, (-1.0, 0.04, 0.2))]), (WOODBLOCK, False, [(0, 72, 70, 0.05)]), (PIZZ, False, [(0.1, 59, 90, 0.3)])], 0.8), hp=200)
    # 놀람: 우드블록 '딱' + 실로폰 세 음 급하강
    save("bad-shocked", render([(WOODBLOCK, False, [(0, 79, 118, 0.05)]), (XYLO, False, [(0.03, 84, 112, 0.08), (0.08, 79, 108, 0.08), (0.13, 73, 112, 0.3, (-2.0, 0.03, 0.16))])], 0.8), hp=210)
    # 어질: 비브라폰 네 음이 비틀거리며 내려감
    save("bad-dizzy", render([(VIBES, False, [(0, 86, 100, 0.12), (0.075, 82, 96, 0.12), (0.15, 79, 92, 0.12), (0.225, 74, 96, 0.35, (-1.0, 0.05, 0.25))]), (GLOCK, False, [(0, 91, 50, 0.1)])], 0.9), hp=200)
    # 누름: 높은 우드블록 한 번, 아주 짧게
    save("tap", render([(WOODBLOCK, False, [(0, 81, 100, 0.03)])], 0.12), wet=0.04, tail=0.02, air=0.0)
    # 넘김: 피치카토 '톡' + 높은 종 살짝
    save("flip", render([(PIZZ, False, [(0, 84, 96, 0.08)]), (GLOCK, False, [(0, 96, 46, 0.06)])], 0.25), wet=0.05, tail=0.03)
    # 착용: 나일론 기타 두 음 위로
    save("equip", render([(NYLON, False, [(0, 79, 104, 0.12), (0.06, 86, 108, 0.2)]), (GLOCK, False, [(0.06, 98, 48, 0.1)])], 0.45), tail=0.04)
    # 놓기: 낮은 마림바 '통' + 우드블록
    save("place", render([(MARIMBA, False, [(0, 67, 112, 0.2)]), (WOODBLOCK, False, [(0, 74, 70, 0.04)])], 0.4), hp=150, tail=0.04)
    # 상자 흔들기: 우드블록 잔타격 넷
    save("box-shake", render([(WOODBLOCK, False, [(0, 77, 90, 0.03), (0.08, 79, 80, 0.03), (0.16, 77, 92, 0.03), (0.24, 81, 84, 0.03)])], 0.45), wet=0.05)
    # 상자 열기: '퐁' + 글로켄 세 알 위로
    save("box-open", render([(MARIMBA, False, [(0, 72, 110, 0.15)]), (GLOCK, False, [(0.05, 84, 90, 0.15), (0.1, 88, 92, 0.15), (0.15, 91, 100, 0.3)])], 0.8))
    # 엔딩 "두둥 탁": 마림바 낮은 두 음 + 높은 종 한 번
    save("punch", render([(MARIMBA, False, [(0, 55, 118, 0.2), (0.13, 48, 120, 0.3)]), (WOODBLOCK, False, [(0.32, 84, 96, 0.04)]), (GLOCK, False, [(0.32, 96, 70, 0.2)])], 0.9), hp=120)
    # 연속 기록: 첼레스타 두 음 위로
    save("streak", render([(CELESTA, False, [(0, 83, 104, 0.2), (0.09, 90, 110, 0.4)]), (MARIMBA, False, [(0, 71, 80, 0.2), (0.09, 78, 84, 0.4)])], 0.9))
    # 새 물건: 글로켄 다섯 알 아르페지오 + 마지막 화음
    save("reward", render(bell_pair([(0, 72, 100, 0.15), (0.06, 76, 104, 0.15), (0.12, 79, 108, 0.15), (0.18, 84, 114, 0.5), (0.18, 88, 100, 0.5)], top_vel=0.45) + [(CELESTA, False, [(0.3, 96, 72, 0.3)])], 1.2), hp=140, air=0.5, mud=-1.0)
    # 장면 완료 팡파르 셋(무작위): 마림바 멜로디 + 피치카토 베이스 + 글로켄 겹침
    jingles = {
        "clear-1": ([(0, 72), (0.1, 76), (0.2, 79), (0.32, 84)], [(0.45, 84), (0.45, 88)], [(0, 48), (0.45, 55)]),
        "clear-2": ([(0, 79), (0.09, 81), (0.18, 83), (0.3, 86)], [(0.45, 84), (0.45, 91)], [(0, 55), (0.45, 48)]),
        "clear-3": ([(0, 76), (0.1, 79), (0.2, 84), (0.3, 83)], [(0.45, 84), (0.45, 88), (0.45, 91)], [(0, 52), (0.45, 48)]),
    }
    for name, (mel, chord, bass) in jingles.items():
        notes = [(t, k, 108, 0.14) for t, k in mel] + [(t, k, 112, 0.6) for t, k in chord]
        save(name, render(bell_pair(notes, top_vel=0.5) + [(PIZZ, False, [(t, k, 100, 0.3) for t, k in bass])], 1.6), hp=110)


if __name__ == "__main__":
    main()
