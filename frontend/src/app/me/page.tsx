import type { Metadata } from "next";
import { MePanel } from "@/features/account/me-panel";
import { getRanks } from "@/features/progression/api";
import { PageShell } from "@/features/site/page-shell";

export const metadata: Metadata = { title: "내 영어 말투 · nuanci" };

export default async function MePage() {
  const { ranks } = await getRanks();
  return (
    <PageShell title="내 영어 말투">
      <MePanel ranks={ranks} />
    </PageShell>
  );
}
