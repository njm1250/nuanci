"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

export type RenderStyle = "pixel" | "mono" | "riso";

const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

export const RENDER_STYLES: Record<Exclude<RenderStyle, "pixel">, { label: string; palette: string[]; spread: number; pixelsWide: number; mono: boolean }> = {
  mono: { label: "1비트 인쇄", palette: ["#1d1b19", "#efe9dc"], spread: 0, pixelsWide: 300, mono: true },
  riso: { label: "리소 3도", palette: ["#efe7d6", "#2f4fa0", "#e8607a", "#f0c23a", "#22223a"], spread: 0.18, pixelsWide: 260, mono: false },
};

const MAX = 6;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D tDiffuse;
  uniform vec2 uRes;
  uniform vec3 uPal[${MAX}];
  uniform int uCount;
  uniform float uSpread;
  uniform bool uMono;
  uniform float uExposure;
  varying vec2 vUv;

  float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
  float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }

  void main() {
    vec2 cell = floor(vUv * uRes);
    vec3 c = pow(texture2D(tDiffuse, (cell + 0.5) / uRes).rgb * uExposure, vec3(1.0 / 2.2));
    float t = bayer4(cell);
    if (uMono) {
      float l = smoothstep(0.12, 0.88, dot(c, vec3(0.299, 0.587, 0.114)));
      float band = floor(l * 4.0 + 0.5) / 4.0;
      gl_FragColor = vec4(band > t ? uPal[1] : uPal[0], 1.0);
      return;
    }
    c += (t - 0.5) * uSpread;
    vec3 best = uPal[0];
    float bestD = 1e9;
    for (int i = 0; i < ${MAX}; i++) {
      if (i >= uCount) break;
      vec3 d = c - uPal[i];
      float dist = dot(d, d);
      if (dist < bestD) { bestD = dist; best = uPal[i]; }
    }
    gl_FragColor = vec4(best, 1.0);
  }
`;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// 장면을 저해상도로 먼저 그린 뒤, 정해진 잉크 색만으로 디더링해서 인쇄물 같은 질감을 만든다
export function DitherPass({ style, exposure = 1 }: { style: Exclude<RenderStyle, "pixel">; exposure?: number }) {
  const size = useThree((s) => s.size);
  const conf = RENDER_STYLES[style];
  const w = conf.pixelsWide;
  const h = Math.max(1, Math.round((w * size.height) / size.width));

  const pass = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    const pal = conf.palette.map(hex);
    while (pal.length < MAX) pal.push(new THREE.Vector3());
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: target.texture },
        uRes: { value: new THREE.Vector2(w, h) },
        uPal: { value: pal },
        uCount: { value: conf.palette.length },
        uSpread: { value: conf.spread },
        uMono: { value: conf.mono },
        uExposure: { value: exposure },
      },
      depthTest: false,
      depthWrite: false,
    });
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    return { target, material, scene, camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }, [conf, w, h, exposure]);

  useEffect(
    () => () => {
      pass.target.dispose();
      pass.material.dispose();
    },
    [pass],
  );

  useFrame((state) => {
    const { gl, scene, camera } = state;
    gl.setRenderTarget(pass.target);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.render(pass.scene, pass.camera);
  }, 1);

  return null;
}
