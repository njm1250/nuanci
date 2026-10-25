export type UserKind = "accounts" | "browsers";
export type OperatorUser = {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string | null;
  lastAt: string | null;
  events: number;
  attempts: number;
  completedScenes: number;
  activityDays: number;
  browsers: number;
  internal: boolean;
  source: string | null;
  guestEvents: number;
  memberEvents: number;
  unknownEvents: number;
};
export type UserDirectory = {
  rows: OperatorUser[];
  total: number;
  active7: number;
  noCompletion: number;
  returning: number;
  page: number;
  pageSize: number;
};
export type UserEvent = {
  id: number;
  type: string;
  createdAt: string;
  sceneId: string | null;
  sceneTitle: string | null;
  sceneVersion: number | null;
  attemptId: string | null;
  visitorId: string;
  userId: string | null;
  accountName: string | null;
  authState: string;
  step: string | null;
  choiceId: string | null;
  entry: string | null;
  line: string | null;
  verdict: string | null;
  reaction: string | null;
  internal: boolean;
};
export type UserDetail = {
  user: OperatorUser;
  events: UserEvent[];
  nextCursor: number | null;
  attempts: {
    id: string;
    sceneId: string;
    title: string | null;
    startedAt: string;
    lastAt: string;
    completed: boolean;
    choices: number;
    wrapped: boolean;
  }[];
  connections: {
    id: string;
    name: string | null;
    email: string | null;
    firstAt: string | null;
    lastAt: string | null;
    events: number;
    latestLink: boolean;
    source: string | null;
    medium: string | null;
    campaign: string | null;
    internal: boolean;
  }[];
  savedScenes: { sceneId: string; title: string | null; savedAt: string }[];
  rewards: {
    id: string;
    name: string | null;
    reason: string;
    source: string;
    sceneId: string | null;
    seen: boolean;
    grantedAt: string;
  }[];
  activityDays: string[];
  source: {
    source: string | null;
    medium: string | null;
    campaign: string | null;
    referrer: string | null;
  } | null;
};
export const EVENT_LABELS: Record<string, string> = {
  home_viewed: "홈 방문",
  scene_viewed: "장면 시작",
  choice_selected: "답변 선택",
  alternative_viewed: "다른 표현 탐색",
  scene_completed: "답변 완료",
  wrap_viewed: "정리 화면",
  next_clicked: "다음 장면 클릭",
  share_link_copied: "장면 링크 복사",
  reward_shown: "보상 확인",
  reward_equipped: "보상 장착",
  test_viewed: "유형 테스트 소개",
  test_started: "유형 테스트 시작",
  test_answered: "테스트 답변",
  test_completed: "유형 테스트 완료",
  test_shared: "테스트 공유",
  test_result_viewed: "테스트 결과 열람",
};
export const userHref = (kind: UserKind, id: string) =>
  `/admin/users/${kind}/${encodeURIComponent(id)}`;
