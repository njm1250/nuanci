export const C = {
  ink: "#1b1b1a",
  paper: "#f2f0eb",
  skin: "#e6bf98",
  floor: "#5e5a54",
  wood: "#9c4f2c",
  woodDark: "#7a3c21",
  plate: "#f3f1ea",
  metal: "#8c9296",
  leaf: "#4f7a4a",
  sky: "#e9eef0",
  night: "#28304a",
  lampOn: "#ffd27a",
  lampOff: "#e8e2d2",
  food: "#c96b3c",
  navy: "#2d4a73",
  mustard: "#e1ad34",
  teal: "#2f7f7a",
  rust: "#b4452f",
  slate: "#6e7f8c",
  brick: "#a2563a",
};

// 색을 흰색(+) 또는 먹색(-) 쪽으로 섞어 한 단계 밝거나 어두운 색을 만든다. 그림자와 걸레받이처럼 바탕색에서 나오는 색에 쓴다
export function shade(hex: string, amount: number): string {
  const to = amount > 0 ? [255, 255, 255] : [20, 19, 23];
  const k = Math.abs(amount);
  const n = parseInt(hex.slice(1), 16);
  const mixed = [n >> 16, (n >> 8) & 255, n & 255].map((c, i) => Math.round(c + (to[i] - c) * k));
  return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
