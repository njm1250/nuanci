import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const banned = [
  ["-\\[#[0-9a-fA-F]{3,8}", "색은 토큰으로 쓴다(bg-pink, text-ink). 클래스에 #hex를 적지 않는다."],
  ["text-\\[[0-9.]+(px|rem)\\]", "글자 크기는 text-meta … text-display-xl 단계만 쓴다."],
  ["animate-\\[", "움직임은 animate-rise 같은 토큰으로 쓴다. 새 움직임은 globals.css @theme에 이름을 붙여 추가한다."],
  ["(^|[\\s:])duration-[0-9]", "길이는 duration-press·fast·base·slow만 쓴다."],
];
const designRules = banned.flatMap(([pattern, message]) => [
  { selector: `Literal[value=/${pattern}/]`, message },
  { selector: `TemplateElement[value.raw=/${pattern}/]`, message },
]);

// 격자에 기본 열이 없으면 긴 글이 열을 밀어 화면 밖으로 넘친다(2026-11 디자인 검토에서 고친 문제)
const gridBaseCols = {
  meta: { type: "problem", schema: [] },
  create(context) {
    const check = (node, text) => {
      if (!/(^|\s)grid(\s|$)/.test(text)) return;
      if (!/(^|\s)(sm|md|lg|xl|2xl):grid-cols-/.test(text)) return;
      if (/(^|\s)grid-cols-/.test(text)) return;
      context.report({ node, message: "grid에 기본 열이 없다. 'grid grid-cols-1 md:grid-cols-2'처럼 기본 열을 같이 적어야 긴 글이 열을 밀어 넘치지 않는다." });
    };
    return {
      Literal(node) { if (typeof node.value === "string") check(node, node.value); },
      TemplateElement(node) { check(node, node.value.raw); },
    };
  },
};
// 훅 의존성 검사를 끄는 주석은 "고치기 번거로우니 넘어가자"는 탈출구다. 복사되면 패턴이 된다.
// 이미 있는 곳만 허용하고(따로 치운다), 새로 끄는 것은 막는다. 규칙까지 적어 둔 곳은 그 규칙만 허용한다
const hooksDisableAllowed = [
  { file: "src/features/typetest/test-flow.tsx" },
  { file: "src/features/typetest/result-view.tsx" },
  { file: "src/features/stage/thumb-cache.ts" },
  { file: "src/features/scene/wrap-up.tsx" },
  // 홈에서 고른 답을 주소에서 이어받는 한 곳. 서버에서 먼저 그리는 화면이라 피할 수 없는 예외
  { file: "src/features/scene/scene-player.tsx", rule: "react-hooks/set-state-in-effect" },
];
const noHooksEscape = {
  meta: { type: "problem", schema: [] },
  create(context) {
    const file = context.filename.replace(/\\/g, "/");
    const allowed = hooksDisableAllowed.filter((a) => file.endsWith(a.file));
    return {
      Program() {
        for (const c of context.sourceCode.getAllComments()) {
          if (!/eslint-disable/.test(c.value)) continue;
          const rules = c.value.split("--")[0].match(/react-hooks\/[a-z-]+/g) ?? [];
          for (const rule of rules) {
            if (allowed.some((a) => !a.rule || a.rule === rule)) continue;
            context.report({ loc: c.loc, message: `${rule} 검사를 끄지 않는다. 바뀌는 값 때문에 다시 돌면 안 되는 일이면 useEffectEvent로 최신 값을 읽고, 주소·저장소 같은 브라우저 값은 useSyncExternalStore로 읽는다.` });
          }
        }
      },
    };
  },
};

// 지연 0이나 지연 없는 setTimeout은 순서 문제를 숨기는 땜질이다(타이머가 퍼져 앱이 느려진 Cursor 사례)
const timerPatchAllowed = [];
const noTimerPatch = {
  meta: { type: "problem", schema: [] },
  create(context) {
    const file = context.filename.replace(/\\/g, "/");
    if (timerPatchAllowed.some((f) => file.endsWith(f))) return {};
    return {
      CallExpression(node) {
        const callee = node.callee;
        const name = callee.type === "Identifier" ? callee.name : callee.type === "MemberExpression" && callee.property.type === "Identifier" ? callee.property.name : null;
        if (name !== "setTimeout") return;
        const delay = node.arguments[1];
        if (delay && !(delay.type === "Literal" && delay.value === 0)) return;
        context.report({ node, message: "지연 없는 setTimeout으로 순서를 미루지 않는다. 그리기 순서 문제면 상태가 바뀌는 곳을 고치고, 화면이 그려진 뒤가 필요하면 requestAnimationFrame을 쓴다." });
      },
    };
  },
};

