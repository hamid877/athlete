/**
 * @file scorers/weekly-volume.ts
 * @module lib/growth-intelligence/scorers
 * @description
 *   Weekly Volume Score — measures the adequacy of total weekly training
 *   volume (sets per muscle group) against evidence-based optimal ranges.
 *
 * ─── Scoring Formula ─────────────────────────────────────────────────────────
 *
 *   1. Identify sessions in the most recent 7-day period of the analysis window.
 *      (Using the last 7 days ensures we measure current weekly volume, not
 *       an historical average that could mask recent under-training.)
 *
 *   2. Convert WorkoutSessionDTO → CompletedWorkout (bridge layer below)
 *      so we can delegate to the existing `analyzeWeeklyVolume()` engine
 *      from `lib/performance/volume.ts`.
 *
 *   3. Map each muscle's VolumeStatus → sub-score:
 *        Optimal   → 100  (10–20 sets/week — ideal hypertrophy stimulus)
 *        High      →  80  (21–25 sets/week — slight overreaching, still fine)
 *        Low       →  50  (6–9 sets/week — below optimal, some growth possible)
 *        Very Low  →  20  (≤ 5 sets/week — insufficient stimulus)
 *        Excessive →  30  (> 25 sets/week — overtraining risk)
 *
 *   4. Apply muscle importance weights:
 *        Primary movers (large muscles) = 1.0
 *          Chest, Back, Lats, Quads, Hamstrings, Glutes
 *        Secondary muscles (smaller) = 0.6
 *          Biceps, Triceps, Front/Side/Rear Delts, Calves, Core, Forearms
 *
 *   5. Weighted mean across all tracked muscles.
 *
 *   6. Diversity bonus: +5 if ≥ 4 distinct muscles are in the Optimal range
 *      (encourages balanced full-body training), capped at 100.
 *
 *   Score interpretation:
 *     100 = all muscle groups in optimal weekly set range
 *      80 = most muscles optimal, some slightly over
 *      50 = most muscles below optimal
 *      20 = very low volume across the board
 *       0 = no tracked sets in the past 7 days
 *
 * ─── Trend Calculation ───────────────────────────────────────────────────────
 *   Compare total sets in the last 7 days vs the 7 days prior:
 *     current > prior × 1.05 → 'improving'
 *     current < prior × 0.95 → 'declining'
 *     otherwise              → 'stable'
 *
 * ─── Confidence ─────────────────────────────────────────────────────────────
 *   Derived from total completed session count.
 *
 * ─── Inputs consumed ─────────────────────────────────────────────────────────
 *   sessions[].exercises[].exerciseId.primaryMuscle — for muscle targeting
 *   sessions[].exercises[].performedSets             — completed sets only
 *   sessions[].startedAt
 *   sessions[].status === 'completed'
 *   windowStart / windowEnd
 */

import type { GrowthAnalysisInput, ScoreDetail, TrendDirection } from '../types';
import {
  CONFIDENCE_LEVEL_TO_VALUE,
  VOLUME_OPTIMAL_MIN_SETS,
  VOLUME_OPTIMAL_MAX_SETS,
} from '../constants';
import { analyzeWeeklyVolume } from '../../performance/volume';
import type { CompletedWorkout, VolumeStatus } from '../../performance/types';
import {
  clampScore,
  resolveConfidenceLevel,
  resolveScoreStatus,
} from '../helpers';
import type { WorkoutSessionDTO } from '../../serializers/workoutSession';

// ─── Constants ────────────────────────────────────────────────────────────────

/** VolumeStatus → numeric sub-score. */
const VOLUME_STATUS_SCORE: Record<VolumeStatus, number> = {
  Optimal:   100,
  High:       80,
  Low:        50,
  'Very Low': 20,
  Excessive:  30,
};

/** Muscles classified as "primary movers" — receive full importance weight. */
const PRIMARY_MUSCLES = new Set([
  // Canonical names from lib/performance/constants.ts
  'Chest', 'Upper Chest', 'Back', 'Lats', 'Quads', 'Hamstrings', 'Glutes',
  // Exercise-model primaryMuscle values (snake_case) that map to the same groups
  'pectorals', 'upper_chest', 'lower_chest',
  'latissimus_dorsi', 'rhomboids', 'trapezius',
  'quadriceps', 'hamstrings', 'glutes',
]);

