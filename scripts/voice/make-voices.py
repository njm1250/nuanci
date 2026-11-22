#!/usr/bin/env python3
# 장면 영어 대사 음성을 두 층으로 만든다.
#  1) 원본: 대사 한 줄 = mp3 하나(~/.cache/nuanci-voice/masters, git 밖). "말한 사람|문장" 해시로 이름을 짓고, 목소리·모델·설정이
#     바뀌었거나 없는 줄만 ElevenLabs를 부른다. 원본이 진짜 소스라 TTS 비용은 바뀐 줄에만 든다.
#  2) 배포: 장면 단계(base·followUp)마다 대사를 한 파일로 이어 붙인 묶음(Opus webm + 옛 Safari용 AAC m4a)과 줄별 위치표
#     (frontend/public/voice/<장면id>.json). 묶음 파일 이름에 내용 해시를 넣어 1년 캐시해도 고치면 새 주소가 된다.
# 사용: python3 scripts/voice/make-voices.py 장면수   (로컬 프런트 :3000 의 /api/scenes 를 읽는다, 키는 .env.local 의 ELEVENLABS_API_KEY)
import hashlib, json, subprocess, sys, tempfile, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE = Path.home() / ".cache/nuanci-voice"
MASTERS = CACHE / "masters"
PUBLIC = ROOT / "frontend/public/voice"
API = "http://localhost:3000/api"
MODEL = "eleven_v3"
SETTINGS = {"stability": 0.3}
# 역할 → (ElevenLabs 기본 목소리, 음 올림 배율). 캐릭터는 아이 같고 중성적으로 들리게 생성 뒤 음만 올린다(속도는 그대로).
# 1.26 ≈ 4반음, 1.12 ≈ 2반음
CAST = {
    "me": ("cgSgspJ2msm6clMCkdW9", 1.12),     # Jessica
    "bori": ("FGY2WhTYpPnrIDTdsKH5", 1.26),   # Laura
    "sam": ("bIHbv24MWmeRgasZH58o", 1.30),    # Will
    "alex": ("TX3LPaxmHKxFdv7VOQHJ", 1.26),   # Liam
    "boss": ("CwhRBWXzGAHq8TQ4Fs17", 1.18),   # Roger
}
DEFAULT_PARTNER = ("FGY2WhTYpPnrIDTdsKH5", 1.26)
# 상대 표정 → 겉말 연기 태그. 속마음과 달리 겉으로 무엇을 말하는지가 웃음이라 표정 그대로 연기시킨다
TAG = {"shocked": "shocked", "puzzled": "confused", "dizzy": "dazed", "awkward": "awkward", "happy": "happy", "delighted": "excited",
       "love": "touched", "angry": "annoyed", "crying": "sad", "sleepy": "sleepy", "stuffed": "full"}
# 앞뒤 무음은 다듬고, 끝은 0.12초에 걸쳐 줄이고, 앞에 0.05초 숨 쉴 틈을 둔다. 툭 시작하고 툭 끊기는 느낌을 없앤다
EDGES = ("silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,areverse,"
         "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,afade=t=in:d=0.12,areverse,"
         "afade=t=in:d=0.025,adelay=50")
GAP = 0.15  # 묶음 안 줄 사이 무음(초). 재생은 줄 단위로 잘라 쓰므로 들리지 않고, 경계에서 다음 줄이 새지 않게 띄운다


def run(*args):
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *args], check=True)


def duration(path: Path) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                                capture_output=True, text=True).stdout)


def key(speaker: str, text: str) -> str:
    return hashlib.sha256(f"{speaker}|{text}".encode()).hexdigest()[:16]


def get(path):
    return json.load(urllib.request.urlopen(f"{API}{path}"))


def tts(voice: str, text: str) -> bytes:
    k = [l.split("=", 1)[1].strip() for l in open(ROOT / ".env.local") if l.startswith("ELEVENLABS_API_KEY=")][0]
    body = json.dumps({"text": text, "model_id": MODEL, "voice_settings": SETTINGS}).encode()
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128", body,
                                 {"xi-api-key": k, "Content-Type": "application/json"})
    return urllib.request.urlopen(req, timeout=120).read()


