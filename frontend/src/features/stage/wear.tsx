"use client";

import * as THREE from "three";
import { C } from "./palette";
import type { Worn } from "./types";

const PX = 0.028;
const INK = "#141317";
const PINK = "#f08aa8";
const GOLD = "#e8b931";

type V3 = [number, number, number];

// 2.5D 도트 레이어용 사각형 파츠: 외곽선(outline)을 뒤쪽 Z평면에 깔아 겹침 노이즈 없이 깔끔한 1픽셀 먹선을 만든다
export function PixRect({
    w,
    h,
    at,
    color,
    rot = 0,
    outline = true,
    outlineZ = -0.035,
}: {
    w: number;
    h: number;
    at: V3;
    color: string;
    rot?: number;
    outline?: boolean;
    outlineZ?: number;
}) {
    return (
        <group position={at} rotation={[0, 0, rot]}>
            {outline && (
                <mesh position={[0, 0, outlineZ]}>
                    <boxGeometry args={[w + PX * 2.1, h + PX * 2.1, 0.01]} />
                    <meshBasicMaterial color={INK} />
                </mesh>
            )}
            <mesh>
                <boxGeometry args={[w, h, 0.012]} />
                <meshBasicMaterial color={color} />
            </mesh>
        </group>
    );
}

// 2.5D 도트 레이어용 둥근 파츠 (찹쌀떡 머리, 똥머리, 만두 손, 둥근 귀 등)
export function PixOval({
    rx,
    ry,
    at,
    color,
    rot = 0,
    outline = true,
    outlineZ = -0.035,
    segments = 24,
}: {
    rx: number;
    ry: number;
    at: V3;
    color: string;
    rot?: number;
    outline?: boolean;
    outlineZ?: number;
    segments?: number;
}) {
    return (
        <group position={at} rotation={[0, 0, rot]}>
            {outline && (
                <mesh position={[0, 0, outlineZ]} scale={[rx + PX * 1.08, ry + PX * 1.08, 1]}>
                    <circleGeometry args={[1, segments]} />
                    <meshBasicMaterial color={INK} side={THREE.DoubleSide} />
                </mesh>
            )}
            <mesh scale={[rx, ry, 1]}>
                <circleGeometry args={[1, segments]} />
                <meshBasicMaterial color={color} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

// 머리에 쓰는 도트 스타일 아이템. 머리 그룹 좌표 기준이라 고개를 돌리면 같이 움직인다
export function HeadWear({ wear, dir = 1 }: { wear: Worn[]; dir?: number }) {
    return (
        <group position={[0, 0, 0.08]}>
            {wear.map(({ id, color }) => {
                switch (id) {
                    case "cap":
                        return (
                            <group key={id}>
                                <PixOval rx={0.41} ry={0.22} at={[0, 0.19, 0]} color={color ?? C.rust} />
                                <PixRect w={0.46} h={0.06} at={[0.08 * dir, 0.11, 0.01]} color={color ?? C.rust} />
                            </group>
                        );
                    case "beanie":
                        return (
                            <group key={id}>
                                <PixOval rx={0.4} ry={0.24} at={[0, 0.2, 0]} color={color ?? C.navy} />
                                <PixRect w={0.78} h={0.09} at={[0, 0.1, 0.01]} color={color ?? C.navy} />
                                <PixOval rx={0.085} ry={0.085} at={[0, 0.43, 0]} color={C.paper} />
                            </group>
                        );
                    case "headphones":
                        return (
                            <group key={id}>
                                <PixRect w={0.82} h={0.06} at={[0, 0.34, -0.02]} color={INK} outline={false} />
                                {[-1, 1].map((s) => (
                                    <PixRect key={s} w={0.12} h={0.22} at={[0.41 * s, -0.02, 0.01]} color={color ?? C.teal} />
                                ))}
                            </group>
                        );
                    case "crown":
                        return (
                            <group key={id} position={[0, 0.38, 0.01]}>
                                <PixRect w={0.38} h={0.12} at={[0, 0, 0]} color={GOLD} />
                                {[-1, 0, 1].map((s) => (
                                    <PixRect key={s} w={0.08} h={0.1} at={[0.13 * s, 0.08, 0]} color={GOLD} />
                                ))}
                            </group>
                        );
                    case "cat-ears":
                        return (
                            <group key={id}>
                                <PixRect w={0.7} h={0.045} at={[0, 0.31, 0]} color={color ?? INK} outline={false} />
                                {[-1, 1].map((s) => (
                                    <group key={s} position={[0.23 * s, 0.38, 0]}>
                                        <PixRect w={0.15} h={0.16} at={[0, 0, 0]} color={color ?? INK} rot={-0.28 * s} />
                                        <PixRect
                                            w={0.075}
                                            h={0.09}
                                            at={[0, -0.01, 0.01]}
                                            color={color === PINK ? C.paper : PINK}
                                            rot={-0.28 * s}
                                            outline={false}
                                        />
                                    </group>
                                ))}
                            </group>
                        );
                    case "flower":
                        return (
                            <group key={id} position={[0.28 * dir, 0.2, 0.02]}>
                                {[
                                    [0.055, 0],
                                    [-0.055, 0],
                                    [0, 0.055],
                                    [0, -0.055],
                                ].map(([x, y]) => (
                                    <PixRect key={`${x}${y}`} w={0.065} h={0.065} at={[x, y, 0]} color={color ?? PINK} />
                                ))}
                                <PixRect
                                    w={0.055}
                                    h={0.055}
                                    at={[0, 0, 0.01]}
                                    color={color === GOLD ? C.paper : GOLD}
                                    outline={false}
                                />
                            </group>
                        );
                    case "glasses":
                        return (
                            <group key={id} position={[0.028 * dir, -0.042, 0.01]}>
                                {[-1, 1].map((s) => (
                                    <PixRect key={s} w={0.19} h={0.15} at={[0.155 * s, 0, 0]} color={color ?? GOLD} outline={false} />
                                ))}
                                {[-1, 1].map((s) => (
                                    <PixRect key={`l${s}`} w={0.13} h={0.09} at={[0.155 * s, 0, 0.005]} color="#bfe3f2" outline={false} />
                                ))}
                            </group>
                        );
                    case "sunglasses":
                        return (
                            <group key={id} position={[0.028 * dir, -0.042, 0.01]}>
                                <PixRect w={0.52} h={0.035} at={[0, 0.05, 0]} color={INK} outline={false} />
                                {[-1, 1].map((s) => (
                                    <PixRect key={s} w={0.2} h={0.135} at={[0.155 * s, 0, 0.005]} color={INK} outline={false} />
                                ))}
                                {[-1, 1].map((s) => (
                                    <PixRect key={`g${s}`} w={0.045} h={0.045} at={[0.155 * s - 0.03, 0.025, 0.01]} color="#ffffff" outline={false} />
                                ))}
                            </group>
                        );
                    default:
                        return null;
                }
            })}
        </group>
    );
}

// 목에 하는 도트 스타일 아이템. 몸통 그룹 좌표 기준이다
export function NeckWear({ wear, torsoH = 0.42 }: { wear: Worn[]; torsoH?: number }) {
    return (
        <group position={[0, 0, 0.02]}>
            {wear.map(({ id, color }) => {
                switch (id) {
                    case "scarf":
                        return (
                            <group key={id}>
                                <PixRect w={0.44} h={0.09} at={[0, torsoH - 0.02, 0]} color={color ?? C.rust} />
                                <PixRect w={0.1} h={0.2} at={[0.09, torsoH - 0.12, 0.01]} color={color ?? C.rust} rot={-0.1} />
                            </group>
                        );
                    case "bowtie":
                        return (
                            <group key={id}>
                                {[-1, 1].map((s) => (
                                    <PixRect
                                        key={s}
                                        w={0.095}
                                        h={0.075}
                                        at={[0.06 * s, torsoH - 0.05, 0]}
                                        color={color ?? C.rust}
                                        rot={0.22 * s}
                                        outline={false}
                                    />
                                ))}
                                <PixRect w={0.048} h={0.048} at={[0, torsoH - 0.05, 0.005]} color={INK} outline={false} />
                            </group>
                        );
                    case "badge":
                        return (
                            <group key={id}>
                                {[-1, 1].map((s) => (
                                    <PixRect
                                        key={s}
                                        w={0.03}
                                        h={0.18}
                                        at={[0.055 * s, torsoH - 0.09, 0]}
                                        color={C.teal}
                                        rot={-0.22 * s}
                                        outline={false}
                                    />
                                ))}
                                <PixRect w={0.13} h={0.14} at={[0, torsoH - 0.21, 0.005]} color={C.paper} />
                                <PixRect w={0.13} h={0.04} at={[0, torsoH - 0.17, 0.01]} color={C.teal} outline={false} />
                            </group>
                        );
                    default:
                        return null;
                }
            })}
        </group>
    );
}
