"""실제로 쓰는 글자만 담아 글꼴 파일을 만든다. 페이지마다 조각을 여러 개 받는 대신, 작은 파일 하나로 모든 화면을 처리한다.

- 본문(Pretendard), 제목(던파 비트비트체 v2, NEOPLE): 코드의 한글과 운영 장면의 한글 전부.
  비트비트체는 수정한 파일에 원래 이름을 쓰지 않는 조건이라, 글자를 줄인 파일 안의 이름을 nuanci title로 바꾼다
- 낙서(Nanum Pen Script): 정해진 문구 / 영어 대사(Pangolin): 대사에 쓰는 글자. 로고는 글꼴이 아니라 site/logo.ts의 도트 그림이다
- 무대 말풍선(Galmuri14): 본문과 같은 글자. 원본은 550KB가 넘어서 통째로 넣으면 무대가 늦게 뜬다

본문·제목·무대 글꼴은 두 파일로 나눈다. 첫 파일에는 홈과 모든 장면의 첫 HTML에 나오는 글자와 ASCII를, 나머지 파일에는 그 밖의 글자를 담는다.
같은 글꼴 이름에 겹치지 않는 unicode-range를 걸어서, 처음 들어온 사람은 작은 첫 파일만 받고 나머지는 그 글자가 화면에 나올 때 받는다.
첫 HTML은 운영 사이트(--site로 바꿀 수 있음)에서 읽으므로, 새 장면이나 새 문구를 배포한 뒤 다시 실행한다.

빠진 글자는 layout의 Pretendard 조각 CSS가 대신 보여 주므로 깨지지 않는다. 장면을 많이 올린 뒤 다시 실행하면 된다.
나눈 글꼴의 @font-face는 이 스크립트가 쓰는 src/app/font-faces.ts(next/font/local)가 만든다.
사용법: fonttools와 brotli가 있는 파이썬으로 실행한다. python scripts/subset-fonts.py [--site http://localhost:3000]
"""

import argparse
import json
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from tempfile import TemporaryDirectory

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
FRONT = ROOT / "frontend"
OUT = FRONT / "src/app/fonts"
API = "https://api.nuanci.app/api/scenes"
SITE = "https://nuanci.app"
FACES = FRONT / "src/app/font-faces.ts"
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


class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self.skip:
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)


def first_screen_text(site):
    """홈과 장면 주소의 첫 HTML에 실린 글자(script·style 제외). 처음 온 사람이 보는 /start도 넣는다"""
    with urllib.request.urlopen(API, timeout=30) as res:
        numbers = [s["number"] for s in json.load(res)]
    # 운영 사이트를 열 때는 내부 방문으로 표시해 지표에서 빠지게 한다
    paths = ["/", "/start", *[f"/scenes/{n}" for n in numbers]]
    parser = VisibleText()
    for path in paths:
        req = urllib.request.Request(f"{site}{path}?utm_source=ai", headers={"User-Agent": "nuanci-font-subset"})
        with urllib.request.urlopen(req, timeout=30) as res:
            parser.feed(res.read().decode("utf-8"))
    print(f"첫 HTML {len(paths)}개")
    return "".join(parser.parts)


def unicode_range(codes):
    pairs = []
    for c in sorted(codes):
        if pairs and pairs[-1][1] == c - 1:
            pairs[-1][1] = c
        else:
            pairs.append([c, c])
    return ",".join(f"U+{a:X}" if a == b else f"U+{a:X}-{b:X}" for a, b in pairs)


def cmap(name):
    return set(TTFont(OUT / name).getBestCmap())


NEXON = "https://cdn.df.nexon.com/img/common/font/DNFBitBitv2.otf"


def rename(font, family):
    for record in font["name"].names:
        if record.nameID in (1, 3, 4, 6, 16):
            record.string = family.replace(" ", "") if record.nameID == 6 else family


def save(source, chars, name, family=None):
    options = subset.Options()
    options.flavor = "woff2"
    options.hinting = False
    options.desubroutinize = True
    font = subset.load_font(str(source), options)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=[ord(c) for c in chars])
    subsetter.subset(font)
    if family:
        rename(font, family)
    subset.save_font(font, str(OUT / name), options)
    print(f"{name}: {(OUT / name).stat().st_size // 1024}KB ({len(chars)}자)")


