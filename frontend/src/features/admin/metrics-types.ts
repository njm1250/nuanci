export type ChoiceCount = {
  step: "base" | "followUp";
  choiceId: string;
  picks: number;
};
export type SceneMetrics = {
  id: string;
  number: number;
  title: string;
  version: number;
  viewed: number;
  baseChosen: number;
  followUpChosen: number;
  completed: number;
  wrapViewed: number;
  nextClicked: number;
  alternativesViewed: number;
  shared: number;
  fromNext: number;
  choices: ChoiceCount[];
};
export type Funnel = {
  home: number;
  started: number;
  firstPick: number;
  answered: number;
  wrapped: number;
  next: number;
};
export type TestMetrics = {
  viewed: number;
  started: number;
  completed: number;
  shared: number;
  friendViewed: number;
  fromFriend: number;
  types: Record<string, number>;
};
export type SourceMetrics = {
  channel: string | null;
  visitors: number;
  sceneStarted: number;
  sceneCompleted: number;
  testStarted: number;
  testCompleted: number;
  shared: number;
};
export type Metrics = {
  period?: string;
  daily?: DailyMetrics[];
  sources?: SourceMetrics[];
  funnel: Funnel;
  visitors: number;
  attempts: number;
  events: number;
  internalVisitors: number;
  internalEvents: number;
  aiVisitors: number;
  scenes: SceneMetrics[];
  activeAccounts: number;
  registeredAccounts: number;
  unknownEvents: number;
  test?: TestMetrics;
};
export type DailyMetrics = {
  day: string;
  visitors: number;
  newVisitors: number;
  accounts: number;
  completed: number;
};
export type Inquiry = {
  id: number;
  kind: "error" | "question" | "scene" | "idea";
  message: string;
  contact: string | null;
  page: string | null;
  email: string | null;
  userAgent: string | null;
  done: boolean;
  createdAt: string;
};
export type ClientError = {
  id: number;
  message: string;
  stack: string | null;
  url: string | null;
  userAgent: string | null;
  createdAt: string;
};
