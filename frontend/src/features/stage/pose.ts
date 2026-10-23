import type { Motion } from "@/features/scene/types";

export type Pose = {
  rootY: number;
  torsoX: number;
  headX: number;
  headY: number;
  headZ: number;
  lArmX: number;
  lArmZ: number;
  rArmX: number;
  rArmZ: number;
};

export const REST: Pose = {
  rootY: 0,
  torsoX: 0,
  headX: 0,
  headY: 0,
  headZ: 0,
  lArmX: -0.8,
  lArmZ: 0.1,
  rArmX: -0.8,
  rArmZ: -0.1,
};

// 반응 동작별로 시간 t(초)에 맞는 목표 자세를 계산한다
export function targetPose(motion: Motion, t: number): Pose {
  const p = { ...REST };
  const fade = (d: number) => Math.max(0, 1 - t / d);
  switch (motion) {
    case "nod":
      p.headX = Math.sin(t * 9) * 0.24 * fade(1.4);
      break;
    case "tilt":
      p.headZ = 0.34;
      p.headX = -0.06;
      p.rArmX = -1.9;
      p.rArmZ = 0.5;
      break;
    case "bounce":
      p.rootY = Math.abs(Math.sin(t * 8)) * 0.1 * fade(1.3);
      p.headX = -0.1;
      if (t < 1.3) {
        p.lArmX = -2.7;
        p.rArmX = -2.7;
        p.lArmZ = 0.35;
        p.rArmZ = -0.35;
      }
      break;
    case "shrug":
      p.lArmX = -0.5;
      p.rArmX = -0.5;
      p.lArmZ = 0.55;
      p.rArmZ = -0.55;
      p.headZ = 0.12;
      break;
    case "patBelly":
      p.torsoX = -0.12;
      p.headX = -0.14;
      p.rArmX = -0.45 + Math.sin(t * 7) * 0.12;
      p.rArmZ = 0.4;
      break;
    case "lean":
      p.torsoX = -0.18;
      p.headX = -0.08;
      p.headY = 0.3;
      p.lArmX = -1.4;
      p.lArmZ = 0.05;
      break;
    case "idle":
      break;
  }
  return p;
}
