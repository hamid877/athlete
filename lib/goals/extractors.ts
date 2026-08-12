import { Types } from "mongoose";
import WeightLog from "@/models/weight-log.model";
import WorkoutSession from "@/models/WorkoutSession";
import { MuscleGrowthDetail } from "../growth-intelligence/types";

/**
 * Extracts a time-series of bodyweight logs.
 */
export async function getWeightTimeSeries(
  userId: string | Types.ObjectId,
  startDate?: Date,
  endDate?: Date
): Promise<{ date: Date; value: number }[]> {
  const query: Record<string, unknown> = { userId };
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) dateFilter.$lte = endDate;
    query.date = dateFilter;
  }

  const logs = await WeightLog.find(query).sort({ date: 1 }).lean();
  
  return logs.map(log => ({
    date: log.date,
    value: log.weightKg
  }));
}

/**
 * Extracts a time-series of the maximum weight lifted for a specific exercise per session.
 * Reuses the same set filtering semantics as performance records.
 */
export async function getStrengthTimeSeries(
  userId: string | Types.ObjectId,
  exerciseId: string | Types.ObjectId,
  startDate?: Date,
  endDate?: Date
): Promise<{ date: Date; value: number }[]> {
  const query: Record<string, unknown> = { 
    userId, 
    status: "completed",
    "exercises.exerciseId": exerciseId 
  };
  
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) dateFilter.$lte = endDate;
    query.startedAt = dateFilter;
  }

  const sessions = await WorkoutSession.find(query)
    .sort({ startedAt: 1 })
    .lean();

  const points: { date: Date; value: number }[] = [];

  for (const session of sessions) {
    const sessionDate = session.finishedAt || session.startedAt;
    let maxWeightForSession = 0;

    for (const exercise of session.exercises) {
      if (exercise.exerciseId?.toString() === exerciseId.toString()) {
        for (const set of exercise.performedSets) {
          if (!set.completed) continue;
          if (set.weight > maxWeightForSession) {
            maxWeightForSession = set.weight;
          }
        }
      }
    }

    if (maxWeightForSession > 0) {
      points.push({
        date: sessionDate,
        value: maxWeightForSession
      });
    }
  }

  return points;
}

/**
 * Extracts a time-series of muscle growth potential scores from Growth Intelligence snapshots.
 */
export async function getMuscleTimeSeries(
  userId: string | Types.ObjectId,
  muscle: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ date: Date; value: number }[]> {
  
  // If startDate/endDate is provided, we'd need a new function in snapshot.service
  // For now, we'll fetch all or use getGrowthSnapshotsBetween if it exists.
  // Actually, getGrowthSnapshotsBetween doesn't exist by default, let's just query the model directly.
  
  // To avoid circular or missing dependencies if snapshot.service doesn't have it,
  // we can just import the model directly.
  const { default: GrowthAnalysisSnapshot } = await import("@/models/GrowthAnalysisSnapshot");

  const query: Record<string, unknown> = { userId };
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) dateFilter.$lte = endDate;
    query.analyzedAt = dateFilter;
  }

  const snapshots = await GrowthAnalysisSnapshot.find(query)
    .sort({ analyzedAt: 1 })
    .lean();

  const points: { date: Date; value: number }[] = [];

  for (const snapshot of snapshots) {
    if (snapshot.muscleDetails) {
      const details = snapshot.muscleDetails as MuscleGrowthDetail[];
      const muscleData = details.find(m => m.muscle === muscle);
      
      if (muscleData && muscleData.growthPotentialScore !== undefined) {
        points.push({
          date: snapshot.analyzedAt,
          value: muscleData.growthPotentialScore
        });
      }
    }
  }

  return points;
}

/**
 * Extracts a time-series of cumulative consistency (workouts completed over time).
 */
export async function getConsistencyTimeSeries(
  userId: string | Types.ObjectId,
  startDate: Date,
  endDate?: Date
): Promise<{ date: Date; value: number }[]> {
  const dateFilter: Record<string, Date> = { $gte: startDate };
  if (endDate) {
    dateFilter.$lte = endDate;
  }
  
  const query: Record<string, unknown> = { 
    userId, 
    status: "completed",
    startedAt: dateFilter
  };

  const sessions = await WorkoutSession.find(query)
    .sort({ startedAt: 1 })
    .lean();

  let cumulative = 0;
  return sessions.map(session => {
    cumulative++;
    return {
      date: session.finishedAt || session.startedAt,
      value: cumulative
    };
  });
}
