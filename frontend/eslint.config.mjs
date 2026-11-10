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

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 디자인 시스템 규칙(docs/design_system.md)을 어기면 검사에서 걸리게 한다. 색·글자 크기·움직임은 globals.css의 토큰 이름으로만 쓴다.
  // 무대·공유 이미지·관리자 화면과 구글 버튼(브랜드 규정)은 그림이거나 따로 관리해서 뺀다
  {
    files: ["src/**/*.tsx"],
    ignores: ["src/features/stage/**", "src/features/share/**", "src/features/admin/**", "src/app/admin/**", "src/features/account/google-button.tsx"],
    rules: {
      "no-restricted-syntax": ["error", ...designRules],
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
