import * as THREE from "three";
import type { Expression } from "../scene";

const SIZE = 256;
const INK = "#2b2320";
const BLUSH = "rgba(226, 116, 104, 0.42)";
const cache = new Map<Expression, THREE.CanvasTexture>();

// 표정별 눈·입을 캔버스에 그려 캐릭터 얼굴에 붙일 텍스처를 만든다
function drawFace(ctx: CanvasRenderingContext2D, e: Expression) {
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 10;
  ctx.lineCap = "round";

  const eyeY = 112;
  const lx = 90;
  const rx = 166;
  const mouthY = 168;

  const dot = (x: number, y: number, r = 11) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  const arc = (x: number, y: number, r: number, a0: number, a1: number) => {
    ctx.beginPath();
    ctx.arc(x, y, r, a0, a1);
    ctx.stroke();
  };
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };
  const blush = () => {
    ctx.fillStyle = BLUSH;
    ctx.beginPath();
    ctx.ellipse(64, 148, 20, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(192, 148, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK;
  };
  const happyEyes = () => {
    arc(lx, eyeY + 8, 15, Math.PI * 1.15, Math.PI * 1.85);
    arc(rx, eyeY + 8, 15, Math.PI * 1.15, Math.PI * 1.85);
  };

  switch (e) {
    case "neutral":
      dot(lx, eyeY);
      dot(rx, eyeY);
      line(114, mouthY, 142, mouthY);
      break;
    case "happy":
      happyEyes();
      arc(128, mouthY - 18, 22, Math.PI * 0.2, Math.PI * 0.8);
      blush();
      break;
    case "delighted":
      happyEyes();
      ctx.beginPath();
      ctx.arc(128, mouthY - 10, 24, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      blush();
      break;
    case "puzzled":
      dot(lx, eyeY);
      dot(rx, eyeY, 9);
      line(70, 84, 106, 86);
      line(150, 74, 186, 64);
      ctx.beginPath();
      ctx.moveTo(112, mouthY);
      ctx.quadraticCurveTo(124, mouthY - 10, 134, mouthY);
      ctx.quadraticCurveTo(142, mouthY + 8, 150, mouthY - 2);
      ctx.stroke();
      break;
    case "awkward":
      dot(lx + 10, eyeY);
      dot(rx + 10, eyeY);
      line(72, 88, 106, 82);
      line(150, 82, 184, 88);
      ctx.beginPath();
      ctx.moveTo(106, mouthY);
      ctx.bezierCurveTo(118, mouthY - 8, 130, mouthY + 8, 150, mouthY - 2);
      ctx.stroke();
      ctx.fillStyle = "#8cc4e0";
      ctx.beginPath();
      ctx.moveTo(214, 52);
      ctx.quadraticCurveTo(228, 78, 214, 86);
      ctx.quadraticCurveTo(200, 78, 214, 52);
      ctx.fill();
      ctx.fillStyle = INK;
      break;
    case "stuffed":
      arc(lx, eyeY - 8, 15, Math.PI * 0.15, Math.PI * 0.85);
      arc(rx, eyeY - 8, 15, Math.PI * 0.15, Math.PI * 0.85);
      arc(128, mouthY - 14, 14, Math.PI * 0.2, Math.PI * 0.8);
      blush();
      break;
  }
}

export function getFaceTexture(e: Expression) {
  const hit = cache.get(e);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  drawFace(canvas.getContext("2d")!, e);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(e, tex);
  return tex;
}
