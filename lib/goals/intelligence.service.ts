import { GoalDocument } from "@/types";
import { generateTrajectory, TrajectoryData } from "./trajectory.service";
import {
  getStrengthTimeSeries,
  getWeightTimeSeries,
  getMuscleTimeSeries,
  getConsistencyTimeSeries
} from "./extractors";
import { getLatestGrowthSnapshot } from "@/lib/growth-intelligence/snapshot.service";
import { toCanonicalMuscle, serializeSessionsForRecovery } from "@/lib/serializers/recovery";
import { calculateMuscleRecovery } from "@/lib/performance/recovery";
import WorkoutSession from "@/models/WorkoutSession";
import Exercise from "@/models/exercise.model";
import {
  progressiveOverloadInsights,
  nutritionInsights,
  weeklyVolumeInsights,
  consistencyInsights
} from "@/lib/growth-intelligence/insights-generator";
import { ScoreDetail } from "@/lib/growth-intelligence/types";

export interface GoalReadiness {
  muscle: string;
  recoveryPercent: number;
  hoursRemaining: number;
  status: string;
}

export interface GoalIntelligenceReport {
  trajectory: TrajectoryData | null;
  insight: { text: string; priority: string } | null;
  readiness: GoalReadiness | null;
}

export async function generateGoalIntelligence(goal: GoalDocument): Promise<GoalIntelligenceReport> {
  const userId = goal.userId.toString();
  
  let trajectory: TrajectoryData | null = null;
  let insight: { text: string; priority: string } | null = null;
  let readiness: GoalReadiness | null = null;

  const now = new Date();
  const startDate = goal.startDate ? new Date(goal.startDate) : now;
  const targetDate = goal.targetDate ? new Date(goal.targetDate) : undefined;
  
  // 1. Fetch Trajectory Data
  let points: { date: Date; value: number }[] = [];

  if (goal.type === "strength" && goal.exerciseId) {
    points = await getStrengthTimeSeries(userId, goal.exerciseId);
  } else if (goal.type === "weight" || goal.type === "bodyFat") {
    points = await getWeightTimeSeries(userId);
  } else if (goal.type === "muscle_growth" && goal.muscle) {
    points = await getMuscleTimeSeries(userId, goal.muscle);
  } else if (goal.type === "consistency") {
    points = await getConsistencyTimeSeries(userId, startDate, targetDate);
  }

  if (points.length >= 2 && goal.initialValue !== undefined) {
    trajectory = generateTrajectory(
      goal.initialValue,
      goal.currentValue,
      goal.targetValue,
      startDate,
      points,
      targetDate
    );
  }

  // 2. Fetch Growth Insights (Only one most relevant)
  const snapshot = await getLatestGrowthSnapshot(userId);
  if (snapshot) {
    let generatedInsights: { text: string; priority: string }[] = [];
    if (goal.type === "strength") {
      generatedInsights = progressiveOverloadInsights(snapshot.progressiveOverloadScore as unknown as ScoreDetail);
    } else if (goal.type === "weight" || goal.type === "bodyFat") {
      generatedInsights = nutritionInsights(snapshot.nutritionScore as unknown as ScoreDetail);
    } else if (goal.type === "muscle_growth") {
      generatedInsights = weeklyVolumeInsights(snapshot.weeklyVolumeScore as unknown as ScoreDetail);
    } else if (goal.type === "consistency" || goal.type === "habit") {
      generatedInsights = consistencyInsights(snapshot.consistencyScore as unknown as ScoreDetail);
    }
    
    // Pick the most relevant insight
    if (generatedInsights.length > 0) {
      insight = generatedInsights[0];
    }
  }

  // 3. Fetch Readiness Context
  if (goal.type === "strength" && goal.exerciseId) {
    const exercise = await Exercise.findById(goal.exerciseId).lean();
    if (exercise && exercise.primaryMuscle) {
      const canonicalMuscle = toCanonicalMuscle(exercise.primaryMuscle);
      
      const leanSessions = await WorkoutSession.find({ userId, status: "completed" })
        .populate("exercises.exerciseId")
        .lean();
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const completedWorkouts = serializeSessionsForRecovery(leanSessions as any);
      const muscleRecovery = calculateMuscleRecovery(canonicalMuscle, completedWorkouts, now);
      
      readiness = {
        muscle: canonicalMuscle,
        recoveryPercent: muscleRecovery.recovery,
        hoursRemaining: muscleRecovery.hoursRemaining,
        status: muscleRecovery.status,
      };
    }
  } else if (goal.type === "muscle_growth" && goal.muscle) {
    const canonicalMuscle = toCanonicalMuscle(goal.muscle);
    const leanSessions = await WorkoutSession.find({ userId, status: "completed" })
      .populate("exercises.exerciseId")
      .lean();
      
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completedWorkouts = serializeSessionsForRecovery(leanSessions as any);
    const muscleRecovery = calculateMuscleRecovery(canonicalMuscle, completedWorkouts, now);
    
    readiness = {
      muscle: canonicalMuscle,
      recoveryPercent: muscleRecovery.recovery,
      hoursRemaining: muscleRecovery.hoursRemaining,
      status: muscleRecovery.status,
    };
  }

  return { trajectory, insight, readiness };
}
