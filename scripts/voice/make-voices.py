#!/usr/bin/env python3
# 장면 영어 대사 음성을 두 층으로 만든다.
#  1) 원본: 대사 한 줄 = mp3 하나(~/.cache/nuanci-voice/masters, git 밖). "말한 사람|문장" 해시로 이름을 짓고, 목소리·모델·설정이
#     바뀌었거나 없는 줄만 ElevenLabs를 부른다. 원본이 진짜 소스라 TTS 비용은 바뀐 줄에만 든다.
#  2) 배포: 장면 단계(base·followUp)마다 대사를 한 파일로 이어 붙인 묶음(Opus webm + 옛 Safari용 AAC m4a)과 줄별 위치표
#     (frontend/public/voice/<장면id>.json). 묶음 파일 이름에 내용 해시를 넣어 1년 캐시해도 고치면 새 주소가 된다.
# 사용: python3 scripts/voice/make-voices.py 장면수 [--provider=gemini]   (로컬 프런트 :3000 의 /api/scenes 를 읽는다. 키: .env.local ELEVENLABS_API_KEY, .env.production NUANCI_GEMINI_API_KEY)
import base64, hashlib, json, re, subprocess, sys, tempfile, time, urllib.error, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE = Path.home() / ".cache/nuanci-voice"
MASTERS = CACHE / "masters"
PUBLIC = ROOT / "frontend/public/voice"
API = "http://localhost:3000/api"
MODEL = "eleven_v3"
SETTINGS = {"stability": 0.3}
# 캐릭터별 목소리는 cast.json. elevenlabs가 1순위이고, 결제·한도·키 문제로 막히면 gemini로 만든다(--provider gemini로 강제할 수도 있다)
CAST = json.loads((Path(__file__).parent / "cast.json").read_text())
# Gemini TTS는 모델마다 하루 요청 한도(Tier 1에서 100회)가 따로 있다. 하루 한도에 걸리면 다음 모델로 넘어간다
GEMINI_TTS_MODELS = ["gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts", "gemini-3.8-flash-lite-tts", "gemini-2.5-pro-preview-tts"]
gemini_model = 0
FORCED = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--provider=")), None)
eleven_down = FORCED == "gemini"


def cast_of(speaker: str) -> dict:
    return CAST.get(speaker) or CAST["default"]


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


def env(path: Path, key: str) -> str | None:
    if not path.exists():
        return None
    for l in path.read_text().splitlines():
        if l.startswith(key + "="):
            return l.split("=", 1)[1].strip().strip("\"'")
    return None


def eleven(voice: str, text: str) -> bytes:
    k = env(ROOT / ".env.local", "ELEVENLABS_API_KEY")
    if not k:
        raise PermissionError("ELEVENLABS_API_KEY 없음")
    body = json.dumps({"text": text, "model_id": MODEL, "voice_settings": SETTINGS}).encode()
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128", body,
                                 {"xi-api-key": k, "Content-Type": "application/json"})
    return urllib.request.urlopen(req, timeout=120).read()


class DailyQuota(Exception):
    pass


def gemini_call(model: str, body: dict) -> dict:
    k = env(ROOT / ".env.production", "NUANCI_GEMINI_API_KEY")
    req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent", json.dumps(body).encode(),
                                 {"x-goog-api-key": k, "Content-Type": "application/json"})
    for attempt in range(4):
        try:
            return json.load(urllib.request.urlopen(req, timeout=120))
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            if "per_day" in e.read().decode(errors="ignore"):
                raise DailyQuota(model)
            if attempt == 3:
                raise
            time.sleep(20)  # 분당 한도
    raise RuntimeError("unreachable")


def gemini_tts(body: dict) -> dict:
    global gemini_model
    while gemini_model < len(GEMINI_TTS_MODELS):
        try:
            return gemini_call(GEMINI_TTS_MODELS[gemini_model], body)
        except DailyQuota as q:
            print(f"  {q} 하루 한도 → 다음 모델")
            gemini_model += 1
        except urllib.error.HTTPError as e:
            if e.code in (400, 404):  # 이 키로 못 쓰는 모델
                gemini_model += 1
                continue
            raise
    raise DailyQuota("모든 Gemini TTS 모델의 하루 한도")


# 감탄사는 받아 적기에서 빠지거나 바뀌기 쉬워(Ha!, Uh…) 비교에서 뺀다
FILLERS = {"ha", "haha", "ah", "aw", "aww", "uh", "um", "umm", "oh", "ooh", "hmm", "huh", "wow", "whoa", "hey", "eh", "oops", "yay", "ugh", "phew"}


def words(t: str) -> list[str]:
    return [w for w in re.sub(r"[^a-z0-9' ]", " ", t.lower().replace("’", "'")).split() if w not in FILLERS]


def same_words(a: str, b: str) -> float:
    import difflib
    return difflib.SequenceMatcher(None, words(a), words(b)).ratio()


