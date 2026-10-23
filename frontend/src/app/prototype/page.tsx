import Link from "next/link";
import { plex } from "./fonts";

const variants = [
  {
    href: "/prototype/craft",
    name: "블록 게임풍 UI",
    desc: "픽셀 무대에 블록 게임 느낌의 자체 UI(눌리는 블록 버튼, 계단 모서리 패널, 쌓이는 진행 블록).",
  },
  {
    href: "/prototype/pixel",
    name: "픽셀 무대 (최신)",
    desc: "정면 무대를 픽셀 기본으로. 장면 1(사무실)과 9(식탁)를 이어서 플레이.",
  },
  {
    href: "/prototype/styles",
    name: "렌더 스타일 비교",
    desc: "같은 키트를 픽셀·1비트·리소로 그려본 비교.",
  },
  {
    href: "/prototype/kit",
    name: "장면 키트",
    desc: "세트·시간·등장인물·소품 조합으로 뻗어나가는 장면들.",
  },
  {
    href: "/prototype/flat",
    name: "정면 무대",
    desc: "연극 무대처럼 옆에서 본 단면. 단색 로우폴리, 얼굴 대신 머리 위 기호로 반응. 픽셀 모드 전환 가능.",
  },
  {
    href: "/prototype/diorama",
    name: "디오라마",
    desc: "작은 방 하나를 비스듬히 내려다보는 장면. 말풍선이 캐릭터 머리 위에 뜨고, 해설은 아래 시트에.",
  },
  {
    href: "/prototype/cinema",
    name: "시네마",
    desc: "드라마의 한 장면처럼. 대사는 자막으로, 고르면 내 쪽 컷 다음 상대 얼굴로 컷이 넘어가요.",
  },
  {
    href: "/prototype/chat",
    name: "채팅",
    desc: "메신저처럼 대화가 쌓이고, 위쪽 작은 무대에서 캐릭터가 반응해요.",
  },
];

export default function PrototypeIndex() {
  return (
    <main className={`${plex.className} mx-auto w-full max-w-md flex-1 bg-[#f1ebe1] px-5 py-12 text-[#2b2622]`}>
      <p className="text-[12px] tracking-wide text-[#8a7f72]">장면 9 · 많이 먹어</p>
      <h1 className="mt-2 text-[24px] font-semibold">장면 프로토타입</h1>
      <ul className="mt-8 space-y-3">
        {variants.map((v) => (
          <li key={v.href}>
            <Link href={v.href} className="block rounded-2xl border border-[#2b2622]/10 bg-white p-5 hover:border-[#2b2622]/30">
              <span className="text-[17px] font-semibold">{v.name}</span>
              <span className="mt-1.5 block text-[14px] leading-relaxed text-[#5d554c]">{v.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
