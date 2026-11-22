import { getCatalog, getScene } from "@/features/scene/api";
import { spoken } from "@/features/collection/pairs";
import type { Choice, Scene, Situation } from "@/features/scene/types";

// 표현 하나 = 장면의 질문 하나. 검색과 AI가 읽을 수 있게 서버에서 글로 그리는 공개 페이지(/learn/[slug])의 재료.
// 장면 페이지는 정답을 숨기지만, 여기는 "「화이팅!」 영어로?" 같은 검색에 답하는 곳이라 정답과 이유를 다 보여 준다
export type LearnEntry = {
  slug: string;
  sceneNumber: number;
  sceneTitle: string;
  step: "base" | "followUp";
  // 하고 싶던 한국어 한마디(따옴말). 검색어가 되는 부분
  ko: string;
  relation: string;
  // 어떤 자리에서였는지(장소 또는 상황)
  when: string;
  context: string;
  partnerName: string;
  partnerLine: string;
  right: Choice;
  alts: Choice[];
  wrongs: Choice[];
  sources: NonNullable<Situation["sources"]>;
};

// 정답 영어로 주소를 만든다. "You got this!" → you-got-this. 겹치면 장면 번호를 붙인다
function slugOf(line: string) {
  return line
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .split("-")
    .slice(0, 7)
    .join("-");
}

function entriesOf(scene: Scene): Omit<LearnEntry, "slug">[] {
  const steps = [
    { step: "base" as const, s: scene.base, when: scene.place },
    { step: "followUp" as const, s: scene.followUp, when: scene.followUp.to },
  ];
  return steps.flatMap(({ step, s, when }) => {
    const goods = s.choices.filter((c) => c.verdict === "good");
    const wrongs = s.choices.filter((c) => c.verdict !== "good");
    if (!goods[0] || wrongs.length === 0) return [];
    return [
      {
        sceneNumber: scene.number,
        sceneTitle: scene.title,
        step,
        ko: spoken(s.intent),
        relation: scene.relation,
        when,
        context: s.context,
        partnerName: scene.partnerName,
        partnerLine: s.partnerLine,
        right: goods[0],
        alts: goods.slice(1),
        wrongs: [...wrongs].sort((a, b) => (a.verdict === b.verdict ? 0 : a.verdict === "bad" ? -1 : 1)),
        sources: s.sources ?? [],
      },
    ];
  });
}

// 공개 장면 순서대로 모든 표현. 목차와 장면 본문은 이미 캐시되어 있어 여러 번 불러도 다시 받지 않는다
export async function getLearnEntries(): Promise<LearnEntry[]> {
  const catalog = await getCatalog();
  const scenes = (await Promise.all(catalog.map((c) => getScene(c.id)))).filter((s): s is Scene => s !== null);
  const used = new Set<string>();
  return scenes.flatMap(entriesOf).map((e) => {
    let slug = slugOf(e.right.line) || `scene-${e.sceneNumber}-${e.step}`;
    if (used.has(slug)) slug = `${slug}-${e.sceneNumber}`;
    used.add(slug);
    return { ...e, slug };
  });
}

export async function getLearnEntry(slug: string) {
  return (await getLearnEntries()).find((e) => e.slug === slug) ?? null;
}
