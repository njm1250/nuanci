// 서버 레이아웃에서도 쓰는 값이라 "use client" 파일과 따로 둔다
export const THEME_KEY = "nuanci.theme";
export const THEME_COLORS = { dark: "#0f0e12", light: "#e7e9e3" } as const;

// 기본은 종이색 밝은 화면이다. 색 값은 어두운 화면이 바탕이고 html의 data-theme="light"가 밝게 덮는다.
// 첫 화면을 그리기 전에 실행해서, 밤 화면을 고르지 않은 사람에게는 밝은 화면을 먼저 붙인다.
// 주소창 색(theme-color)은 메타 태그가 다 들어온 뒤에 바꾼다
export const THEME_SCRIPT = `var t;try{t=localStorage.getItem("${THEME_KEY}")}catch(e){}if(t==="dark"){document.addEventListener("DOMContentLoaded",function(){var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","${THEME_COLORS.dark}")})}else{document.documentElement.setAttribute("data-theme","light")}`;
