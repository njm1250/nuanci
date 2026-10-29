"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Expression, Motion } from "@/features/scene/types";
import { C } from "./palette";
import { targetPose } from "./pose";
import { HeldProp } from "./props";
import type { Look, Placement, PropId } from "./types";
import { HeadWear, NeckWear, PixOval, PixRect } from "./wear";

const INK = "#141317";
const SKIN = "#ffe3ca";
const SKIN_SHADE = "#f3c6a3";
const BLUSH = "#ff7aa2";
const MOUTH = "#d94862";
const TEAR = "#7fb4d8";
const HEART = "#e03168";
const GOLD = "#e8b931";

export const HIP = { sit: 0.48, stand: 0.42 };

// 카운터 뒤(z < -0.4)에 서 있는 점원은 상체와 얼굴이 카운터 위로 다 보이도록 발판 높이(0.34)를 더한다
const counterLift = (p: Placement) => ((p.z ?? 0) < -0.4 ? 0.34 : 0);

// 동물 캐릭터는 머리가 크고 귀가 솟아 있어서 말풍선을 조금 더 위에 띄운다
export const headTop = (p: Placement, look?: Look) =>
    HIP[p.posture] + counterLift(p) + (look?.animal ? 1.43 : 1.41);

function shiftColor(hex: string, amount: number): string {
    const c = new THREE.Color(hex);
    if (amount > 0) {
        c.lerp(new THREE.Color("#ffffff"), amount);
    } else {
        c.lerp(new THREE.Color("#141317"), -amount);
    }
    return `#${c.getHexString()}`;
}

// 동작(motion)과 반응(expression)을 조합해 치비 캐릭터가 지을 표정을 결정한다
function resolveExpression(expression: Expression | null | undefined, motion: Motion): Expression {
    if (expression) return expression;
    switch (motion) {
        case "bounce":
        case "clap":
        case "wave":
            return "happy";
        case "spin":
        case "dance":
            return "delighted";
        case "tilt":
        case "shrug":
            return "puzzled";
        case "shiver":
        case "facepalm":
            return "awkward";
        case "panic":
            return "shocked";
        case "faint":
        case "flop":
            return "dizzy";
        case "sob":
            return "crying";
        case "patBelly":
            return "stuffed";
        case "bow":
            return "sleepy";
        default:
            return "neutral";
    }
}

