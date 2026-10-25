import type { SetId } from "./types";

// 세트별 벽 색. three.js 없이도 쓸 수 있게 따로 두어 무대를 불러오는 동안 빈 무대 모양을 먼저 보여준다
export const SET_WALLS: Record<SetId, { day: string; evening: string }> = {
  dining: { day: "#c7ced1", evening: "#8f9aa6" },
  office: { day: "#d3d6cf", evening: "#9a9e98" },
  cafe: { day: "#dccdb9", evening: "#8e7f6f" },
  living: { day: "#c9c3cf", evening: "#827c8c" },
  park: { day: "#bfe0ee", evening: "#2b3350" },
  elevator: { day: "#b9c0c4", evening: "#9aa1a6" },
  store: { day: "#e8ecee", evening: "#9fa7ad" },
  karaoke: { day: "#3b2f5c", evening: "#2a2142" },
  gym: { day: "#d7dadc", evening: "#8f969b" },
  room: { day: "#e9d8c7", evening: "#8f7b6c" },
  street: { day: "#cfdde3", evening: "#2b3350" },
  plane: { day: "#e7e3da", evening: "#a39e94" },
  subway: { day: "#d9dee0", evening: "#b5bcc0" },
  classroom: { day: "#e6dfcc", evening: "#a8a08c" },
};
