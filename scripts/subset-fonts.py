"""실제로 쓰는 글자만 담아 글꼴 파일을 만든다. 페이지마다 조각을 여러 개 받는 대신, 작은 파일 하나로 모든 화면을 처리한다.

- 본문(Pretendard), 제목(Black Han Sans): 코드의 한글과 운영 장면의 한글 전부
- 낙서(Nanum Pen Script): 정해진 문구 / 로고(Galmuri14): 로고 글자 / 영어 대사(Pangolin): 대사에 쓰는 글자

빠진 글자는 layout의 Pretendard 조각 CSS가 대신 보여 주므로 깨지지 않는다. 장면을 많이 올린 뒤 다시 실행하면 된다.
@font-face는 src/app/fonts.ts의 next/font/local이 만든다.
사용법: fonttools와 brotli가 있는 파이썬으로 실행한다. python scripts/subset-fonts.py
"""

import json
import re
import urllib.request
from pathlib import Path
from tempfile import TemporaryDirectory

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
FRONT = ROOT / "frontend"
OUT = FRONT / "src/app/fonts"
API = "https://api.nuanci.app/api/scenes"
GOOGLE = "https://github.com/google/fonts/raw/main/ofl"
SYMBOLS = "…·→←「」『』“”‘’—–×~%°"
LINE_EXTRA = "…‘’“”—–·é"
# 낙서 글꼴은 정해진 몇 문구에만 쓴다. 문구를 추가하면 여기에도 넣는다
SCRAWL = "골라 보면 알아요 룸메부터 팀장님까지 이럴 땐 이렇게"


def hangul(text):
    return {c for c in text if "가" <= c <= "힣"}


def code_text():
    files = [f for f in (FRONT / "src").rglob("*") if f.suffix in {".ts", ".tsx"} and "admin" not in f.parts]
    raw = "".join(f.read_text(encoding="utf-8") for f in files)
    return re.sub(r"/\*.*?\*/|//[^\n]*", "", raw, flags=re.S)


def scene_text():
    def get(url):
        with urllib.request.urlopen(url, timeout=30) as res:
            return json.load(res)

    return "".join(json.dumps(get(f"{API}/{s['id']}"), ensure_ascii=False) for s in get(API))


def save(source, chars, name):
    options = subset.Options()
    options.flavor = "woff2"
    options.hinting = False
    options.desubroutinize = True
    font = subset.load_font(str(source), options)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=[ord(c) for c in chars])
    subsetter.subset(font)
    subset.save_font(font, str(OUT / name), options)
    print(f"{name}: {(OUT / name).stat().st_size // 1024}KB ({len(chars)}자)")


def main():
    code = code_text()
    words = hangul(code) | hangul(scene_text())
    ascii_chars = {chr(c) for c in range(0x20, 0x7F)}
    everything = words | ascii_chars | set(SYMBOLS)
    with TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        for name, url in {"black-han.ttf": f"{GOOGLE}/blackhansans/BlackHanSans-Regular.ttf", "nanum-pen.ttf": f"{GOOGLE}/nanumpenscript/NanumPenScript-Regular.ttf"}.items():
            urllib.request.urlretrieve(url, tmp / name)
        # 쓰는 굵기(400~800)만 남겨 가변 글꼴을 줄인다
        text = instancer.instantiateVariableFont(TTFont(FRONT / "node_modules/pretendard/dist/public/variable/PretendardVariable.ttf"), {"wght": (400, 800)})
        text.save(tmp / "text.ttf")
        logo = TTFont(FRONT / "node_modules/galmuri/dist/Galmuri14.woff2")
        logo.flavor = None
        logo.save(tmp / "logo.ttf")

        save(tmp / "text.ttf", everything, "text.woff2")
        save(tmp / "black-han.ttf", everything, "poster.woff2")
        save(tmp / "nanum-pen.ttf", set(SCRAWL), "scrawl.woff2")
        save(tmp / "logo.ttf", set("nuanci검수"), "logo.woff2")
    save(FRONT / "node_modules/@fontsource/pangolin/files/pangolin-latin-400-normal.woff2", ascii_chars | set(LINE_EXTRA), "pangolin-line.woff2")


if __name__ == "__main__":
    main()
