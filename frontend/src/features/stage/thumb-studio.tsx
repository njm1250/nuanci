"use client";

import { PixelStage } from "./pixel-stage";
import { finishThumb, useNextThumb } from "./thumb-cache";

// 화면 밖에 무대 하나를 띄워 두고 장면 썸네일을 차례로 그린다. 그림판 하나를 계속 써서 카드가 많아도 WebGL 연결은 하나다
export function ThumbStudio() {
  const job = useNextThumb();
  if (!job) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed -left-[9999px] top-0 h-[180px] w-[240px]">
      <PixelStage spec={job.spec} reduced snapshotKey={job.key} onSnapshot={(url) => finishThumb(job.key, url)} />
    </div>
  );
}
