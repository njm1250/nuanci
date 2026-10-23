import type { Scene } from "@/features/scene/types";
import { eatALot } from "./eat-a-lot";
import { fileRequest } from "./file-request";

export const SCENES: Scene[] = [eatALot, fileRequest];

export const getScene = (id: string) => SCENES.find((s) => s.id === id);

export const nextSceneId = (id: string) => {
  const i = SCENES.findIndex((s) => s.id === id);
  return SCENES[(i + 1) % SCENES.length].id;
};
