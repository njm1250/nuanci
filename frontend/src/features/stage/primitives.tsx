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

const GLYPHS: Record<string, string[]> = {
  $: ["01110", "10100", "01110", "00101", "01110"],
  "1": ["00100", "01100", "00100", "00100", "01110"],
  "0": ["01110", "10001", "10001", "10001", "01110"],
  M: ["10001", "11011", "10101", "10001", "10001"],
  "-": ["00000", "00000", "01110", "00000", "00000"],
  C: ["01110", "10000", "10000", "10000", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000"],
};

// 간판과 포스터에 찍는 도트 글자. 무대에 필요한 글자만 둔다
export function PixelText({ text, at, px, color }: { text: string; at: V3; px: number; color: string }) {
  const width = text.length * 6 - 1;
  return (
    <>
      {[...text].flatMap((ch, i) =>
        (GLYPHS[ch] ?? GLYPHS[" "]).flatMap((row, r) =>
          [...row].flatMap((bit, c) =>
            bit === "1" ? [<Flat key={`${i}-${r}-${c}`} size={[px, px]} at={[at[0] + (i * 6 + c - width / 2 + 0.5) * px, at[1] + (2 - r) * px, at[2]]} color={color} />] : [],
          ),
        ),
      )}
    </>
  );
}
