import { SCENES, nextSceneId } from "@/content/scenes";
import { ScenePlayer } from "@/features/scene/scene-player";

export default function Home() {
  const scene = SCENES[0];
  return <ScenePlayer key={scene.id} scene={scene} nextId={nextSceneId(scene.id)} />;
}