const PRIMARY_WEIGHT   = 1.0;
const SECONDARY_WEIGHT = 0.6;

/** Number of sessions with ≥ 4 muscles optimal to award the diversity bonus. */
const DIVERSITY_OPTIMAL_THRESHOLD = 4;
const DIVERSITY_BONUS = 5;

// ─── Bridge: WorkoutSessionDTO → CompletedWorkout ────────────────────────────

/**
 * Maps a `WorkoutSessionDTO` to the `CompletedWorkout` shape expected by
 * `analyzeWeeklyVolume()`.
 *
 * The primaryMuscle on the ExerciseSummaryDTO is a snake_case string such as
 * 'pectorals' or 'quadriceps'.  `analyzeWeeklyVolume` stores these as-is in
 * the muscle map, so downstream scoring uses the same key.
 */
function toCompletedWorkout(session: WorkoutSessionDTO): CompletedWorkout {
  return {
    completedAt: session.finishedAt ?? session.startedAt,
    exercises: session.exercises
      .filter((ex) => ex.exerciseId !== null)
      .map((ex) => ({
        name: ex.exerciseId!.name,
        // Use the primaryMuscle string from the serialised DTO as the target.
        targetMuscles: [ex.exerciseId!.primaryMuscle].filter(Boolean),
        performedSets: ex.performedSets.map((s) => ({
          weight: s.weight,
          reps: s.reps,
          completed: s.completed,
        })),
      })),
  };
}

// ─── Public Scorer ───────────────────────────────────────────────────────────

/**
 * Calculates the Weekly Volume Score for a given analysis input.
 *
 * @param input - The full GrowthAnalysisInput context.
 * @returns A fully-shaped ScoreDetail for the 'weekly_volume' dimension.
 */
