import type { ReactNode } from "react";
import { Block, CARD, CARD_SIZE, Cta, INK, LIME, Lockup, Marker, render, RULE, SUBTLE, Tail } from "@/features/share/card";
import { CHAR_SIZE, characterDataUrl } from "./characters";
import { STAMP_COLORS, stampSvg, type StampKind } from "./stamps";
import { TYPE_IDS, TYPES, type TypeId } from "./types";

export const STORY_SIZE = { width: 1080, height: 1920 };

const svgUrl = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

// 캐릭터를 모눈종이 액자 안에 크게 둔다. 칸 크기는 픽셀이 뭉개지지 않게 정수배로만
function Art({ type, cell, pad }: { type: TypeId; cell: number; pad: number }) {
  const size = CHAR_SIZE * cell;
  return (
    <Block style={{ padding: pad, backgroundImage: `linear-gradient(${RULE} 2px, transparent 2px), linear-gradient(90deg, ${RULE} 2px, transparent 2px)`, backgroundSize: `${cell * 4}px ${cell * 4}px` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={characterDataUrl(type)} width={size} height={size} alt="" />
    </Block>
  );
}

function Stamps({ kinds, size }: { kinds: StampKind[]; size: number }) {
  return (
    <div style={{ display: "flex" }}>
      {kinds.map((k, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: size, height: size, marginLeft: i ? size / 5 : 0, background: STAMP_COLORS[k], border: `${Math.round(size / 12)}px solid ${INK}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={svgUrl(stampSvg(k))} width={size * 0.56} height={size * 0.56} alt="" />
        </div>
      ))}
    </div>
  );
}

// 유형 결과 링크를 공유했을 때 보이는 카드
export function typeCard(type: TypeId) {
  const t = TYPES[type];
  return render(
    <>
      <div style={{ display: "flex", alignItems: "center", width: 456 }}>
        <Art type={type} cell={17} pad={18} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 580, marginLeft: 36 }}>
        <Lockup />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 26, color: SUBTLE }}>영어 사고 유형 No.{String(t.no).padStart(2, "0")}</div>
          <Marker style={{ marginTop: 10, fontSize: 60, alignSelf: "flex-start" }}>{t.name}</Marker>
          <div style={{ display: "flex", marginTop: 16, fontSize: 28, lineHeight: 1.35, color: INK }}>{t.tagline}</div>
          <Block style={{ marginTop: 26, padding: "10px 22px 14px", alignSelf: "flex-start" }}>
            <div style={{ display: "flex", fontFamily: "Pangolin", fontSize: 40 }}>{t.says}</div>
            <Tail />
          </Block>
        </div>
        <Cta>너는 무슨 유형? 8문제 →</Cta>
      </div>
    </>,
  );
}

// 테스트 첫 화면 주소를 공유했을 때 보이는 카드. 아홉 유형 Mochi를 한 줄로 세운다
export function testCard() {
  const cell = 4;
  return render(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 1072 }}>
      <Lockup />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 30, color: SUBTLE }}>8문제 · 문제당 10초</div>
        <div style={{ display: "flex", marginTop: 10, fontSize: 72 }}>
          영어 <Marker style={{ marginLeft: 28, marginRight: 28 }}>사고</Marker> 유형 테스트
        </div>
        <div style={{ display: "flex", marginTop: 14, fontSize: 32, color: INK }}>영어로 말할 때 너는 어떤 사고를 칠까?</div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", width: 1072 }}>
        {TYPE_IDS.map((id) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={id} src={characterDataUrl(id)} width={CHAR_SIZE * cell} height={CHAR_SIZE * cell} alt="" />
        ))}
      </div>
    </div>,
    CARD_SIZE,
    "52px 64px 48px",
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `3px solid ${INK}`, padding: "8px 0", fontSize: 32 }}>{children}</div>;
}

// 인스타 스토리에 올리는 세로 이미지. 위 250px, 아래 340px은 스토리 화면 버튼에 가려질 수 있어 비워 둔다
export function storyCard({ type, kinds, avg, mix }: { type: TypeId; kinds: StampKind[] | null; avg: number | null; mix: { key: string; label: string; share: number }[] | null }) {
  const t = TYPES[type];
  return render(
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 952 }}>
      <div style={{ display: "flex", fontSize: 40, color: SUBTLE }}>나의 영어 사고 유형은</div>
      <div style={{ display: "flex", marginTop: 24 }}>
        <Art type={type} cell={16} pad={18} />
      </div>
      <div style={{ display: "flex", marginTop: 30, fontSize: 32, color: SUBTLE }}>No.{String(t.no).padStart(2, "0")}</div>
      <Marker style={{ marginTop: 14, fontSize: 80 }}>{t.name}</Marker>
      <div style={{ display: "flex", marginTop: 20, fontSize: 36, color: INK, textAlign: "center" }}>{t.tagline}</div>
      {kinds && (
        <div style={{ display: "flex", alignItems: "center", marginTop: 36 }}>
          <Stamps kinds={kinds} size={96} />
          {avg ? <div style={{ display: "flex", marginLeft: 28, fontSize: 32, color: SUBTLE }}>평균 {(avg / 10).toFixed(1)}초</div> : null}
        </div>
      )}
      {mix && (
        <div style={{ display: "flex", flexDirection: "column", width: 760, marginTop: 36, padding: "14px 28px 6px", background: CARD, border: `6px solid ${INK}` }}>
          <div style={{ display: "flex", fontSize: 44, borderBottom: `10px solid ${INK}`, paddingBottom: 10 }}>사고 성분표</div>
          {mix.slice(0, 3).map((m) => (
            <Row key={m.key}>
              <div style={{ display: "flex" }}>{m.label}</div>
              <div style={{ display: "flex" }}>{m.share}%</div>
            </Row>
          ))}
        </div>
      )}
      <div style={{ display: "flex", flexShrink: 0, marginTop: 44, padding: "18px 34px", background: INK, color: LIME, fontSize: 38 }}>너도 해 봐 · nuanci.app/test</div>
    </div>,
    STORY_SIZE,
    "250px 64px 340px",
  );
}