# 나눈 글꼴: (파일 이름 앞부분, 글꼴 이름, CSS 변수, 굵기, 본문처럼 미리 받는지)
SPLIT = [
    ("text", "nuanci text", "--font-text", "400 800", True),
    ("title", "nuanci title", "--font-title", "400", False),
    ("stage", "nuanci stage", "--font-galmuri", "400", False),
]


def split_save(source, everything, first, name, family=None):
    """한 글꼴을 첫 화면 글자(name-first)와 나머지(name-rest) 두 파일로 저장한다"""
    save(source, everything & first, f"{name}-first.woff2", family)
    save(source, everything - first, f"{name}-rest.woff2", family)


def write_faces():
    lines = [
        "// scripts/subset-fonts.py가 만드는 파일이다. 손으로 고치지 말고 스크립트를 다시 실행한다.",
        "// 한 글꼴을 첫 화면 글자와 나머지 글자 두 파일로 나누고, 같은 글꼴 이름에 겹치지 않는 unicode-range를 건다.",
        "// 브라우저는 화면에 나온 글자가 속한 파일만 받는다",
        'import localFont from "next/font/local";',
        "",
    ]
    names = []
    for name, family, variable, weight, preload in SPLIT:
        for part in ("first", "rest"):
            ident = f"{name}{part.capitalize()}"
            names.append(ident)
            # 미리 받기와 대체 글꼴 크기 맞춤은 첫 파일에만 둔다. 나머지는 그 글자가 나올 때 받는다
            hot = part == "first" and preload
            options = [
                f'src: "./fonts/{name}-{part}.woff2"',
                f'weight: "{weight}"',
                'display: "swap"',
                f'variable: "{variable if part == "first" else variable + "-rest"}"',
                *([] if hot else ["preload: false", "adjustFontFallback: false"]),
                f'declarations: [{{ prop: "font-family", value: "{family}" }}, {{ prop: "unicode-range", value: "{unicode_range(cmap(f"{name}-{part}.woff2"))}" }}]',
            ]
            lines.append(f"export const {ident} = localFont({{ {', '.join(options)} }});")
    lines += ["", f"export const splitFonts = [{', '.join(names)}];", ""]
    FACES.write_text("\n".join(lines), encoding="utf-8")
    print(f"{FACES.relative_to(ROOT)} 갱신")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", default=SITE, help="첫 HTML을 읽을 사이트 주소")
    args = parser.parse_args()
    code = code_text()
    words = hangul(code) | hangul(scene_text())
    ascii_chars = {chr(c) for c in range(0x20, 0x7F)}
    everything = words | ascii_chars | set(SYMBOLS)
    first = (set(first_screen_text(args.site)) & everything) | ascii_chars
    print(f"첫 화면 글자 {len(first)}자 / 전체 {len(everything)}자")
    with TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        for name, url in {"nanum-pen.ttf": f"{GOOGLE}/nanumpenscript/NanumPenScript-Regular.ttf"}.items():
            urllib.request.urlretrieve(url, tmp / name)
        # 쓰는 굵기(400~800)만 남겨 가변 글꼴을 줄인다
        text = instancer.instantiateVariableFont(TTFont(FRONT / "node_modules/pretendard/dist/public/variable/PretendardVariable.ttf"), {"wght": (400, 800)})
        text.save(tmp / "text.ttf")

        split_save(tmp / "text.ttf", everything, first, "text")
        urllib.request.urlretrieve(NEXON, tmp / "bitbit.otf")
        split_save(tmp / "bitbit.otf", everything, first, "title", family="nuanci title")
        save(tmp / "nanum-pen.ttf", set(SCRAWL), "scrawl.woff2")
    split_save(FRONT / "node_modules/galmuri/dist/Galmuri14.ttf", everything, first, "stage")
    save(FRONT / "node_modules/@fontsource/pangolin/files/pangolin-latin-400-normal.woff2", ascii_chars | set(LINE_EXTRA), "pangolin-line.woff2")
    write_faces()


if __name__ == "__main__":
    main()