// 블록 칸(blk, blk-frame, blk-btn)은 뒤에 먹선 층(::before)이 깔려 있어, 반투명 면을 주면 그 층이 비쳐 칸 전체가 남색이 된다
// (개발자 팩 카드 호버에서 실제로 난 문제). 면은 불투명 토큰으로 준다
const noTranslucentBlock = {
  meta: { type: "problem", schema: [] },
  create(context) {
    const check = (node, text) => {
      if (!/(^|\s)blk(-frame|-btn)?(\s|$)/.test(text)) return;
      const hit = text.match(/(^|\s)((?:[a-z-]+:)*bg-[a-z-]+\/[0-9]+)/);
      if (!hit) return;
      context.report({ node, message: `블록 칸에 반투명 면(${hit[2]})을 쓰지 않는다. 뒤의 먹선 층이 비쳐 칸이 통째로 어두워진다. hover:bg-surface처럼 불투명한 면 토큰을 쓴다.` });
    };
    return {
      Literal(node) { if (typeof node.value === "string") check(node, node.value); },
      TemplateElement(node) { check(node, node.value.raw); },
    };
  },
};

// 핑크 주 버튼 면(bg-cta)은 BlockButton·BlockLink 안에만 둔다. 손으로 만든 주 버튼은 모양이 조금씩 어긋나고, 누를 수 없는 곳에 핑크가 번진다
// 켜짐 상태를 핑크로 보여 주는 누름 칸(보상 착용, 아지트 물건)은 예외
const ctaAllowed = ["src/features/scene/block-ui.tsx", "src/features/rewards/reward-reveal.tsx", "src/features/account/room-view.tsx"];
const ctaInBlockUi = {
  meta: { type: "problem", schema: [] },
  create(context) {
    const file = context.filename.replace(/\\/g, "/");
    if (ctaAllowed.some((f) => file.endsWith(f))) return {};
    const check = (node, text) => {
      if (!/(^|[\s:])bg-cta(\s|$)/.test(text)) return;
      context.report({ node, message: "핑크 주 버튼은 BlockButton primary나 BlockLink primary로 만든다(대화 상자 안 짧은 버튼은 label). bg-cta를 직접 쓰지 않는다." });
    };
    return {
      Literal(node) { if (typeof node.value === "string") check(node, node.value); },
      TemplateElement(node) { check(node, node.value.raw); },
    };
  },
};

const nuanci = { rules: { "cta-in-block-ui": ctaInBlockUi, "grid-base-cols": gridBaseCols, "no-translucent-block": noTranslucentBlock, "no-hooks-escape": noHooksEscape, "no-timer-patch": noTimerPatch } };

const eslintConfig = defineConfig([
  // 다시 쓸 일이 없어진 eslint-disable 주석은 남겨 두지 않는다. 남은 예외는 진짜 예외만이어야 한다
  { linterOptions: { reportUnusedDisableDirectives: "error" } },
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { nuanci },
    rules: {
      "nuanci/no-hooks-escape": "error",
      "nuanci/no-timer-patch": "error",
    },
  },
  // 관리자 코드는 관리자 화면에서만 쓴다. 사용자 화면 번들에 관리자 코드가 섞이지 않게 한다(쿠키 이름만 예외)
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/features/admin/**", "src/app/admin/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ regex: "^@/features/admin/(?!cookie$)", message: "관리자 코드는 src/app/admin과 src/features/admin 안에서만 쓴다. 사용자 화면에 필요한 값이면 공용 위치로 옮긴다." }] }],
    },
  },
  // 디자인 시스템 규칙(docs/design_system.md)을 어기면 검사에서 걸리게 한다. 색·글자 크기·움직임은 globals.css의 토큰 이름으로만 쓴다.
  // 무대·공유 이미지·관리자 화면과 구글 버튼(브랜드 규정)은 그림이거나 따로 관리해서 뺀다
  {
    files: ["src/**/*.tsx"],
    ignores: ["src/features/stage/**", "src/features/share/**", "src/features/admin/**", "src/app/admin/**", "src/features/account/google-button.tsx"],
    rules: {
      "no-restricted-syntax": ["error", ...designRules],
      "nuanci/grid-base-cols": "error",
      "nuanci/no-translucent-block": "error",
      "nuanci/cta-in-block-ui": "error",
      // 글자 없는 버튼·링크는 화면 읽기와 자동 검사에서 이름 없는 칸이 된다. aria-label로 동작을 말한다
      "jsx-a11y/control-has-associated-label": ["error", {
        labelAttributes: ["aria-label", "aria-labelledby", "title"],
        controlComponents: ["BlockButton", "BlockLink", "Link"],
        ignoreElements: ["audio", "canvas", "embed", "input", "textarea", "tr", "video"],
        depth: 5,
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 밖에서 가져온 stageshow 무대 코드는 원본 그대로 둔다
    "src/vendor/**",
  ]),
]);

export default eslintConfig;