// 2등신 도트 스타일 치비 인물:
// - 모든 외곽선(INK)을 채움 레이어 뒤쪽 Z평면에 통합 배치하여 내부 검은 점이나 눈 잘림이 없음
// - Baby Schema(2등신 큰 찹쌀떡 머리, 낮은 눈·볼터치·입 배치, 선명한 도트 안광, 만두 손)
// - 12가지 애니메이션 원칙(예비 동작 Squash, 탄성 Stretch, 2차 스프링 오버슈트, 바보털·똥머리·귀·꼬리 후속 동작)
export function Figure({
    placement,
    look,
    motion,
    motionKey,
    talkKey,
    reduced,
    prop,
    expression,
}: {
    placement: Placement;
    look: Look;
    motion: Motion;
    motionKey: number;
    talkKey: number;
    reduced: boolean;
    prop?: PropId;
    expression?: Expression | null;
}) {
    const root = useRef<THREE.Group>(null!);
    const scaleGroup = useRef<THREE.Group>(null!);
    const torso = useRef<THREE.Group>(null!);
    const head = useRef<THREE.Group>(null!);
    const hairFollow = useRef<THREE.Group>(null!);
    const tailRef = useRef<THREE.Group>(null!);
    const lArm = useRef<THREE.Group>(null!);
    const rArm = useRef<THREE.Group>(null!);
    const lLeg = useRef<THREE.Group>(null!);
    const rLeg = useRef<THREE.Group>(null!);

    // 표정·깜빡임·립싱크용 ref
    const normalEyesRef = useRef<THREE.Group>(null!);
    const blinkEyesRef = useRef<THREE.Group>(null!);
    const happyEyesRef = useRef<THREE.Group>(null!);
    const shockedEyesRef = useRef<THREE.Group>(null!);
    const dizzyEyesRef = useRef<THREE.Group>(null!);
    const cryEyesRef = useRef<THREE.Group>(null!);
    const heartEyesRef = useRef<THREE.Group>(null!);
    const browsRef = useRef<THREE.Group>(null!);
    const lBrowRef = useRef<THREE.Mesh>(null!);
    const rBrowRef = useRef<THREE.Mesh>(null!);
    const sweatRef = useRef<THREE.Group>(null!);
    const mouthClosedRef = useRef<THREE.Group>(null!);
    const mouthOpenRef = useRef<THREE.Group>(null!);
    const mouthShockRef = useRef<THREE.Mesh>(null!);

    const motionStart = useRef({ key: Number.NaN, at: 0 });
    const talkStart = useRef({ key: talkKey, at: -99 });

    const spring = useRef({
        x: 0, vx: 0,
        y: 0, vy: 0,
        spin: 0, vSpin: 0,
        tilt: 0, vTilt: 0,
        torsoX: 0, vTorsoX: 0,
        headX: 0, vHeadX: 0,
        headY: 0, vHeadY: 0,
        headZ: 0, vHeadZ: 0,
        lArmZ: 0.25, vLArmZ: 0,
        rArmZ: -0.25, vRArmZ: 0,
        lArmY: 0, vLArmY: 0,
        rArmY: 0, vRArmY: 0,
        followZ: 0, vFollowZ: 0,
    });

    const sit = placement.posture === "sit";
    const hip = HIP[placement.posture];
    const torsoH = 0.42;
    const armLen = 0.24;
    const animal = look.animal;
    const skin = animal?.fur ?? SKIN;
    const skinShade = useMemo(() => (animal ? shiftColor(animal.fur, -0.1) : SKIN_SHADE), [animal]);
    const shirtShade = useMemo(() => shiftColor(look.shirt, -0.18), [look.shirt]);

    // 상대방을 바라보는 방향(+1: 오른쪽을 봄, -1: 왼쪽을 봄)
    const dir = placement.facing >= 0 ? 1 : -1;
    // 의자 등받이나 식탁 다리와 겹치지 않도록 살짝 앞쪽 Z평면에 세운다
    const baseZ = (placement.z ?? 0) + (sit ? 0.26 : 0.08);
    const baseY = counterLift(placement);
    const blinkOffset = placement.x < 0 ? 1.4 : 2.5;

    useFrame((state, rawDt) => {
        const dt = Math.min(rawDt, 0.05);
        const now = state.clock.elapsedTime;
        if (motionStart.current.key !== motionKey) {
            motionStart.current = { key: motionKey, at: now };
        }
        if (talkStart.current.key !== talkKey) {
            talkStart.current = { key: talkKey, at: now };
        }

        const mt = reduced ? 99 : now - motionStart.current.at;
        const tt = reduced ? 99 : now - talkStart.current.at;
        const p = targetPose(motion, mt);

        // 2.5D 도트 캐릭터에 맞춘 앙증맞은 양팔 각도 매핑
        let targetLArmZ = -0.28;
        let targetRArmZ = 0.28;
        let targetLArmY = 0;
        let targetRArmY = 0;

        switch (motion) {
            case "bounce":
            case "spin":
                if (mt < 1.3) {
                    targetLArmZ = -2.4;
                    targetRArmZ = 2.4;
                }
                break;
            case "dance":
                targetLArmZ = -2.1 + Math.sin(mt * 8) * 0.65;
                targetRArmZ = 2.1 + Math.sin(mt * 8) * 0.65;
                break;
            case "panic":
                targetLArmZ = -2.3 + Math.sin(mt * 18) * 0.5;
                targetRArmZ = 2.3 + Math.cos(mt * 18) * 0.5;
                break;
            case "wave":
                if (dir > 0) {
                    targetRArmZ = 2.35 + Math.sin(mt * 12) * 0.35;
                } else {
                    targetLArmZ = -2.35 - Math.sin(mt * 12) * 0.35;
                }
                break;
            case "clap": {
                const clapS = Math.abs(Math.sin(mt * 12)) * Math.max(0, 1 - mt / 1.6);
                targetLArmZ = 0.55 - clapS * 0.45;
                targetRArmZ = -0.55 + clapS * 0.45;
                targetLArmY = 0.04;
                targetRArmY = 0.04;
                break;
            }
            case "sob":
                targetLArmZ = 1.85;
                targetRArmZ = -1.85;
                targetLArmY = 0.08;
                targetRArmY = 0.08;
                break;
            case "facepalm":
                if (dir > 0) {
                    targetRArmZ = -1.95;
                    targetRArmY = 0.08;
                } else {
                    targetLArmZ = 1.95;
                    targetLArmY = 0.08;
                }
                break;
            case "tilt":
                if (dir > 0) {
                    targetRArmZ = -1.65;
                    targetRArmY = 0.06;
                } else {
                    targetLArmZ = 1.65;
                    targetLArmY = 0.06;
                }
                break;
            case "shrug":
                targetLArmZ = -1.15;
                targetRArmZ = 1.15;
                targetLArmY = 0.05;
                targetRArmY = 0.05;
                break;
            case "patBelly":
                targetLArmZ = 0.35;
                targetRArmZ = -0.45 + Math.sin(mt * 8) * 0.2;
                break;
            case "point":
            case "aim":
                if (dir > 0) {
                    targetRArmZ = 1.45;
                } else {
                    targetLArmZ = -1.45;
                }
                break;
            default:
                break;
        }

        // 1. 살아 숨 쉬는 아이들(Idle) 호흡과 미세 리듬
        const breathPhase = now * 3.4 + blinkOffset;
        if (!reduced && motion === "idle") {
            p.rootY += Math.sin(breathPhase) * 0.015;
            p.headZ += Math.sin(breathPhase * 0.5) * 0.032;
            targetLArmZ -= Math.sin(breathPhase) * 0.04;
            targetRArmZ += Math.sin(breathPhase) * 0.04;
        }

        // 2. 말할 때 손짓 + 고개 까딱임
        const isTalking = !reduced && tt >= 0 && tt < 1.15;
        if (isTalking && motion === "idle") {
            if (dir > 0) {
                targetRArmZ = 1.15 + Math.sin(tt * 15) * 0.25;
            } else {
                targetLArmZ = -1.15 - Math.sin(tt * 15) * 0.25;
            }
            p.headZ += Math.sin(tt * 14) * 0.065;
            p.rootY += Math.abs(Math.sin(tt * 12)) * 0.025;
        }

        // 3. 2차 스프링 물리로 오버슈트(Overshoot) & 안착(Settle) 계산
        const s = spring.current;
        const stepSpring = (
            cur: number,
            vel: number,
            target: number,
            stiffness = 190,
            damping = 15,
        ): [number, number] => {
            if (reduced) return [target, 0];
            const force = (target - cur) * stiffness;
            const nextVel = (vel + force * dt) * Math.exp(-damping * dt);
            const nextCur = cur + nextVel * dt;
            return [nextCur, nextVel];
        };

        if (Math.abs(s.spin - p.rootSpin) > Math.PI) {
            s.spin -= Math.sign(s.spin - p.rootSpin) * Math.PI * 2;
        }

        [s.x, s.vx] = stepSpring(s.x, s.vx, p.rootX * dir, 210, 16);
        [s.y, s.vy] = stepSpring(s.y, s.vy, p.rootY, 220, 15);
        [s.spin, s.vSpin] = stepSpring(s.spin, s.vSpin, p.rootSpin, 180, 14);
        const targetTilt = (p.rootTilt + (motion === "flop" && mt >= 0.3 ? 0.55 : 0)) * (placement.x > 0 ? -1 : 1);
        [s.tilt, s.vTilt] = stepSpring(s.tilt, s.vTilt, targetTilt, 170, 13);
        [s.torsoX, s.vTorsoX] = stepSpring(s.torsoX, s.vTorsoX, p.torsoX * 0.35, 190, 15);
        [s.headX, s.vHeadX] = stepSpring(s.headX, s.vHeadX, p.headX * 0.4, 175, 13);
        [s.headY, s.vHeadY] = stepSpring(s.headY, s.vHeadY, p.headY * 0.35, 175, 13);
        const headTiltZ = -p.headZ * dir + (motion === "nod" ? Math.sin(mt * 10) * 0.14 * Math.max(0, 1 - mt / 1.4) : 0);
        [s.headZ, s.vHeadZ] = stepSpring(s.headZ, s.vHeadZ, headTiltZ, 165, 11);
        [s.lArmZ, s.vLArmZ] = stepSpring(s.lArmZ, s.vLArmZ, targetLArmZ, 210, 14);
        [s.rArmZ, s.vRArmZ] = stepSpring(s.rArmZ, s.vRArmZ, targetRArmZ, 210, 14);
        [s.lArmY, s.vLArmY] = stepSpring(s.lArmY, s.vLArmY, targetLArmY, 200, 15);
        [s.rArmY, s.vRArmY] = stepSpring(s.rArmY, s.vRArmY, targetRArmY, 200, 15);

        // 후속 동작(Follow-Through): 바보털·똥머리·귀가 머리 움직임을 한 박자 늦게 따라가며 흔들린다
        const followTargetZ = -s.vHeadZ * 0.065 - s.vy * 0.14 * dir;
        [s.followZ, s.vFollowZ] = stepSpring(s.followZ, s.vFollowZ, followTargetZ, 140, 8);

        const bowDrop = motion === "bow" ? Math.sin(Math.PI * Math.min(mt / 1.4, 1)) * 0.12 : 0;

        root.current.position.x = s.x;
        root.current.position.y = s.y;
        root.current.rotation.y = s.spin;
        root.current.rotation.z = sit ? 0 : s.tilt;
        torso.current.rotation.z = sit ? s.tilt * 0.82 : 0;
        torso.current.position.y = hip - bowDrop * 0.4;
        head.current.position.y = torsoH + 0.35 - bowDrop * 0.8;
        head.current.rotation.z = s.headZ;
        lArm.current.rotation.z = s.lArmZ;
        rArm.current.rotation.z = s.rArmZ;
        lArm.current.position.y = torsoH - 0.06 + s.lArmY;
        rArm.current.position.y = torsoH - 0.06 + s.rArmY;

        if (hairFollow.current) {
            hairFollow.current.rotation.z = s.followZ;
        }
        if (tailRef.current) {
            const wagSpeed = motion === "bounce" || motion === "dance" ? 16 : 6;
            tailRef.current.rotation.z = Math.sin(now * wagSpeed) * 0.28;
        }

        // 다리 종종걸음 애니메이션 (점프·춤·패닉 시 발을 동동 구른다)
        if (lLeg.current && rLeg.current) {
            if (!reduced && (motion === "dance" || motion === "panic" || motion === "bounce")) {
                const kick = Math.sin(now * (motion === "panic" ? 24 : 12)) * 0.04;
                lLeg.current.position.y = hip + Math.max(0, kick);
                rLeg.current.position.y = hip + Math.max(0, -kick);
            } else {
                lLeg.current.position.y = hip;
                rLeg.current.position.y = hip;
            }
        }

        // 4. Squash & Stretch (부피 보존 찌부 & 쭈욱 탄성):
        let sy = 1.0;
        const trigT = Math.min(mt, tt >= 0 ? tt : 99);
        if (!reduced && trigT < 0.36 && motion !== "idle") {
            if (trigT < 0.065) {
                const k = trigT / 0.065;
                sy = 1.0 - 0.14 * Math.sin(k * Math.PI * 0.5);
            } else if (trigT < 0.18) {
                const k = (trigT - 0.065) / 0.115;
                sy = 0.86 + 0.26 * Math.sin(k * Math.PI * 0.5);
            } else {
                const k = (trigT - 0.18) / 0.18;
                sy = 1.12 - 0.12 * k - Math.sin(k * Math.PI) * 0.04;
            }
        } else if (!reduced && tt >= 0 && tt < 0.24) {
            sy = 1.0 + Math.sin((tt / 0.24) * Math.PI) * 0.07;
        }
        if (!reduced) {
            sy += Math.max(-0.12, Math.min(0.14, s.vy * 0.09));
        }
        const sx = 1.0 / Math.sqrt(Math.max(0.75, sy));
        scaleGroup.current.scale.set(sx, sy, 1);

        // 5. 실시간 도트 표정 & 눈 깜빡임 & 립싱크 업데이트
        const expr = resolveExpression(expression, motion);
        const blinkCycle = (now + blinkOffset) % 3.6;
        const isBlinking = !reduced && now > 0.8 && blinkCycle < 0.13;

        const showHappy = expr === "happy" || expr === "delighted" || expr === "stuffed";
        const showShock = expr === "shocked";
        const showDizzy = expr === "dizzy";
        const showCry = expr === "crying";
        const showHeart = expr === "love";
        const showBlink = !showHappy && !showShock && !showDizzy && !showCry && !showHeart && (isBlinking || expr === "sleepy");
        const showNormal = !showHappy && !showShock && !showDizzy && !showCry && !showHeart && !showBlink;

        if (normalEyesRef.current) normalEyesRef.current.visible = showNormal;
        if (blinkEyesRef.current) blinkEyesRef.current.visible = showBlink;
        if (happyEyesRef.current) happyEyesRef.current.visible = showHappy;
        if (shockedEyesRef.current) shockedEyesRef.current.visible = showShock;
        if (dizzyEyesRef.current) dizzyEyesRef.current.visible = showDizzy;
        if (cryEyesRef.current) cryEyesRef.current.visible = showCry;
        if (heartEyesRef.current) heartEyesRef.current.visible = showHeart;

        // 눈썹은 감정 표현(화남·의문·당황·울음)일 때만 선명하게 띄워 평소에는 큰 눈과 앞머리가 깔끔하게 보이게 한다
        if (browsRef.current && lBrowRef.current && rBrowRef.current) {
            const needBrows = expr === "angry" || expr === "puzzled" || expr === "awkward" || expr === "crying";
            browsRef.current.visible = needBrows;
            if (expr === "angry") {
                lBrowRef.current.rotation.z = -0.35;
                rBrowRef.current.rotation.z = 0.35;
                lBrowRef.current.position.y = 0.075;
                rBrowRef.current.position.y = 0.075;
            } else if (expr === "puzzled") {
                lBrowRef.current.rotation.z = 0.25;
                rBrowRef.current.rotation.z = -0.05;
                lBrowRef.current.position.y = 0.105;
                rBrowRef.current.position.y = 0.07;
            } else if (expr === "awkward" || expr === "crying") {
                lBrowRef.current.rotation.z = 0.32;
                rBrowRef.current.rotation.z = -0.32;
                lBrowRef.current.position.y = 0.085;
                rBrowRef.current.position.y = 0.085;
            }
        }

        if (sweatRef.current) {
            sweatRef.current.visible = expr === "awkward" || motion === "shiver" || motion === "panic";
        }

        const talkMouthOpen = isTalking && Math.sin(tt * 28) > -0.1;
        const wantShockMouth = showShock || showDizzy || expr === "crying";
        const wantOpenSmile = !wantShockMouth && (talkMouthOpen || expr === "delighted" || expr === "happy" || motion === "bounce" || motion === "dance");
        if (mouthShockRef.current) mouthShockRef.current.visible = wantShockMouth;
        if (mouthOpenRef.current) mouthOpenRef.current.visible = wantOpenSmile;
        if (mouthClosedRef.current) mouthClosedRef.current.visible = !wantShockMouth && !wantOpenSmile;
    });

    const arm = (side: 1 | -1, ref: React.RefObject<THREE.Group>) => (
        <group ref={ref} position={[0.235 * side, torsoH - 0.06, 0.015]}>
            {/* 통통한 치비 소매 */}
            <PixRect w={0.115} h={armLen} at={[0, -armLen / 2, 0]} color={look.shirt} outlineZ={-0.05} />
            {/* 동글동글한 만두 손 */}
            <PixOval rx={0.068} ry={0.068} at={[0, -armLen - 0.02, 0.005]} color={skin} outlineZ={-0.055} />
            {side === dir && prop && (
                <group position={[0.04 * dir, 0.24, 0.08]} rotation={[0, dir * 0.9, 0]} scale={0.85}>
                    <HeldProp id={prop} />
                </group>
            )}
        </group>
    );

    const legH = hip - 0.04;

    return (
        <group position={[placement.x, baseY, baseZ]}>
            <group ref={root}>
                <group ref={scaleGroup}>
                    {/* 1. 하체: 앙증맞은 2등신 도트 다리 & 신발 */}
                    <group ref={lLeg} position={[-0.09, hip, 0]}>
                        <PixRect w={0.12} h={legH} at={[0, -legH / 2, 0]} color={INK} outline={false} />
                        <PixRect w={0.145} h={0.075} at={[0.015 * dir, -legH, 0.005]} color="#2a2730" />
                    </group>
                    <group ref={rLeg} position={[0.09, hip, 0]}>
                        <PixRect w={0.12} h={legH} at={[0, -legH / 2, 0]} color={INK} outline={false} />
                        <PixRect w={0.145} h={0.075} at={[0.015 * dir, -legH, 0.005]} color="#2a2730" />
                    </group>

                    {/* 2. 상체: 통통한 사다리꼴 도트 몸통 + 하단 명암 띠 + 카라 */}
                    <group ref={torso} position={[0, hip, 0]}>
                        {/* 동물 꼬리 (몸통 뒤쪽 레이어) */}
                        {animal && (
                            <group ref={tailRef} position={[-0.18 * dir, 0.12, -0.06]}>
                                {animal.kind === "cat" && (
                                    <PixRect w={0.28} h={0.075} at={[-0.08 * dir, 0.08, 0]} color={animal.fur} rot={-0.55 * dir} />
                                )}
                                {animal.kind === "bear" && <PixOval rx={0.085} ry={0.085} at={[-0.04 * dir, 0.02, 0]} color={animal.fur} />}
                                {animal.kind === "dog" && (
                                    <PixRect w={0.08} h={0.2} at={[-0.05 * dir, 0.08, 0]} color={animal.inner} rot={0.45 * dir} />
                                )}
                            </group>
                        )}

                        {/* 몸통 메인 실루엣 */}
                        <PixOval rx={0.235} ry={torsoH * 0.54} at={[0, torsoH * 0.48, 0]} color={look.shirt} />
                        <PixRect w={0.44} h={0.18} at={[0, 0.1, 0.002]} color={look.shirt} />
                        {/* 하단 도트 셀 명암 */}
                        <PixRect w={0.43} h={0.07} at={[0, 0.045, 0.005]} color={shirtShade} outline={false} />
                        {/* 귀여운 V넥/카라 포인트 */}
                        <PixRect w={0.16} h={0.05} at={[0.02 * dir, torsoH - 0.03, 0.008]} color={C.paper} outline={false} />

                        {look.apron && <PixRect w={0.32} h={0.31} at={[0.015 * dir, 0.16, 0.012]} color={look.apron} />}
                        {look.tie && <PixRect w={0.075} h={0.25} at={[0.02 * dir, 0.22, 0.014]} color={look.tie} outline={false} />}
                        {look.wear && <NeckWear wear={look.wear} torsoH={torsoH} />}

                        {arm(-1, lArm)}
                        {arm(1, rArm)}

                        {/* =========================================================
                            3. 머리 (2등신 찹쌀떡 도트 헤드):
                               모든 외곽선은 z = -0.035에 깔리고 얼굴·눈·머리카락은 앞쪽 평면에 선명하게 배치
                           ========================================================= */}
                        <group ref={head} position={[0, torsoH + 0.37, 0.02]} scale={animal ? 1.16 : 1.14}>
                            {/* 긴 머리 뒷머리 레이어 (얼굴 뒤쪽) */}
                            {look.hairStyle === "long" && (
                                <PixRect w={0.78} h={0.48} at={[0, -0.14, -0.02]} color={look.hair} outlineZ={-0.03} />
                            )}

                            {/* 정수리 뒤쪽 헤어 볼륨 (얼굴 피부 레이어 바로 뒤에 깔아 눈을 가리지 않게 한다) */}
                            {look.hairStyle !== "none" && (
                                <PixOval
                                    rx={look.hairStyle === "curly" ? 0.425 : 0.405}
                                    ry={look.hairStyle === "curly" ? 0.27 : 0.24}
                                    at={[0, 0.14, -0.006]}
                                    color={look.hair}
                                    outlineZ={-0.032}
                                />
                            )}

                            {/* 양쪽 귀 (외곽선은 머리 뒤쪽에 통합) */}
                            {!animal &&
                                [-1, 1].map((s) => (
                                    <PixOval key={`ear${s}`} rx={0.065} ry={0.075} at={[0.355 * s, -0.045, -0.005]} color={skin} outlineZ={-0.035} />
                                ))}

                            {/* 통통한 찹쌀떡 얼굴 본체 + 턱선 미세 음영 */}
                            <PixOval rx={0.39} ry={0.325} at={[0, 0, 0]} color={skin} outlineZ={-0.035} />
                            <PixOval rx={0.31} ry={0.06} at={[0, -0.23, 0.002]} color={skinShade} outline={false} />

                            {/* 동물 캐릭터 귀 (후속 동작 포함) */}
                            {animal?.kind === "cat" && (
                                <group ref={hairFollow}>
                                    {[-1, 1].map((s) => (
                                        <group key={s} position={[0.24 * s, 0.28, -0.005]} rotation={[0, 0, -0.28 * s]}>
                                            <PixRect w={0.16} h={0.19} at={[0, 0, 0]} color={animal.fur} outlineZ={-0.035} />
                                            <PixRect w={0.08} h={0.1} at={[0, -0.01, 0.005]} color={animal.inner} outline={false} />
                                        </group>
                                    ))}
                                </group>
                            )}
                            {animal?.kind === "bear" && (
                                <group ref={hairFollow}>
                                    {[-1, 1].map((s) => (
                                        <group key={s} position={[0.28 * s, 0.26, -0.005]}>
                                            <PixOval rx={0.125} ry={0.125} at={[0, 0, 0]} color={animal.fur} outlineZ={-0.035} />
                                            <PixOval rx={0.065} ry={0.065} at={[0, 0, 0.005]} color={animal.inner} outline={false} />
                                        </group>
                                    ))}
                                </group>
                            )}
                            {animal?.kind === "dog" && (
                                <group ref={hairFollow}>
                                    {[-1, 1].map((s) => (
                                        <PixRect
                                            key={s}
                                            w={0.13}
                                            h={0.27}
                                            at={[0.37 * s, 0.0, -0.005]}
                                            color={animal.inner}
                                            rot={0.22 * s}
                                            outlineZ={-0.035}
                                        />
                                    ))}
                                </group>
                            )}

                            {/* =========================================================
                                4. 도트 헤어스타일 앞머리 & 포인트 (눈 위에 시원한 이마 여백 확보)
                               ========================================================= */}
                            {look.hairStyle !== "none" && (
                                <group position={[0, 0, 0.012]}>
                                    {/* 이마 윗부분(y = 0.11 위쪽)만 덮는 귀여운 도트 앞머리 */}
                                    <PixOval rx={0.36} ry={0.13} at={[0, 0.22, 0]} color={look.hair} outline={false} />
                                    <PixRect w={0.58} h={0.09} at={[0, 0.175, 0.002]} color={look.hair} outline={false} />
                                    <PixRect w={0.19} h={0.06} at={[-0.18, 0.125, 0.002]} color={look.hair} outline={false} />
                                    <PixRect w={0.19} h={0.06} at={[0.18, 0.125, 0.002]} color={look.hair} outline={false} />
                                    <PixRect w={0.12} h={0.055} at={[0.02 * dir, 0.13, 0.002]} color={look.hair} outline={false} />

                                    {/* 볼 양옆을 감싸는 옆머리(애교머리) */}
                                    {[-1, 1].map((s) => (
                                        <PixRect
                                            key={`side${s}`}
                                            w={0.125}
                                            h={0.23}
                                            at={[0.325 * s, 0.08, 0.004]}
                                            color={look.hair}
                                            outlineZ={-0.05}
                                        />
                                    ))}

                                    {/* 후속 동작(Follow-Through)으로 통통 튀는 머리 포인트 */}
                                    <group ref={hairFollow}>
                                        {look.hairStyle === "short" && (
                                            /* 바보털(아호게) */
                                            <PixRect
                                                w={0.065}
                                                h={0.13}
                                                at={[0.04 * dir, 0.39, -0.005]}
                                                color={look.hair}
                                                rot={-0.32 * dir}
                                                outlineZ={-0.045}
                                            />
                                        )}
                                        {look.hairStyle === "bun" && (
                                            /* Sam의 통통한 똥머리 + 핑크 머리끈 */
                                            <group position={[0, 0.41, -0.005]}>
                                                <PixOval rx={0.155} ry={0.145} at={[0, 0.02, 0]} color={look.hair} outlineZ={-0.045} />
                                                <PixRect w={0.21} h={0.05} at={[0, -0.075, 0.008]} color={BLUSH} outline={false} />
                                            </group>
                                        )}
                                        {look.hairStyle === "long" && (
                                            <>
                                                {[-1, 1].map((s) => (
                                                    <PixRect
                                                        key={`long${s}`}
                                                        w={0.105}
                                                        h={0.27}
                                                        at={[0.325 * s, -0.14, 0.006]}
                                                        color={look.hair}
                                                        outlineZ={-0.05}
                                                    />
                                                ))}
                                                {/* 귀여운 골드 머리핀 */}
                                                <PixRect w={0.095} h={0.038} at={[-0.24 * dir, 0.12, 0.015]} color={GOLD} outline={false} />
                                            </>
                                        )}
                                        {look.hairStyle === "curly" && (
                                            <>
                                                {[-1, 1].map((s) => (
                                                    <PixOval
                                                        key={`curl${s}`}
                                                        rx={0.12}
                                                        ry={0.12}
                                                        at={[0.35 * s, 0.17, -0.005]}
                                                        color={look.hair}
                                                        outlineZ={-0.045}
                                                    />
                                                ))}
                                            </>
                                        )}
                                    </group>

                                    {look.hairStyle === "cap" && (
                                        <PixRect w={0.58} h={0.065} at={[0.06 * dir, 0.16, 0.02]} color={look.apron ?? INK} />
                                    )}
                                </group>
                            )}

                            {/* =========================================================
                                5. 도트 얼굴 이목구비 (상대방 쪽으로 1픽셀 시선 이동하여 자연스러운 3/4 각도 연출)
                               ========================================================= */}
                            <group position={[0.028 * dir, 0, 0.04]}>
                                {/* 동물 코·주둥이 포인트 */}
                                {animal?.kind === "cat" && (
                                    <PixRect w={0.06} h={0.042} at={[0, -0.065, 0.005]} color="#e86a88" outline={false} />
                                )}
                                {(animal?.kind === "bear" || animal?.kind === "dog") && (
                                    <>
                                        <PixOval
                                            rx={0.095}
                                            ry={0.068}
                                            at={[0, -0.085, 0.002]}
                                            color={animal.kind === "bear" ? animal.inner : "#f6ead6"}
                                            outline={false}
                                        />
                                        <PixRect w={0.065} h={0.048} at={[0, -0.06, 0.008]} color={INK} outline={false} />
                                    </>
                                )}

                                {/* 발그레한 도트 볼터치 (눈 바깥쪽 바로 아래) */}
                                {[-1, 1].map((s) => (
                                    <PixRect
                                        key={`blush${s}`}
                                        w={0.135}
                                        h={0.062}
                                        at={[0.26 * s, -0.135, 0]}
                                        color={BLUSH}
                                        outline={false}
                                    />
                                ))}

                                {/* 감정 표현용 도트 눈썹 */}
                                <group ref={browsRef} visible={false}>
                                    <mesh ref={lBrowRef} position={[-0.16, 0.075, 0.01]}>
                                        <boxGeometry args={[0.105, 0.032, 0.01]} />
                                        <meshBasicMaterial color={INK} />
                                    </mesh>
                                    <mesh ref={rBrowRef} position={[0.16, 0.075, 0.01]}>
                                        <boxGeometry args={[0.105, 0.032, 0.01]} />
                                        <meshBasicMaterial color={INK} />
                                    </mesh>
                                </group>

                                {/* (A) 기본 초롱초롱 도트 눈 (숨쉬기 중에도 검은 눈 테두리 안에 안정적으로 자리잡는 화이트 안광) */}
                                <group ref={normalEyesRef}>
                                    {[-1, 1].map((s) => (
                                        <group key={`eye${s}`} position={[0.165 * s, -0.055, 0.005]}>
                                            <PixRect w={0.13} h={0.18} at={[0, 0, 0]} color={INK} outline={false} />
                                            {/* 안광은 눈 한가운데 두면 1~2픽셀로 줄어 구멍 난 네모처럼 보여서, 위쪽 모서리에 붙여 반짝임으로 읽히게 한다 */}
                                            <PixRect w={0.052} h={0.056} at={[0.028 * dir, 0.05, 0.005]} color="#ffffff" outline={false} />
                                        </group>
                                    ))}
                                </group>

                                {/* (B) 눈 깜빡임 / 졸림 (- -) */}
                                <group ref={blinkEyesRef} visible={false}>
                                    {[-1, 1].map((s) => (
                                        <PixRect
                                            key={`blink${s}`}
                                            w={0.12}
                                            h={0.038}
                                            at={[0.16 * s, -0.045, 0.005]}
                                            color={INK}
                                            outline={false}
                                        />
                                    ))}
                                </group>

                                {/* (C) 기쁨 / 신남 도트 반달눈 (^ ^) */}
                                <group ref={happyEyesRef} visible={false}>
                                    {[-1, 1].map((s) => (
                                        <group key={`hap${s}`} position={[0.16 * s, -0.04, 0.005]}>
                                            <PixRect w={0.085} h={0.038} at={[0, 0.028, 0]} color={INK} outline={false} />
                                            <PixRect w={0.038} h={0.05} at={[-0.042, -0.006, 0]} color={INK} outline={false} />
                                            <PixRect w={0.038} h={0.05} at={[0.042, -0.006, 0]} color={INK} outline={false} />
                                        </group>
                                    ))}
                                </group>

                                {/* (D) 충격 / 패닉 도트 눈 (흰자위 + 작은 동공 O O) */}
                                <group ref={shockedEyesRef} visible={false}>
                                    {[-1, 1].map((s) => (
                                        <group key={`shk${s}`} position={[0.16 * s, -0.04, 0.005]}>
                                            {/* 동공이 1픽셀이면 흰 네모만 보여서, 동공을 키워 아래쪽에 붙인다. 놀라 동그래진 눈으로 읽힌다 */}
                                            <PixRect w={0.14} h={0.17} at={[0, 0, 0]} color="#ffffff" outlineZ={-0.005} />
                                            <PixRect w={0.075} h={0.085} at={[0.012 * dir, -0.028, 0.006]} color={INK} outline={false} />
                                        </group>
                                    ))}
                                </group>

                                {/* (E) 기절 / 멘붕 도트 눈 (X X) */}
                                <group ref={dizzyEyesRef} visible={false}>
                                    {[-1, 1].map((s) => (
                                        <group key={`diz${s}`} position={[0.16 * s, -0.04, 0.005]}>
                                            <PixRect w={0.135} h={0.036} at={[0, 0, 0]} color={INK} rot={0.78} outline={false} />
                                            <PixRect w={0.135} h={0.036} at={[0, 0, 0]} color={INK} rot={-0.78} outline={false} />
                                        </group>
                                    ))}
                                </group>

                                {/* (F) 폭풍 눈물 도트 눈 (T T) */}
                                <group ref={cryEyesRef} visible={false}>
                                    {[-1, 1].map((s) => (
                                        <group key={`cry${s}`} position={[0.16 * s, -0.04, 0.005]}>
                                            <PixRect w={0.125} h={0.04} at={[0, 0.022, 0]} color={INK} outline={false} />
                                            <PixRect w={0.052} h={0.16} at={[0, -0.07, -0.002]} color={TEAR} outline={false} />
                                        </group>
                                    ))}
                                </group>

                                {/* (G) 하트 뿅뿅 도트 눈 (♥ ♥) */}
                                <group ref={heartEyesRef} visible={false}>
                                    {[-1, 1].map((s) => (
                                        <group key={`hrt${s}`} position={[0.16 * s, -0.04, 0.005]}>
                                            <PixRect w={0.055} h={0.055} at={[-0.028, 0.028, 0]} color={HEART} outline={false} />
                                            <PixRect w={0.055} h={0.055} at={[0.028, 0.028, 0]} color={HEART} outline={false} />
                                            <PixRect w={0.1} h={0.055} at={[0, -0.01, 0]} color={HEART} outline={false} />
                                            <PixRect w={0.052} h={0.052} at={[0, -0.05, 0]} color={HEART} outline={false} />
                                        </group>
                                    ))}
                                </group>

                                {/* 당황 식은땀 방울 */}
                                <group ref={sweatRef} position={[-0.29 * dir, 0.06, 0.01]} visible={false}>
                                    <PixRect w={0.05} h={0.085} at={[0, 0, 0]} color={TEAR} outlineZ={-0.005} />
                                    <PixRect w={0.07} h={0.058} at={[0, -0.03, 0.002]} color={TEAR} outline={false} />
                                </group>

                                {/* 도트 입: 양 볼터치 바로 사이에 앙증맞게 배치 */}
                                {/* 기본 입: 납작한 막대 대신 양끝이 올라간 작은 미소(‿). 무표정도 순하게 웃는 얼굴로 보인다 */}
                                <group ref={mouthClosedRef} position={[0, -0.13, 0.01]}>
                                    <PixRect w={0.06} h={0.032} at={[0, 0, 0]} color={INK} outline={false} />
                                    {[-1, 1].map((s) => (
                                        <PixRect key={`smile${s}`} w={0.03} h={0.032} at={[0.042 * s, 0.026, 0]} color={INK} outline={false} />
                                    ))}
                                </group>
                                <group ref={mouthOpenRef} position={[0, -0.12, 0.01]} visible={false}>
                                    <PixRect w={0.095} h={0.065} at={[0, 0, 0]} color={MOUTH} outlineZ={-0.005} />
                                </group>
                                <mesh ref={mouthShockRef} position={[0, -0.12, 0.01]} visible={false}>
                                    <boxGeometry args={[0.075, 0.088, 0.01]} />
                                    <meshBasicMaterial color={INK} />
                                </mesh>

                                {/* 캐릭터 기본 안경 */}
                                {look.glasses && (
                                    <group position={[0, -0.042, 0.015]}>
                                        <PixRect w={0.5} h={0.032} at={[0, 0.045, 0]} color={INK} outline={false} />
                                        {[-1, 1].map((s) => (
                                            <PixRect key={`gl${s}`} w={0.185} h={0.14} at={[0.155 * s, 0, 0]} color={INK} outline={false} />
                                        ))}
                                        {[-1, 1].map((s) => (
                                            <PixRect
                                                key={`gll${s}`}
                                                w={0.13}
                                                h={0.092}
                                                at={[0.155 * s, 0, 0.003]}
                                                color="#d8eef6"
                                                outline={false}
                                            />
                                        ))}
                                    </group>
                                )}
                            </group>

                            {look.wear && <HeadWear wear={look.wear} dir={dir} />}
                        </group>
                    </group>
                </group>
            </group>
        </group>
    );
}
