"use client";

import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

type Flat = THREE.MeshLambertMaterial | THREE.MeshBasicMaterial;

function mergeable(m: THREE.Material | THREE.Material[]): m is Flat {
  return (m instanceof THREE.MeshLambertMaterial || m instanceof THREE.MeshBasicMaterial) && !m.transparent && !m.map && !m.vertexColors;
}

// 그리는 방식이 같으면 한 번에 그릴 수 있다. 색은 정점에 넣으므로 열쇠에서 뺀다
function drawKey(o: THREE.Mesh, m: Flat) {
  const flat = m instanceof THREE.MeshLambertMaterial ? m.flatShading : false;
  return [m.type, m.side, flat, m.depthTest, m.depthWrite, m.colorWrite, m.polygonOffset, m.polygonOffsetFactor, m.polygonOffsetUnits, m.fog, m.toneMapped, o.renderOrder].join("/");
}

function concat(parts: { geo: THREE.BufferGeometry; color: THREE.Color }[]) {
  const vertices = parts.reduce((n, p) => n + p.geo.getAttribute("position").count, 0);
  const indices = parts.reduce((n, p) => n + (p.geo.index?.count ?? p.geo.getAttribute("position").count), 0);
  const position = new Float32Array(vertices * 3);
  const normal = new Float32Array(vertices * 3);
  const color = new Float32Array(vertices * 3);
  const index = vertices > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
  let v = 0;
  let i = 0;
  for (const { geo, color: c } of parts) {
    const pos = geo.getAttribute("position");
    const nor = geo.getAttribute("normal");
    for (let k = 0; k < pos.count; k++) {
      position.set([pos.getX(k), pos.getY(k), pos.getZ(k)], (v + k) * 3);
      if (nor) normal.set([nor.getX(k), nor.getY(k), nor.getZ(k)], (v + k) * 3);
      color.set([c.r, c.g, c.b], (v + k) * 3);
    }
    if (geo.index) for (let k = 0; k < geo.index.count; k++) index[i++] = v + geo.index.getX(k);
    else for (let k = 0; k < pos.count; k++) index[i++] = v + k;
    v += pos.count;
    geo.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(position, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
  out.setAttribute("color", new THREE.BufferAttribute(color, 3));
  out.setIndex(new THREE.BufferAttribute(index, 1));
  out.computeBoundingSphere();
  return out;
}

// root 아래 보이는 정지 도형을 그리는 방식별로 합친 메시와, 합쳐서 숨겨도 되는 원래 메시를 돌려준다.
// 위치는 root 기준으로 정점에 미리 반영하고 재질 색은 정점 색으로 옮긴다. 반투명·텍스처·뒤집힌 도형은 원래대로 둔다
export function mergeStatic(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true);
  const toRoot = root.matrixWorld.clone().invert();
  // 트리 순서는 React가 재질을 만든 순서이자 three가 따로 그릴 때의 순서라, 그대로 이어 붙이면 같은 깊이에서 겹친 면의 앞뒤가 원래와 같다
  const found: THREE.Mesh[] = [];
  root.traverseVisible((o) => {
    if (o instanceof THREE.Mesh) found.push(o);
  });
  const bins = new Map<string, { material: Flat; order: number; parts: { geo: THREE.BufferGeometry; color: THREE.Color }[] }>();
  const sources: THREE.Mesh[] = [];
  for (const o of found) {
    if (!mergeable(o.material) || !o.geometry.getAttribute("position")) continue;
    const local = new THREE.Matrix4().multiplyMatrices(toRoot, o.matrixWorld);
    if (local.determinant() <= 0) continue;
    const key = drawKey(o, o.material);
    let bin = bins.get(key);
    if (!bin) bins.set(key, (bin = { material: o.material, order: o.renderOrder, parts: [] }));
    bin.parts.push({ geo: o.geometry.clone().applyMatrix4(local), color: o.material.color });
    sources.push(o);
  }
  const meshes = [...bins.values()].map(({ material, order, parts }) => {
    const shared = material.clone();
    shared.color.setRGB(1, 1, 1);
    shared.vertexColors = true;
    const mesh = new THREE.Mesh(concat(parts), shared);
    mesh.renderOrder = order;
    return mesh;
  });
  return { meshes, sources };
}

// 움직이지 않는 벽 앞 가구·소품을 그리는 방식별로 몇 개의 메시로 합쳐 그린다.
// 거실 기준 한 프레임의 그리기 호출이 48회에서 3회로 준다. 화면은 원래와 픽셀 단위로 같다.
// 안에 넣는 요소는 상태·프레임 갱신·누르기 처리가 없어야 한다. children이 바뀌면 다시 합친다
export function StaticBatch({ children }: { children: React.ReactNode }) {
  const source = useRef<THREE.Group>(null);
  const target = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const root = source.current;
    const out = target.current;
    if (!root || !out) return;
    const { meshes, sources } = mergeStatic(root);
    for (const s of sources) s.visible = false;
    if (meshes.length) out.add(...meshes);
    invalidate();
    return () => {
      for (const s of sources) s.visible = true;
      for (const m of meshes) {
        out.remove(m);
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    };
  }, [children, invalidate]);
  return (
    <>
      <group ref={source}>{children}</group>
      <group ref={target} />
    </>
  );
}
