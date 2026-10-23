"use client";

const R = 2.2;

function Box({
  size,
  position,
  color,
  shadow = true,
}: {
  size: [number, number, number];
  position: [number, number, number];
  color: string;
  shadow?: boolean;
}) {
  return (
    <mesh position={position} castShadow={shadow} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} flatShading roughness={0.9} />
    </mesh>
  );
}

function Blob({
  r,
  position,
  color,
}: {
  r: number;
  position: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} castShadow>
      <icosahedronGeometry args={[r, 0]} />
      <meshStandardMaterial color={color} flatShading roughness={0.8} />
    </mesh>
  );
}

function Plate({ x, food }: { x: number; food: "full" | "half" | "empty" }) {
  return (
    <group position={[x, 0.83, 0]}>
      <mesh receiveShadow castShadow>
        <cylinderGeometry args={[0.22, 0.18, 0.03, 12]} />
        <meshStandardMaterial color="#f7f3ec" flatShading />
      </mesh>
      {food !== "empty" && (
        <>
          <Blob r={food === "full" ? 0.1 : 0.06} position={[0.04, 0.06, -0.05]} color="#f4efe2" />
          <Blob r={food === "full" ? 0.07 : 0.05} position={[-0.07, 0.05, 0.05]} color="#8a5634" />
          {food === "full" && <Blob r={0.05} position={[0.08, 0.04, 0.08]} color="#6f9a4e" />}
        </>
      )}
      {food === "empty" && <Box size={[0.03, 0.015, 0.3]} position={[0.26, 0.02, 0]} color="#b8b2a6" />}
    </group>
  );
}

// 식탁 장면의 세트. 조건이 바뀌면 접시·창밖·조명이 함께 바뀐다
export function DiningRoom({
  condition,
  enclosed,
  showContainer,
}: {
  condition: "base" | "followUp";
  enclosed: boolean;
  showContainer: boolean;
}) {
  const later = condition === "followUp";
  return (
    <group>
      <Box size={[R * 2, 0.12, R * 2]} position={[0, -0.06, 0]} color="#d6c1a1" shadow={false} />
      <Box size={[2.9, 0.02, 2.1]} position={[0, 0.01, 0]} color="#b97b5d" shadow={false} />
      <Box size={[R * 2, 3, 0.12]} position={[0, 1.5, -R - 0.06]} color="#eee4d4" shadow={false} />
      <Box size={[0.12, 3, R * 2]} position={[R + 0.06, 1.5, 0]} color="#e5d7c2" shadow={false} />
      <Box size={[0.06, 0.6, 0.8]} position={[R - 0.01, 1.8, -0.5]} color="#6f8b7b" shadow={false} />
      {enclosed && (
        <>
          <Box size={[0.12, 3, R * 2]} position={[-R - 0.06, 1.5, 0]} color="#e9dece" shadow={false} />
          <Box size={[0.3, 0.05, 1.2]} position={[-R + 0.15, 1.5, -0.4]} color="#8a6446" />
          <Blob r={0.12} position={[-R + 0.15, 1.62, -0.7]} color="#c9a15b" />
          <Box size={[0.14, 0.24, 0.1]} position={[-R + 0.15, 1.65, -0.2]} color="#5f7b8c" />
        </>
      )}

      <Box size={[1.3, 1.0, 0.06]} position={[-0.9, 1.8, -R + 0.01]} color="#f8f4ec" shadow={false} />
      <mesh position={[-0.9, 1.8, -R + 0.05]}>
        <boxGeometry args={[1.12, 0.82, 0.02]} />
        <meshBasicMaterial color={later ? "#3d4766" : "#bdd7e6"} />
      </mesh>

      <mesh position={[R - 0.4, 0.22, R - 0.4]} castShadow>
        <cylinderGeometry args={[0.18, 0.14, 0.44, 7]} />
        <meshStandardMaterial color="#b0654a" flatShading />
      </mesh>
      <Blob r={0.32} position={[R - 0.4, 0.68, R - 0.4]} color="#5f8a57" />
      <Blob r={0.22} position={[R - 0.33, 0.9, R - 0.58]} color="#6f9a61" />

      <Box size={[1.7, 0.08, 1.05]} position={[0, 0.78, 0]} color="#a7734d" />
      {[
        [-0.76, -0.44],
        [0.76, -0.44],
        [-0.76, 0.44],
        [0.76, 0.44],
      ].map(([x, z]) => (
        <Box key={`${x}${z}`} size={[0.08, 0.74, 0.08]} position={[x, 0.37, z]} color="#8c5f3e" />
      ))}

      {[-1, 1].map((s) => (
        <group key={s}>
          <Box size={[0.5, 0.06, 0.5]} position={[1.15 * s, 0.5, 0]} color="#7d5537" />
          <Box size={[0.06, 0.7, 0.5]} position={[1.42 * s, 0.85, 0]} color="#7d5537" />
        </group>
      ))}

      <Plate x={-0.5} food={later ? "half" : "full"} />
      <Plate x={0.5} food={later ? "empty" : "full"} />
      <mesh position={[0, 0.9, -0.27]} castShadow>
        <cylinderGeometry args={[0.2, 0.17, 0.16, 9]} />
        <meshStandardMaterial color="#c0533b" flatShading />
      </mesh>
      <mesh position={[0, 0.985, -0.27]}>
        <cylinderGeometry args={[0.18, 0.18, 0.01, 9]} />
        <meshStandardMaterial color="#d9893a" flatShading />
      </mesh>
      <mesh position={[0.02, 0.87, 0.3]} castShadow>
        <cylinderGeometry args={[0.17, 0.12, 0.09, 9]} />
        <meshStandardMaterial color="#ebe3d3" flatShading />
      </mesh>
      <Blob r={0.08} position={[0.0, 0.94, 0.3]} color="#7aa65a" />
      <Blob r={0.06} position={[0.08, 0.95, 0.26]} color="#94b86a" />
      <Blob r={0.05} position={[-0.06, 0.95, 0.34]} color="#d9603f" />
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.89, -0.32]} castShadow>
          <cylinderGeometry args={[0.05, 0.045, 0.14, 7]} />
          <meshStandardMaterial color="#cfe0e4" flatShading transparent opacity={0.85} />
        </mesh>
      ))}
      {showContainer && (
        <group position={[0.42, 0.88, 0.3]}>
          <Box size={[0.28, 0.1, 0.2]} position={[0, 0, 0]} color="#f2efe8" />
          <Box size={[0.3, 0.03, 0.22]} position={[0, 0.065, 0]} color="#6b9cb8" />
        </group>
      )}

      <mesh position={[0, 2.62, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.75, 4]} />
        <meshBasicMaterial color="#2f2a26" />
      </mesh>
      <mesh position={[0, 2.15, 0]} castShadow>
        <coneGeometry args={[0.3, 0.24, 8, 1, true]} />
        <meshStandardMaterial color="#2f3d37" flatShading side={2} />
      </mesh>
      <mesh position={[0, 2.06, 0]}>
        <icosahedronGeometry args={[0.07, 0]} />
        <meshBasicMaterial color="#ffe2a8" />
      </mesh>
      <pointLight
        position={[0, 1.95, 0]}
        intensity={later ? 7 : 3}
        distance={5}
        decay={1.6}
        color="#ffc98a"
      />
    </group>
  );
}
