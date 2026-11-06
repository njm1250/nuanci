import { bookEntry } from "@/features/collection/pairs";
import type { Scene } from "@/features/scene/types";
import { BookArt, RoomArt, TalkArt } from "./feature-art";

// 첫 방문 홈의 무대 아래에서, 장면 하나를 하면 무엇이 생기는지 실제 화면 조각으로 하나씩 보여 준다.
// 글로 설명하지 않고 결과 카드·표현 모음·아지트의 진짜 모양을 그대로 그려서, 읽지 않고도 무엇을 하는 곳인지 알게 한다
export function FeatureRows({ scene }: { scene: Scene }) {
  const book = bookEntry(scene);
  const rows = [
    {
      title: "말 한마디에 반응이 갈려요",
      body: "보기 셋 중 하나를 고르면 그 말을 들은 상대가 바로 반응해요. 사고가 나면 왜 그렇게 들리는지도 알려 줘요.",
      art: <TalkArt partnerName={scene.partnerName} partnerLine={scene.base.partnerLine} choices={scene.base.choices} />,
    },
    {
      title: "이럴 땐 이렇게, 모아 두기",
      body: "해 본 장면의 자연스러운 말은 표현 모음에 쌓여요. 영어만 가리고 다시 떠올려 볼 수도 있어요.",
      art: <BookArt title={book.title} pair={book.pairs[0]} next={book.pairs[1]} />,
    },
    {
      title: "장면을 끝내면 아지트가 채워져요",
      body: "장면을 끝낼 때마다 옷과 물건이 하나씩 생겨요. 주인공에게 입히고 방에 두면서 다음 보상까지 얼마나 남았는지 볼 수 있어요.",
      art: <RoomArt />,
    },
  ];
  return (
    <section className="mx-auto w-full max-w-[1080px] px-4 py-14 md:px-8 md:py-20 returning:hidden">
      <ul className="space-y-16 md:space-y-24">
        {rows.map((r, i) => (
          // 데스크톱은 그림과 글을 한 줄씩 좌우를 바꿔 가며 놓아, 같은 모양이 세 번 반복돼 보이지 않게 한다
          <li key={r.title} className="grid grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-14">
            <div className={`w-full max-w-[460px] justify-self-center ${i % 2 ? "md:order-2" : ""}`}>{r.art}</div>
            <div>
              <h2 className="font-poster text-display-sm leading-[1.25] md:text-display">{r.title}</h2>
              <p className="mt-3 max-w-[420px] text-body leading-relaxed text-paper-muted">{r.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
