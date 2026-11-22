// 지금은 "고른다 → 반응을 본다" 한 고리만 남기고, 쓰는 사람이 거의 없던 기능은 입구를 닫아 둔다.
// 코드는 그대로 두고 여기서만 켜고 끈다. true로 바꾸면 메뉴·홈·완료 화면의 입구가 다시 열린다
export const FEATURES = {
  review: false,
  login: true,
  rewards: true,
  typetest: false,
  streak: true,
  // 장면 셋을 한 판으로 묶고 끝에 결과 장을 보여 준다(scene/run.ts)
  run: true,
  // 장면을 "N화"로 부르고 10화씩 묶어 잠그던 예전 탐색(화 번호·10화 묶음·잠금·말판·열림 말풍선·순서대로/상황별 전환·개발자 팩 배너).
  // 끄면 홈과 전체 장면이 "다음 장면 하나 + 모음"(scene/collections.ts)으로 바뀐다. 기록(nuanci.cleared)은 둘이 같이 쓴다
  episodes: false,
} as const;

// 입구를 닫은 기능의 주소로 들어오면 홈으로 보낸다(proxy.ts)
export const CLOSED_PATHS: string[] = [...(FEATURES.typetest ? [] : ["/test"]), ...(FEATURES.rewards ? [] : ["/me/room"])];
