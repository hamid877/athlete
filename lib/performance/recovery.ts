/**
 * @file recovery.ts
 * @description Recovery Engine — Sprint 7.1 (Phase A)
 *
 * Pure business logic for calculating per-muscle recovery percentages
 * from completed workout sessions.
 *
 * This module is:
 *  - Framework-free (no React, no Next.js)
 *  - Database-free (no Mongoose, no queries)
 *  - Side-effect-free (deterministic, unit-test friendly)
 *
 * Input  : CompletedWorkout[]  (plain TypeScript DTOs)
 * Output : RecoveryResult      (muscles[] + workout recommendation)
 */

import {
  DEFAULT_RECOVERY_TIMES_HOURS,
  FATIGUE_FLOOR,
  FATIGUE_NORMALIZATION_CAP,
  RECOVERY_WINDOWS_HOURS,
} from './constants';
import type {
  CompletedExercise,
  CompletedWorkout,
  RecoveryMuscle,
  RecoveryResult,
  RecoveryStatus,
  WorkoutRecommendation,
} from './types';

// ---------------------------------------------------------------------------
// Legacy API — preserved for backward compatibility with metrics.ts
// ---------------------------------------------------------------------------

/**
 * @deprecated Use `calculateMuscleRecovery()` or `calculateAllRecovery()` for
 * the full recovery engine. This function remains available for the workout
 * summary stimulus-based recovery estimate.
 *
 * Returns the recommended recovery window in hours based on a stimulus score.
 */
