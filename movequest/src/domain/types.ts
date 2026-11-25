import type { LifeState } from "../life/model";
export const scenes = ["campus", "office", "home", "outdoors"] as const;
export type Scene = (typeof scenes)[number];
export type Locale = "zh-CN" | "zh-TW" | "en";
export type Profile = {
  name: string;
  role: "student" | "worker";
  scenes: Scene[];
  minutes: number;
  reminder: number;
  locale: Locale;
};
export type Quest = {
  id: string;
  scene: Scene;
  title: string;
  context: string;
  description: string;
  seconds: number;
  steps: string[];
  seated: string;
  lessonId: string;
  kind: "timer" | "steps";
};
export type Session = {
  guided?: {
    locationId?: string;
    cueId?: string;
    habitId?: string;
    alternative?: boolean;
  };
  intensity?: "light" | "moderate" | "vigorous";
  id: string;
  questId: string;
  scene: Scene;
  title: string;
  targetMs: number;
  countdownUntil?: number;
  elapsedMs: number;
  steps: number;
  stepCount: number;
  kind: "timer" | "steps";
  status: "running" | "paused" | "ready" | "completed" | "skipped";
  owner: string;
  lastTick: number;
  demo: boolean;
  seated: boolean;
  createdAt: string;
  completedAt?: string;
  day?: string;
  xp: number;
  own: boolean;
};
export type Reward = { key: string; xp: number; demo: boolean; day: string };
export type Learning = {
  lessonId: string;
  answer: number;
  correct: boolean;
  demo: boolean;
  at: string;
};
export type OwnMove = {
  id: string;
  title: string;
  context: string;
  scene: Scene;
  seconds: number;
  demo: boolean;
  createdAt: string;
};
export type Campaign = {
  id: string;
  name: string;
  audience: "campus" | "office";
  goal: number;
  status: "draft" | "active";
  createdAt: string;
};
export type State = {
  schemaVersion: 1;
  life?: LifeState;
  demoLife?: LifeState;
  demoProfile?: Profile;
  profile: Profile | null;
  demo: boolean;
  sessions: Session[];
  rewards: Reward[];
  learning: Learning[];
  ownMoves: OwnMove[];
  campaigns: Campaign[];
};
export type Lesson = {
  id: string;
  title: string;
  body: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  source: string;
  url: string;
  scope: string;
};
export const emptyState = (): State => ({
  schemaVersion: 1,
  profile: null,
  demo: false,
  sessions: [],
  rewards: [],
  learning: [],
  ownMoves: [],
  campaigns: [],
});