def lines_of(scene: dict) -> dict:
    """장면 단계별로 (말한 사람, 문장, 연기 태그)를 화면에 나오는 순서대로"""
    partner = (scene.get("partnerName") or "").lower()
    out = {}
    for st in ("base", "followUp"):
        x, rows = scene[st], []
        for b in x.get("lead") or []:
            if b["line"] != "……" and b["who"] in ("me", "partner"):
                rows.append(("me" if b["who"] == "me" else partner, b["line"], None))
        if x.get("partnerLine"):
            rows.append((partner, x["partnerLine"], None))
        for c in x["choices"]:
            rows.append(("me", c["line"], None))
            if c.get("says"):
                rows.append((partner, c["says"], TAG.get(c.get("expression", ""))))
        seen, uniq = set(), []
        for r in rows:  # 같은 줄이 두 번 나오면 한 번만
            if (r[0], r[1]) not in seen:
                seen.add((r[0], r[1]))
                uniq.append(r)
        out[st] = uniq
    return out


def ensure_master(manifest: dict, speaker: str, text: str, tag) -> int:
    h = key(speaker, text)
    voice, rate = CAST.get(speaker, DEFAULT_PARTNER)
    want = {"voice": voice, "rate": rate, "model": MODEL, "settings": SETTINGS, "tag": tag}
    path = MASTERS / f"{h}.mp3"
    if path.exists() and all(manifest.get(h, {}).get(k, want[k]) == want[k] for k in want):
        return 0
    said = f"[{tag}] {text}" if tag else text
    with tempfile.NamedTemporaryFile(suffix=".mp3") as f, tempfile.NamedTemporaryFile(suffix=".wav") as w:
        f.write(tts(voice, said))
        f.flush()
        run("-i", f.name, "-af", f"asetrate=44100*{rate},aresample=44100,atempo={1 / rate:.4f},{EDGES}", "-ac", "1", w.name)
        run("-i", w.name, "-b:a", "64k", str(path))
    manifest[h] = {"speaker": speaker, "text": text, **want}
    return len(said)


def build_step(scene_id: str, step: str, rows: list) -> dict:
    """한 단계의 원본들을 한 묶음으로 잇고, 줄별 시작·길이(ms)를 돌려준다"""
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        run("-f", "lavfi", "-t", str(GAP), "-i", "anullsrc=r=48000:cl=mono", "-c:a", "pcm_s16le", str(tmp / "gap.wav"))
        parts, lines, at = [], {}, 0.0
        for i, (speaker, text, _) in enumerate(rows):
            wav = tmp / f"{i}.wav"
            run("-i", str(MASTERS / f"{key(speaker, text)}.mp3"), "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", str(wav))
            d = duration(wav)
            lines[f"{speaker}|{text}"] = [round(at * 1000), round(d * 1000)]
            parts += [wav, tmp / "gap.wav"]
            at += d + GAP
        (tmp / "list.txt").write_text("".join(f"file '{p}'\n" for p in parts))
        run("-f", "concat", "-safe", "0", "-i", str(tmp / "list.txt"), "-c:a", "pcm_s16le", str(tmp / "all.wav"))
        run("-i", str(tmp / "all.wav"), "-c:a", "libopus", "-b:a", "32k", "-application", "voip", str(tmp / "a.webm"))
        run("-i", str(tmp / "all.wav"), "-c:a", "aac", "-b:a", "48k", str(tmp / "a.m4a"))
        h = hashlib.sha256((tmp / "a.webm").read_bytes()).hexdigest()[:12]
        files = {}
        for ext in ("webm", "m4a"):
            name = f"{scene_id}-{step}-{h}.{ext}"
            (PUBLIC / name).write_bytes((tmp / f"a.{ext}").read_bytes())
            files[ext] = f"/voice/{name}"
    return {**files, "lines": lines}


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    MASTERS.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    manifest_path = CACHE / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    spent, keep = 0, set()
    for s in get("/scenes")[:n]:
        scene = get(f"/scenes/{s['id']}")
        index = {}
        for step, rows in lines_of(scene).items():
            for speaker, text, tag in rows:
                spent += ensure_master(manifest, speaker, text, tag)
                manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
            index[step] = build_step(s["id"], step, rows)
            keep.update(Path(index[step][ext]).name for ext in ("webm", "m4a"))
        (PUBLIC / f"{s['id']}.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")))
        keep.add(f"{s['id']}.json")
    # 이번에 만든 묶음과 위치표만 남긴다. 옛 묶음은 주소가 달라 지워도 이미 받아 간 쪽은 그대로 동작한다
    for f in PUBLIC.iterdir():
        if f.name not in keep:
            f.unlink()
    size = sum(f.stat().st_size for f in PUBLIC.iterdir())
    print(f"TTS로 보낸 글자 {spent}자, 배포 파일 {len(keep)}개 {size // 1024}KB")


if __name__ == "__main__":
    main()
