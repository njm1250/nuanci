// 지금은 "고른다 → 반응을 본다" 한 고리만 남기고, 쓰는 사람이 거의 없던 기능은 입구를 닫아 둔다.
// 코드는 그대로 두고 여기서만 켜고 끈다. true로 바꾸면 메뉴·홈·완료 화면의 입구가 다시 열린다
export const FEATURES = {
  review: false,
  login: false,
  rewards: false,
  typetest: false,
  streak: false,
} as const;

// 입구를 닫은 기능의 주소로 들어오면 홈으로 보낸다(proxy.ts)
export const CLOSED_PATHS: string[] = [...(FEATURES.typetest ? [] : ["/test"]), ...(FEATURES.rewards ? [] : ["/me/room"])];