export function calculateRecovery(stimulusScore: number): number {
  if (stimulusScore <= 0) return 0;
  if (stimulusScore < 4) return RECOVERY_WINDOWS_HOURS.low;
  if (stimulusScore < 10) return RECOVERY_WINDOWS_HOURS.moderate;
  if (stimulusScore < 18) return RECOVERY_WINDOWS_HOURS.high;
  return RECOVERY_WINDOWS_HOURS.extreme;
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a Date or ISO string to a plain Date object.
 */
function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Calculates the elapsed hours between `then` and `now`.
 */
function hoursSince(then: Date | string, now: Date): number {
  const ms = now.getTime() - toDate(then).getTime();
  return Math.max(0, ms / (1_000 * 60 * 60));
}

/**
 * Computes the raw fatigue score for a single exercise.
 *
 * Formula: completedSets × averageWeight × averageReps
 *
 * Only sets with `completed === true` are counted, so incomplete
 * or skipped sets do not inflate the score.
 *
 * @returns A non-negative raw fatigue number.
 */
function computeExerciseFatigue(exercise: CompletedExercise): number {
  const doneSets = exercise.performedSets.filter((s) => s.completed);
  if (doneSets.length === 0) return 0;

  const avgWeight =
    doneSets.reduce((sum, s) => sum + s.weight, 0) / doneSets.length;
  const avgReps =
    doneSets.reduce((sum, s) => sum + s.reps, 0) / doneSets.length;

  return doneSets.length * avgWeight * avgReps;
}

/**
 * Normalizes a raw fatigue score to a [0, 1] ratio.
 *
 * Uses FATIGUE_NORMALIZATION_CAP as the ceiling — any raw fatigue at
 * or above the cap maps to 1.0 (fully fatigued / 0% initial recovery).
 * Sub-threshold fatigue scales linearly between 0 and 1.
 *
 * @returns A value in [0, 1].
 */
function normalizeFatigue(raw: number): number {
  if (raw < FATIGUE_FLOOR) return 0;
  return Math.min(1, raw / FATIGUE_NORMALIZATION_CAP);
}

// ---------------------------------------------------------------------------
// Core Recovery Calculation
// ---------------------------------------------------------------------------

/**
 * Calculates the recovery percentage for a single muscle at a given moment.
 *
 * Algorithm:
 *  1. Scan all completed workouts for exercises that target this muscle.
 *  2. Find the most recently completed workout containing that muscle.
 *  3. Sum fatigue across all exercises in that session that target the muscle.
 *  4. Normalize fatigue → [0, 1] (how heavily the muscle was hit).
 *  5. Recovery window = defaultRecoveryHours.
 *     (Future: multiply window by fatigue ratio to extend it proportionally.)
 *  6. recoveryPct = (hoursSinceWorkout / recoveryWindow) * 100, clamped [0, 100].
 *
 * @param muscle   - Canonical muscle name, e.g. "Chest".
 * @param workouts - All completed workouts to analyse.
 * @param now      - Reference point in time (injectable for testability).
 * @returns A RecoveryMuscle object with recovery %, status, and hours remaining.
 */
export function calculateMuscleRecovery(
  muscle: string,
  workouts: CompletedWorkout[],
  now: Date = new Date(),
): RecoveryMuscle {
  const recoveryWindowHours =
    DEFAULT_RECOVERY_TIMES_HOURS[muscle] ?? 48; // Fallback: 48h for unknowns

  // Find workouts that contain exercises targeting this muscle,
  // sorted newest first so we can easily grab the most recent one.
  const relevantWorkouts = workouts
    .filter((w) =>
      w.exercises.some((ex) =>
        ex.targetMuscles.some((m) => m.toLowerCase() === muscle.toLowerCase()),
      ),
    )
    .sort(
      (a, b) =>
        toDate(b.completedAt).getTime() - toDate(a.completedAt).getTime(),
    );

  // If muscle has never been trained, it is fully recovered.
  if (relevantWorkouts.length === 0) {
    return {
      muscle,
      recovery: 100,
      status: 'Recovered',
      hoursRemaining: 0,
    };
  }

  const lastWorkout = relevantWorkouts[0];
  const elapsed = hoursSince(lastWorkout.completedAt, now);

  // Aggregate fatigue across every exercise in the latest session
  // that targets this muscle.
  const totalRawFatigue = lastWorkout.exercises
    .filter((ex) =>
      ex.targetMuscles.some((m) => m.toLowerCase() === muscle.toLowerCase()),
    )
    .reduce((sum, ex) => sum + computeExerciseFatigue(ex), 0);

  // NOTE: normalizedFatigue is computed for Phase B (fatigue-scaled windows).
  // It is intentionally unused in the linear model. Void-called to silence lint.
  void normalizeFatigue(totalRawFatigue);

  // Linear recovery: recoveryPct grows from 0% to 100% over the window.
  const rawPct = (elapsed / recoveryWindowHours) * 100;
  const recovery = Math.min(100, Math.max(0, Math.round(rawPct)));
  const status: RecoveryStatus = recovery >= 100 ? 'Recovered' : 'Recovering';
  const hoursRemaining =
    recovery >= 100
      ? 0
      : Math.ceil(recoveryWindowHours - elapsed);

  return { muscle, recovery, status, hoursRemaining };
}

/**
 * Returns the recovery percentage (0–100) for a single muscle
 * as a convenience wrapper around `calculateMuscleRecovery`.
 *
 * @param muscle   - Canonical muscle name.
 * @param workouts - Completed workouts to analyse.
 * @param now      - Reference point in time (defaults to current time).
 * @returns Integer in [0, 100].
 */
export function getRecoveryPercentage(
  muscle: string,
  workouts: CompletedWorkout[],
  now: Date = new Date(),
): number {
  return calculateMuscleRecovery(muscle, workouts, now).recovery;
}

/**
 * Calculates recovery for every known muscle group and returns a
 * complete RecoveryResult, including a smart workout recommendation.
 *
 * Muscles with no training history are returned as 100% recovered
 * so they do not block the recommendation engine.
 *
 * @param workouts - Completed workout sessions.
 * @param now      - Reference point in time (defaults to current time).
 * @returns RecoveryResult containing all muscles + a recommendation.
 */
export function calculateAllRecovery(
  workouts: CompletedWorkout[],
  now: Date = new Date(),
): RecoveryResult {
  const muscleNames = Object.keys(DEFAULT_RECOVERY_TIMES_HOURS);

  const muscles: RecoveryMuscle[] = muscleNames.map((name) =>
    calculateMuscleRecovery(name, workouts, now),
  );

  const recommendation = getRecommendedWorkout(muscles);

  return { muscles, recommendation };
}

// ---------------------------------------------------------------------------
// Convenience Filters
// ---------------------------------------------------------------------------

/**
 * Returns all muscle groups that are fully recovered (>= 100%).
 *
 * @param muscles - Output from `calculateAllRecovery().muscles`.
 * @returns Array of RecoveryMuscle with status === 'Recovered'.
 */
export function getRecoveredMuscles(muscles: RecoveryMuscle[]): RecoveryMuscle[] {
  return muscles.filter((m) => m.status === 'Recovered');
}

/**
 * Returns all muscle groups that are still recovering (< 100%).
 *
 * @param muscles - Output from `calculateAllRecovery().muscles`.
 * @returns Array of RecoveryMuscle with status === 'Recovering'.
 */
export function getRecoveringMuscles(muscles: RecoveryMuscle[]): RecoveryMuscle[] {
  return muscles.filter((m) => m.status === 'Recovering');
}

// ---------------------------------------------------------------------------
// Recommendation Engine
// ---------------------------------------------------------------------------

/** Threshold — a muscle must be at or above this % to count as "recovered". */
const RECOVERY_THRESHOLD = 80;

/**
 * Helper: returns true if ALL listed muscles meet the recovery threshold.
 */
function allRecovered(muscles: RecoveryMuscle[], names: string[]): boolean {
  return names.every((name) => {
    const found = muscles.find(
      (m) => m.muscle.toLowerCase() === name.toLowerCase(),
    );
    return found !== undefined && found.recovery >= RECOVERY_THRESHOLD;
  });
}

/**
 * Recommends a training split based on the current recovery state of
 * all muscle groups.
 *
 * Decision logic (priority order):
 *  1. Full Body  — If every muscle group is ≥ threshold.
 *  2. Legs       — If Quads + Hamstrings + Glutes are ≥ threshold.
 *  3. Push       — If Chest + Triceps + Front Delts are ≥ threshold.
 *  4. Pull       — If Back + Lats + Biceps are ≥ threshold.
 *  5. Upper Body — If Push OR Pull muscles are ≥ threshold but not Legs.
 *  6. Rest       — If no meaningful split is available.
 *
 * @param muscles - Full list of RecoveryMuscle objects.
 * @returns A WorkoutRecommendation with a split name and reasoning.
 */
export function getRecommendedWorkout(
  muscles: RecoveryMuscle[],
): WorkoutRecommendation {
  const PUSH_MUSCLES  = ['Chest', 'Triceps', 'Front Delts', 'Side Delts'];
  const PULL_MUSCLES  = ['Back', 'Lats', 'Biceps', 'Rear Delts'];
  const LEG_MUSCLES   = ['Quads', 'Hamstrings', 'Glutes'];
  const ALL_MUSCLES   = Object.keys(DEFAULT_RECOVERY_TIMES_HOURS);

  const pushReady = allRecovered(muscles, PUSH_MUSCLES);
  const pullReady = allRecovered(muscles, PULL_MUSCLES);
  const legsReady = allRecovered(muscles, LEG_MUSCLES);
  const allReady  = allRecovered(muscles, ALL_MUSCLES);

  if (allReady) {
    return {
      workout: 'Full Body',
      reason:
        'All major muscle groups are fully recovered. A full-body session is ideal.',
    };
  }

  if (pushReady && pullReady && !legsReady) {
    return {
      workout: 'Upper Body',
      reason:
        'Chest, back, and shoulders have recovered. Legs need more time — train upper body.',
    };
  }

  if (pushReady && !pullReady) {
    return {
      workout: 'Push',
      reason:
        'Chest, triceps, and front delts have recovered while back and biceps are still recovering.',
    };
  }

  if (pullReady && !pushReady) {
    return {
      workout: 'Pull',
      reason:
        'Back, lats, and biceps have recovered while chest and triceps are still recovering.',
    };
  }

  if (legsReady && !pushReady && !pullReady) {
    return {
      workout: 'Legs',
      reason:
        'Quads, hamstrings, and glutes have recovered while upper body is still recovering.',
    };
  }

  if (legsReady && (pushReady || pullReady)) {
    const upper = pushReady ? 'Push' : 'Pull';
    return {
      workout: `${upper} + Legs`,
      reason: `Legs and ${upper.toLowerCase()} muscles are ready. A combined session is optimal.`,
    };
  }

  // Nothing is sufficiently recovered — recommend active rest.
  const soonestMuscle = [...muscles].sort(
    (a, b) => a.hoursRemaining - b.hoursRemaining,
  )[0];

  return {
    workout: 'Rest',
    reason: `All major muscle groups are still recovering. ${soonestMuscle?.muscle ?? 'The first muscle'} will be ready in ~${soonestMuscle?.hoursRemaining ?? 0}h.`,
  };
}
