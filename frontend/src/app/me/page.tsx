import type { Metadata } from "next";
import { MePanel } from "@/features/account/me-panel";
import { getRanks } from "@/features/progression/api";
import { PageShell } from "@/features/site/page-shell";

export const metadata: Metadata = { title: "영어의 나 · nuanci" };

export default async function MePage() {
  const { ranks } = await getRanks();
  return (
    <PageShell title="영어의 나">
      <MePanel ranks={ranks} />
    </PageShell>
  );
}
