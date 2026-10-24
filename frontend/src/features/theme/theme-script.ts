// 서버 레이아웃에서도 쓰는 값이라 "use client" 파일과 따로 둔다
export const THEME_KEY = "nuanci.theme";
export const THEME_COLORS = { dark: "#0f0e12", light: "#e4dfd3" } as const;

// 첫 화면을 그리기 전에 실행해서, 밝은 화면을 고른 사람에게 어두운 화면이 번쩍이지 않게 한다.
// 주소창 색(theme-color)은 메타 태그가 다 들어온 뒤에 바꾼다
export const THEME_SCRIPT = `try{if(localStorage.getItem("${THEME_KEY}")==="light"){document.documentElement.setAttribute("data-theme","light");document.addEventListener("DOMContentLoaded",function(){var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","${THEME_COLORS.light}")})}}catch(e){}`;
