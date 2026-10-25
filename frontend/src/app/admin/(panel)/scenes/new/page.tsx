import type { Metadata } from "next";
import { SceneEditor } from "@/features/admin/scene-editor";
import { AdminHeader } from "@/features/admin/ui";
import Link from "next/link";

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
  choices: [
    choice("bad-id", "bad", "literal"),
    choice("meh-id", "meh", "context"),
    choice("good-id", "good"),
  ],
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
      <AdminHeader
        title="새 장면 등록"
        description="단일 장면은 객체로, 여러 장면은 배열로 등록합니다. 새 장면은 초안으로 생성됩니다."
        actions={
          <Link className="adm-btn" href="/admin/scenes">
            ← 장면 목록
          </Link>
        }
      />
      <div className="mt-4">
        <SceneEditor initial={JSON.stringify(TEMPLATE, null, 2)} />
      </div>
    </>
  );
}
