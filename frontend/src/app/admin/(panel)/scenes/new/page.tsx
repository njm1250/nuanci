import type { Metadata } from "next";
import { SceneEditor } from "@/features/admin/scene-editor";

export const metadata: Metadata = { title: "새 장면 · nuanci" };

const choice = (id: string, verdict: string, trap?: string) => ({
  id,
  line: "",
  meaning: "",
  verdict,
  ...(trap ? { trap } : {}),
  reaction: "",
  tags: ["", ""],
  why: "",
  detail: "",
  expression: "neutral",
  motion: "idle",
});

const situation = (extra: object = {}) => ({
  ...extra,
  context: "",
  intent: "",
  partnerLine: "",
  partnerIdle: { expression: "neutral", motion: "idle" },
  stage: { set: "dining", time: "day", partner: "sam" },
  choices: [choice("bad-id", "bad", "literal"), choice("meh-id", "meh", "context"), choice("good-id", "good")],
});

const TEMPLATE = {
  id: "new-scene",
  status: "draft",
  order: 100,
  number: 100,
  title: "",
  relation: "",
  place: "",
  partnerName: "Sam",
  base: situation(),
  followUp: situation({ prompt: "잠깐, ~라면?", from: "", to: "" }),
  discovery: "",
};

export default function NewScenePage() {
  return (
    <>
      <h1 className="font-pixel-title text-[24px]">새 장면</h1>
      <p className="mt-1 text-[14px] leading-relaxed text-paper-muted">
        틀을 채우거나 완성된 JSON을 통째로 붙여 넣으세요. 여러 장면은 {"[ {...}, {...} ]"} 배열로 한 번에 올릴 수 있어요. 새 장면은 초안으로 들어가요. 무대·동작·소품 이름은 에셋 화면에서 확인할 수 있어요.
      </p>
      <div className="mt-4">
        <SceneEditor initial={JSON.stringify(TEMPLATE, null, 2)} />
      </div>
    </>
  );
}
