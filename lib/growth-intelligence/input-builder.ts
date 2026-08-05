import User from '@/models/User';
import WorkoutSession from '@/models/WorkoutSession';
import WeightLog from '@/models/weight-log.model';
import { serializeWorkoutSession } from '@/lib/serializers/workoutSession';
import type { PopulatedLeanWorkoutSession } from '@/lib/serializers/workoutSession';
import type { GrowthAnalysisInput } from './types';
import type { WeightLogDocument } from '@/types';

export async function buildGrowthAnalysisInput(
  userId: string,
  lookbackWeeks: number = 8
): Promise<GrowthAnalysisInput> {
  const userDoc = await User.findById(userId).lean();
  if (!userDoc) {
    throw new Error('User not found');
  }

  const windowEnd = new Date();
  const windowStart = new Date(
    windowEnd.getTime() - lookbackWeeks * 7 * 24 * 60 * 60 * 1000,
  );

  const rawSessions = await WorkoutSession.find({ userId })
    .populate({
      path: 'exercises.exerciseId',
      model: 'Exercise',
      select: 'name equipment primaryMuscle',
    })
    .sort({ startedAt: 1 })
    .lean();

  const sessions = (rawSessions as unknown as PopulatedLeanWorkoutSession[]).map(
    serializeWorkoutSession,
  );

  const weightLogDocs = await WeightLog.find({ userId })
    .sort({ date: 1 })
    .lean() as WeightLogDocument[];

  const weightLog = weightLogDocs.map((w) => ({
    date: new Date(w.date),
    weightKg: w.weightKg,
  }));

  const input: GrowthAnalysisInput = {
    plannedWorkoutDaysPerWeek: userDoc.workoutDaysPerWeek ?? 3,
    experienceLevel: userDoc.experienceLevel ?? 'intermediate',
    activityLevel: userDoc.activityLevel ?? 'moderate',
    bodyweightKg: userDoc.weightKg ?? null,
    fitnessGoal: (userDoc.fitnessGoal as GrowthAnalysisInput['fitnessGoal']) ?? null,
    sessions,
    windowStart,
    windowEnd,
    weightLog: weightLog.length > 0 ? weightLog : undefined,
    averageDailyProteinGrams: undefined,
    averageDailyCaloriesKcal: undefined,
  };

  return input;
}