def gemini(cfg: dict, text: str, tag) -> bytes:
    """Gemini TTS. 연기 지시는 DIRECTOR'S NOTES로 떼어 넘긴다(한 줄에 섞으면 지시문까지 읽었다).
    가끔 대본에 없는 말(Um, Woo!)을 덧붙여서, 받아 적어 대본과 단어가 같을 때만 쓴다"""
    notes = f"Character: {cfg['style']}. Style: {tag or 'natural'}, casual and unpolished, not a voice actor."
    if cfg.get("accent"):
        notes += f" Accent: {cfg['accent']}."
    prompt = f"## DIRECTOR'S NOTES\n{notes}\n\n## TRANSCRIPT\n{text}"
    check = env(ROOT / ".env.production", "NUANCI_GEMINI_MODEL")
    best = (0.0, b"")
    for _ in range(3):
        time.sleep(7)
        d = gemini_tts({"contents": [{"parts": [{"text": prompt}]}],
                                     "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": cfg["voice"]}}}}})
        audio = base64.b64decode(d["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])
        heard = gemini_call(check, {"contents": [{"parts": [{"inlineData": {"mimeType": "audio/wav", "data": base64.b64encode(audio).decode()}},
                                                            {"text": "Transcribe exactly every word spoken. Output only the transcript."}]}]})
        said = heard["candidates"][0]["content"]["parts"][0]["text"]
        score = same_words(said, text)
        # 받아 적기 자체도 틀릴 수 있어(fact → facts) 단어가 거의 같으면 통과. 덧붙인 말(Um, Woo!)이 끼면 점수가 떨어진다
        if score >= 0.9:
            return audio
        best = max(best, (score, audio))
        print(f"  다시 생성(대본과 다름 {score:.2f}): {said.strip()!r}")
    if best[0] >= 0.75:
        return best[1]
    raise ValueError(f"Gemini가 대본대로 읽지 않음: {text}")


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
    global eleven_down
    h = key(speaker, text)
    cfg = cast_of(speaker)
    path = MASTERS / f"{h}.mp3"
    old = manifest.get(h, {})
    # 이미 만든 줄은 그때의 공급자·목소리·배율이 지금 설정과 같으면 그대로 쓴다. gemini로 만든 줄은 elevenlabs가 되살아나도 그대로 둔다
    if path.exists():
        prov = old.get("provider", "elevenlabs")
        now = cfg.get(prov) or {}
        if now and old.get("voice", now.get("voice")) == now.get("voice") and old.get("rate", now.get("rate")) == now.get("rate") and old.get("tag", tag) == tag:
            return 0
    order = ["gemini"] if eleven_down or not cfg.get("elevenlabs") else ["elevenlabs", "gemini"]
    for prov in order:
        c = cfg.get(prov)
        if not c:
            continue
        try:
            if prov == "elevenlabs":
                raw, ext, sent = eleven(c["voice"], f"[{tag}] {text}" if tag else text), "mp3", len(text) + (len(tag) + 3 if tag else 0)
            else:
                raw, ext, sent = gemini(c, text, tag), "wav", 0
        except (urllib.error.HTTPError, PermissionError) as e:
            if prov == "elevenlabs":
                print(f"  ElevenLabs 막힘({getattr(e, 'code', e)}) → 이후 Gemini로 만든다")
                eleven_down = True
                continue
            raise
        with tempfile.NamedTemporaryFile(suffix="." + ext) as f, tempfile.NamedTemporaryFile(suffix=".wav") as w:
            f.write(raw)
            f.flush()
            rate = c["rate"]
            run("-i", f.name, "-af", f"aresample=44100,asetrate=44100*{rate},aresample=44100,atempo={1 / rate:.4f},{EDGES}", "-ac", "1", w.name)
            run("-i", w.name, "-b:a", "64k", str(path))
        manifest[h] = {"speaker": speaker, "text": text, "provider": prov, "voice": c["voice"], "rate": rate, "tag": tag}
        return sent
    raise RuntimeError(f"목소리 설정 없음: {speaker}")


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
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    n = int(args[0]) if args else 10
    MASTERS.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    manifest_path = CACHE / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    spent, keep = 0, set()
    global quota_hit
    quota_hit = False
    for s in get("/scenes")[:n]:
        scene = get(f"/scenes/{s['id']}")
        index = {}
        for step, rows in lines_of(scene).items():
            made = []
            for speaker, text, tag in rows:
                try:
                    spent += ensure_master(manifest, speaker, text, tag)
                    made.append((speaker, text, tag))
                except ValueError as e:
                    # 이 줄만 음성 없이 둔다(화면은 웅얼거림으로 남는다)
                    print(f"  건너뜀: {e}")
                except DailyQuota as e:
                    print(f"  멈춤: {e}. 내일 같은 명령으로 이어서 만든다(이미 만든 줄은 건너뜀)")
                    quota_hit = True
                    break
                manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
            if made:
                index[step] = build_step(s["id"], step, made)
                keep.update(Path(index[step][ext]).name for ext in ("webm", "m4a"))
        if index:
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
