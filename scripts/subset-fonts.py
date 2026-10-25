"""픽셀 글꼴(Galmuri)을 자주 쓰는 글자(core)와 나머지(rest)로 나누고, 영어 대사 글꼴(Pangolin)은 쓰는 글자만 남겨 woff2를 만든다.

브라우저는 화면에 나온 글자가 없을 때만 rest를 받으므로, 흔한 한글 2,350자와 영문·기호만 쓰는 화면에서는 core만 받는다.
@font-face는 src/app/fonts.ts의 next/font/local이 만들고, core는 HTML과 함께 미리 받는다.
사용법: fonttools와 brotli가 있는 파이썬으로 실행한다. python scripts/subset-fonts.py
"""

from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "frontend/node_modules/galmuri/dist"
PANGOLIN = ROOT / "frontend/node_modules/@fontsource/pangolin/files/pangolin-latin-400-normal.woff2"
OUT = ROOT / "frontend/src/app/fonts"

FONTS = [
    ("Galmuri14", "Galmuri14.woff2", "galmuri14", 400),
    ("Galmuri11 Bold", "Galmuri11-Bold.woff2", "galmuri11-bold", 700),
]

# 영문, 문장부호, 화살표, 도형, 괄호, 한글 자모, 전각 문자
BASE_RANGES = [(0x20, 0x7E), (0xA0, 0xFF), (0x2000, 0x206F), (0x2190, 0x21FF), (0x2460, 0x24FF), (0x25A0, 0x25FF), (0x3000, 0x303F), (0x3131, 0x318F), (0xFF01, 0xFF5E)]


def common_hangul():
    # KS X 1001 완성형에 들어 있는 한글 2,350자. 일상 글에 나오는 음절은 거의 여기 다 있다
    out = []
    for cp in range(0xAC00, 0xD7A4):
        try:
            # 완성형에 없는 음절도 8바이트 조합형으로 인코딩되므로 2바이트인 것만 고른다
            if len(chr(cp).encode("euc-kr")) == 2:
                out.append(cp)
        except UnicodeEncodeError:
            pass
    return out


# 영어 대사에 쓰는 글자: 영문·숫자·기호, 줄임표·따옴표·대시, 가운뎃점, café의 é
LINE_RANGES = [(0x20, 0x7E), (0xA0, 0xA0), (0xB7, 0xB7), (0xE9, 0xE9), (0x2010, 0x2027)]


def save_subset(src, cps, file):
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.hinting = False
    target = TTFont(src)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=cps)
    subsetter.subset(target)
    target.save(file)
    print(f"{file.name}: {len(cps)}자, {file.stat().st_size // 1024}KB")


def build(src, slug, core_set):
    available = set(TTFont(DIST / src).getBestCmap())
    # rest는 글꼴 목록에서 core 뒤에 두는 다른 글꼴이다. 브라우저는 core에 없는 글자가 나올 때만 rest를 받는다
    for part, cps in (("core", sorted(available & core_set)), ("rest", sorted(available - core_set))):
        save_subset(DIST / src, cps, OUT / f"{slug}-{part}.woff2")


def main():
    core_set = set(common_hangul())
    for a, b in BASE_RANGES:
        core_set.update(range(a, b + 1))
    for _, src, slug, _ in FONTS:
        build(src, slug, core_set)
    available = set(TTFont(PANGOLIN).getBestCmap())
    save_subset(PANGOLIN, sorted(c for a, b in LINE_RANGES for c in range(a, b + 1) if c in available), OUT / "pangolin-line.woff2")


if __name__ == "__main__":
    main()
