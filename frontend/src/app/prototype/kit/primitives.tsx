"use client";

type V3 = [number, number, number];

export function Mat({ color }: { color: string }) {
  return <meshLambertMaterial color={color} flatShading />;
}

export function Box({ size, at, color, rot }: { size: V3; at: V3; color: string; rot?: V3 }) {
  return (
    <mesh position={at} rotation={rot}>
      <boxGeometry args={size} />
      <Mat color={color} />
    </mesh>
  );
}

export function Flat({ size, at, color }: { size: [number, number]; at: V3; color: string }) {
  return (
    <mesh position={at}>
      <planeGeometry args={size} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

export function Gem({ r, at, color, scale }: { r: number; at: V3; color: string; scale?: V3 }) {
  return (
    <mesh position={at} scale={scale}>
      <icosahedronGeometry args={[r, 0]} />
      <Mat color={color} />
    </mesh>
  );
}

export function Cyl({ r, h, at, color, sides = 6, rot }: { r: number | [number, number]; h: number; at: V3; color: string; sides?: number; rot?: V3 }) {
  const [top, bottom] = Array.isArray(r) ? r : [r, r];
  return (
    <mesh position={at} rotation={rot}>
      <cylinderGeometry args={[top, bottom, h, sides]} />
      <Mat color={color} />
    </mesh>
  );
}

export function Glow({ size, at, on }: { size: V3; at: V3; on: boolean }) {
  return (
    <mesh position={at}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={on ? "#ffd27a" : "#e8e2d2"} />
    </mesh>
  );
}
