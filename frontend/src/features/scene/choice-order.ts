import type { Scene, Situation } from "./types";

// 보기가 넷 이상인 상황도 처음에는 원래 순서의 앞 세 개만 보여 준다. 나머지는 첫 답 뒤에 붙는다
export const CORE_CHOICES = 3;

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 정답 자리가 늘 같지 않도록 장면·상황마다 선택지 순서를 섞는다. 서버와 브라우저에서 같은 순서가 나오게 무작위 대신 해시를 쓴다
export function shuffleChoices(scene: Scene): Scene {
  const order = <S extends Situation>(step: string, s: S): S => {
    const key = (id: string) => hash(`${scene.id}:${step}:${id}`);
    return { ...s, choices: [...s.choices].sort((a, b) => key(a.id) - key(b.id)) };
  };
  return { ...scene, base: order("base", scene.base), followUp: order("followUp", scene.followUp) };
}
