import { WorkoutSessionDTO } from "../serializers/workoutSession";
import { calculateSetVolume } from "./volume";

export type RecordType =
  | "heaviest_weight"
  | "highest_reps"
  | "highest_1rm"
  | "highest_volume";

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  type: RecordType;
  value: string;
  numericValue: number;
  achievedAt: Date;
  sessionId: string;
}

/**
 * Calculates Epley 1RM.
 */
export function calculateEpley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Calculates all personal records from a user's workout history.
 * Groups by exerciseId and returns the highest values across all time.
 */
export function calculatePersonalRecords(
  sessions: WorkoutSessionDTO[]
): PersonalRecord[] {
  const prs: PersonalRecord[] = [];

  // Group by exercise
  const exerciseStats: Record<
    string,
    {
      name: string;
      maxWeight: { weight: number; achievedAt: Date; sessionId: string; reps: number };
      max1RM: { e1rm: number; weight: number; reps: number; achievedAt: Date; sessionId: string };
      maxVolume: { volume: number; achievedAt: Date; sessionId: string };
      // weight -> { maxReps, achievedAt, sessionId }
      repPRs: Record<number, { reps: number; achievedAt: Date; sessionId: string }>;
    }
  > = {};

  // Sort sessions chronologically (oldest to newest) to naturally track the *first* time a PR was hit, 
  // or we can track the *last* time it was hit. Usually, PRs are recorded the first time they are achieved.
  const sortedSessions = [...sessions].sort(
    (a, b) =>
      new Date(a.finishedAt || a.startedAt).getTime() -
      new Date(b.finishedAt || b.startedAt).getTime()
  );

  for (const session of sortedSessions) {
    const sessionDate = new Date(session.finishedAt || session.startedAt);

    for (const sessionExercise of session.exercises) {
      if (!sessionExercise.exerciseId) continue;
      const exId = sessionExercise.exerciseId._id;
      const exName = sessionExercise.exerciseId.name;

      if (!exerciseStats[exId]) {
        exerciseStats[exId] = {
          name: exName,
          maxWeight: { weight: 0, achievedAt: sessionDate, sessionId: session._id, reps: 0 },
          max1RM: { e1rm: 0, weight: 0, reps: 0, achievedAt: sessionDate, sessionId: session._id },
          maxVolume: { volume: 0, achievedAt: sessionDate, sessionId: session._id },
          repPRs: {},
        };
      }

      const stats = exerciseStats[exId];
      let sessionVolume = 0;

      for (const set of sessionExercise.performedSets) {
        if (!set.completed) continue;

        const weight = set.weight;
        const reps = set.reps;

        // Session Volume
        sessionVolume += calculateSetVolume(weight, reps, sessionExercise.exerciseId?.weightInputType);

        // Heaviest Weight
        if (weight > stats.maxWeight.weight) {
          stats.maxWeight = { weight, reps, achievedAt: sessionDate, sessionId: session._id };
        }

        // Highest 1RM
        const e1rm = calculateEpley1RM(weight, reps);
        if (e1rm > stats.max1RM.e1rm) {
          stats.max1RM = { e1rm, weight, reps, achievedAt: sessionDate, sessionId: session._id };
        }

        // Highest Reps at Same Weight
        if (!stats.repPRs[weight]) {
          stats.repPRs[weight] = { reps, achievedAt: sessionDate, sessionId: session._id };
        } else if (reps > stats.repPRs[weight].reps) {
          stats.repPRs[weight] = { reps, achievedAt: sessionDate, sessionId: session._id };
        }
      }

      if (sessionVolume > stats.maxVolume.volume) {
        stats.maxVolume = { volume: sessionVolume, achievedAt: sessionDate, sessionId: session._id };
      }
    }
  }

  // Convert to array of PersonalRecord
  for (const [exerciseId, stats] of Object.entries(exerciseStats)) {
    if (stats.maxWeight.weight > 0) {
      prs.push({
        exerciseId,
        exerciseName: stats.name,
        type: "heaviest_weight",
        value: `${stats.maxWeight.weight} kg`,
        numericValue: stats.maxWeight.weight,
        achievedAt: stats.maxWeight.achievedAt,
        sessionId: stats.maxWeight.sessionId,
      });
    }

    if (stats.max1RM.e1rm > 0) {
      prs.push({
        exerciseId,
        exerciseName: stats.name,
        type: "highest_1rm",
        value: `${Math.round(stats.max1RM.e1rm)} kg (${stats.max1RM.weight}kg × ${stats.max1RM.reps})`,
        numericValue: stats.max1RM.e1rm,
        achievedAt: stats.max1RM.achievedAt,
        sessionId: stats.max1RM.sessionId,
      });
    }

    if (stats.maxVolume.volume > 0) {
      prs.push({
        exerciseId,
        exerciseName: stats.name,
        type: "highest_volume",
        value: `${stats.maxVolume.volume} kg`,
        numericValue: stats.maxVolume.volume,
        achievedAt: stats.maxVolume.achievedAt,
        sessionId: stats.maxVolume.sessionId,
      });
    }

    for (const [weightStr, repPR] of Object.entries(stats.repPRs)) {
      const weight = parseFloat(weightStr);
      // Let's only include if they did > 0 reps
      if (repPR.reps > 0) {
        prs.push({
          exerciseId,
          exerciseName: stats.name,
          type: "highest_reps",
          value: `${repPR.reps} reps @ ${weight} kg`,
          numericValue: repPR.reps,
          achievedAt: repPR.achievedAt,
          sessionId: repPR.sessionId,
        });
      }
    }
  }

  return prs;
}