export function calculateWeeklyVolumeScore(
  input: GrowthAnalysisInput,
): ScoreDetail {
  const { sessions, windowStart, windowEnd } = input;

  // ── All completed sessions in window ──────────────────────────────────────
  const allCompleted = sessions.filter((s) => {
    if (s.status !== 'completed') return false;
    const d = new Date(s.startedAt);
    return d >= windowStart && d <= windowEnd;
  });

  const sessionCount = allCompleted.length;
  const confidenceLevel = resolveConfidenceLevel(sessionCount);
  const confidence = CONFIDENCE_LEVEL_TO_VALUE[confidenceLevel];

  // ── Last 7 days of window for current volume snapshot ─────────────────────
  const last7Start = new Date(windowEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  const currentWeekSessions = allCompleted.filter(
    (s) => new Date(s.startedAt) >= last7Start,
  );

  // ── Prior 7 days for trend comparison ─────────────────────────────────────
  const prior7Start = new Date(last7Start.getTime() - 7 * 24 * 60 * 60 * 1000);
  const priorWeekSessions = allCompleted.filter((s) => {
    const d = new Date(s.startedAt);
    return d >= prior7Start && d < last7Start;
  });

  if (currentWeekSessions.length === 0) {
    return {
      key: 'weekly_volume',
      label: 'Weekly Volume Score',
      value: 0,
      status: 'critical',
      confidence,
      confidenceLevel,
      trend: 'insufficient_data',
      explanation: 'No completed sessions in the last 7 days of the analysis window.',
      breakdown: {
        totalCompletedSessions: sessionCount,
        currentWeekSessions: 0,
        musclesAnalyzed: 0,
        optimalSetsRange: { min: VOLUME_OPTIMAL_MIN_SETS, max: VOLUME_OPTIMAL_MAX_SETS },
      },
    };
  }

  // ── Analyse current week volume ───────────────────────────────────────────
  const currentWorkouts = currentWeekSessions.map(toCompletedWorkout);
  const muscleVolumes = analyzeWeeklyVolume(currentWorkouts);

  if (muscleVolumes.length === 0) {
    return {
      key: 'weekly_volume',
      label: 'Weekly Volume Score',
      value: 0,
      status: 'critical',
      confidence,
      confidenceLevel,
      trend: 'insufficient_data',
      explanation: 'No muscle group data found in recent sessions. Ensure exercises have muscle targets.',
      breakdown: {
        totalCompletedSessions: sessionCount,
        currentWeekSessions: currentWeekSessions.length,
        musclesAnalyzed: 0,
        optimalSetsRange: { min: VOLUME_OPTIMAL_MIN_SETS, max: VOLUME_OPTIMAL_MAX_SETS },
      },
    };
  }

  // ── Score each muscle ─────────────────────────────────────────────────────
  let weightedSum = 0;
  let weightTotal = 0;
  let optimalCount = 0;

  for (const mv of muscleVolumes) {
    const subScore = VOLUME_STATUS_SCORE[mv.status] ?? 0;
    const isPrimary = PRIMARY_MUSCLES.has(mv.muscle);
    const importanceWeight = isPrimary ? PRIMARY_WEIGHT : SECONDARY_WEIGHT;

    weightedSum += subScore * importanceWeight;
    weightTotal += importanceWeight;

    if (mv.status === 'Optimal') optimalCount++;
  }

  let rawScore = weightTotal > 0 ? weightedSum / weightTotal : 0;

  // Diversity bonus
  if (optimalCount >= DIVERSITY_OPTIMAL_THRESHOLD) {
    rawScore += DIVERSITY_BONUS;
  }

  const value = clampScore(rawScore);
  const status = resolveScoreStatus(value);

  // ── Trend: current week total sets vs prior week total sets ───────────────
  let trend: TrendDirection = 'stable';
  if (priorWeekSessions.length > 0) {
    const priorWorkouts = priorWeekSessions.map(toCompletedWorkout);
    const priorVolumes = analyzeWeeklyVolume(priorWorkouts);
    const currentTotalSets = muscleVolumes.reduce((s, m) => s + m.weeklySets, 0);
    const priorTotalSets = priorVolumes.reduce((s, m) => s + m.weeklySets, 0);

    if (priorTotalSets > 0) {
      const delta = currentTotalSets / priorTotalSets;
      if (delta > 1.05) trend = 'improving';
      else if (delta < 0.95) trend = 'declining';
    } else {
      trend = currentTotalSets > 0 ? 'improving' : 'stable';
    }
  } else {
    trend = 'insufficient_data';
  }

  // ── Explanation ────────────────────────────────────────────────────────────
  const optimalMuscles = muscleVolumes
    .filter((m) => m.status === 'Optimal')
    .map((m) => m.muscle);
  const lowMuscles = muscleVolumes
    .filter((m) => m.status === 'Very Low' || m.status === 'Low')
    .map((m) => m.muscle);

  let explanation: string;
  if (optimalMuscles.length > 0 && lowMuscles.length === 0) {
    explanation = `All ${muscleVolumes.length} tracked muscle groups are in the optimal weekly volume range.`;
  } else if (lowMuscles.length > 0) {
    explanation =
      `${lowMuscles.slice(0, 3).join(', ')} ` +
      (lowMuscles.length > 3 ? `and ${lowMuscles.length - 3} more ` : '') +
      `are below optimal weekly volume.`;
  } else {
    explanation = `${muscleVolumes.length} muscle groups tracked this week.`;
  }

  return {
    key: 'weekly_volume',
    label: 'Weekly Volume Score',
    value,
    status,
    confidence,
    confidenceLevel,
    trend,
    explanation,
    breakdown: {
      totalCompletedSessions: sessionCount,
      currentWeekSessions: currentWeekSessions.length,
      musclesAnalyzed: muscleVolumes.length,
      optimalMuscleCount: optimalCount,
      diversityBonusApplied: optimalCount >= DIVERSITY_OPTIMAL_THRESHOLD,
      optimalSetsRange: { min: VOLUME_OPTIMAL_MIN_SETS, max: VOLUME_OPTIMAL_MAX_SETS },
      muscleBreakdown: muscleVolumes.map((m) => ({
        muscle: m.muscle,
        weeklySets: m.weeklySets,
        status: m.status,
        subScore: VOLUME_STATUS_SCORE[m.status] ?? 0,
      })),
    },
  };
}
