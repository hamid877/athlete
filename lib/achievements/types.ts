export type AchievementTier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum";

export interface Achievement {
  id: string;
  title: string;
  description: string;

  icon: string;
  category: 'milestones' | 'consistency' | 'volume' | 'dedication';
  tier: AchievementTier;

  target: number;
  unit: string;
}

export interface UnlockedAchievement extends Achievement {
  unlockedAt: Date;
}

export interface LockedAchievement extends Achievement {
  currentValue: number;
  progressPercentage: number;
}

export interface AchievementMetrics {
  workouts: number;
  days: number;
  kg: number;
  minutes: number;
}

export interface AchievementsResponse {
  unlocked: UnlockedAchievement[];
  locked: LockedAchievement[];
  metrics: AchievementMetrics;
}