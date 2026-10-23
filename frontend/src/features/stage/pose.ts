import type { Motion } from "@/features/scene/types";

export type Pose = {
  rootX: number;
  rootY: number;
  rootSpin: number;
  rootTilt: number;
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
  rootX: 0,
  rootY: 0,
  rootSpin: 0,
  rootTilt: 0,
  torsoX: 0,
  headX: 0,
  headY: 0,
  headZ: 0,
  lArmX: -0.8,
  lArmZ: 0.1,
  rArmX: -0.8,
  rArmZ: -0.1,
};

const easeOut = (x: number) => 1 - (1 - Math.min(Math.max(x, 0), 1)) ** 3;

// 반응 동작별로 시간 t(초)에 맞는 목표 자세를 계산한다.
// faint·flop·spin·shiver는 웃음을 노린 과장된 동작이라 장면에서 가끔만 쓴다
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
    case "faint":
      // 잠깐 굳었다가 옆으로 뻣뻣하게 쓰러진다
      p.lArmX = 0;
      p.rArmX = 0;
      p.lArmZ = 0.05;
      p.rArmZ = -0.05;
      p.headX = -0.2;
      p.rootX = t < 0.45 ? Math.sin(t * 50) * 0.015 : 0;
      p.rootTilt = 1.45 * easeOut((t - 0.45) / 0.35);
      break;
    case "flop":
      // 숨을 들이켰다가 앞으로 철퍼덕 엎어진다
      if (t < 0.3) {
        p.torsoX = -0.25;
        p.headX = -0.2;
        p.lArmX = -2.4;
        p.rArmX = -2.4;
      } else {
        p.torsoX = 0.95;
        p.headX = 0.35;
        p.lArmX = -1.3;
        p.rArmX = -1.3;
        p.lArmZ = 0.3;
        p.rArmZ = -0.3;
        p.rootY = -Math.abs(Math.sin((t - 0.3) * 14)) * 0.04 * fade(0.9);
      }
      break;
    case "spin":
      // 신나서 점프하며 제자리에서 한 바퀴 돈다
      p.rootSpin = Math.PI * 2 * easeOut(t / 0.7);
      p.rootY = t < 0.7 ? Math.sin((Math.PI * t) / 0.7) * 0.3 : 0;
      if (t < 0.9) {
        p.lArmX = -2.7;
        p.rArmX = -2.7;
        p.lArmZ = 0.4;
        p.rArmZ = -0.4;
      }
      break;
    case "shiver":
      // 팔로 몸을 감싸고 덜덜 떤다
      p.rootX = Math.sin(t * 60) * 0.02;
      p.headZ = Math.sin(t * 47) * 0.05;
      p.headX = 0.1;
      p.lArmX = -1.3;
      p.rArmX = -1.3;
      p.lArmZ = -0.6;
      p.rArmZ = 0.6;
      break;
    case "aim":
      p.rArmX = -1.57;
      p.rArmZ = 0;
      p.lArmX = -1.35;
      p.lArmZ = -0.35;
      p.torsoX = 0.06;
      p.headX = 0.05;
      break;
    case "point":
      p.rArmX = -1.7 + Math.sin(t * 10) * 0.06 * fade(1.2);
      p.rArmZ = 0.12;
      p.headX = -0.05;
      break;
    case "facepalm":
      p.rArmX = -2.3;
      p.rArmZ = 0.45;
      p.headX = 0.28;
      p.headY = Math.sin(t * 3) * 0.15;
      break;
    case "wave":
      // 옆모습에서도 머리에 가리지 않게 얼굴 앞쪽 높이에서 앞뒤로 흔든다
      p.rArmX = -2.3 + Math.sin(t * 10) * 0.3;
      p.rArmZ = -0.35;
      p.headZ = 0.08;
      break;
    case "idle":
      break;
  }
  return p;
}
