/**
 * @file scorers/progressive-overload.ts
 * @module lib/growth-intelligence/scorers
 * @description
 *   Progressive Overload Score — measures the rate and quality of load/volume
 *   progression across all tracked exercises within the analysis window.
 *
 * ─── Scoring Formula ─────────────────────────────────────────────────────────
 *
 *   For each exercise with ≥ 2 sessions inside the window:
 *
 *   1. Per-session e1RM:
 *        For every performed set (completed only), compute Epley e1RM:
 *          e1RM = weight × (1 + reps / 30)   (reps = 1 → weight itself)
 *        Take the max e1RM within a session as the session's representative value.
 *
 *   2. Fit a linear regression over (sessionIndex, e1RM) points:
 *        slope = linearRegressionSlope(points)
 *        baseE1RM = e1RM of the first session (or mean if that is 0)
 *
 *   3. Compute the improvement rate (normalised slope):
 *        improvementRate = slope / baseE1RM
 *        (Dimensionless fraction of initial e1RM gained per session.)
 *
 *   4. Map improvementRate → exerciseScore [0, 100]:
 *        ≥ MIN_IMPROVEMENT_RATE        → 100  (optimal progress)
 *        ≥ 0 and < MIN_IMPROVEMENT_RATE → lerp(50, 100, rate / MIN_RATE)
 *        < 0                           → lerp(0, 50, 1 + clamp(rate / MIN_RATE, −1, 0))
 *        (negative score = regressing; score floor is 0)
 *
 *   5. Aggregate across exercises with importance weighting:
 *        compound exercise weight = 1.0
 *        isolation exercise weight = 0.6
 *        overallScore = weightedMean(exerciseScores × importanceWeights)
 *
 *   Score interpretation:
 *     100 = all major lifts progressing at or above target rate
 *      75 = solid progress, slight stalls on some lifts
 *      50 = flat — maintaining but not advancing
 *      25 = mild regression on key lifts
 *       0 = all major lifts regressing
 *
 * ─── Experience-Level Adjustment ─────────────────────────────────────────────
 *   Beginners progress faster so MIN_IMPROVEMENT_RATE is multiplied:
 *     beginner     × 2.0  (expect steeper weekly gains)
 *     intermediate × 1.0  (baseline)
 *     advanced     × 0.5  (slower gains are still optimal)
 *   This prevents advanced athletes being unfairly penalised for normal gains.
 *
 * ─── Trend Calculation ───────────────────────────────────────────────────────
 *   Compare mean exerciseScore of the first vs second half of sessions:
 *     second > first + 5 → 'improving'
 *     second < first − 5 → 'declining'
 *     otherwise          → 'stable'
 *
 * ─── Confidence ─────────────────────────────────────────────────────────────
 *   Derived from total completed session count.
 *
 * ─── Inputs consumed ─────────────────────────────────────────────────────────
 *   sessions[].exercises[].performedSets (weight, reps, completed)
 *   sessions[].exercises[].exerciseId   (name, equipment — for compound flag)
 *   sessions[].startedAt
 *   sessions[].status === 'completed'
 *   experienceLevel
 *   windowStart / windowEnd
 */

import type { GrowthAnalysisInput, ScoreDetail, TrendDirection } from '../types';
import {
  CONFIDENCE_LEVEL_TO_VALUE,
  PROGRESSIVE_OVERLOAD_MIN_IMPROVEMENT_RATE,
  PROGRESSIVE_OVERLOAD_SESSION_WINDOW,
} from '../constants';
import {
  calculateEpley1RM,
} from '../../performance/records';
import {
  clampScore,
  linearRegressionSlope,
  mean,
  resolveConfidenceLevel,
  resolveScoreStatus,
} from '../helpers';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Importance weight for compound (multi-joint) exercises. */
const COMPOUND_WEIGHT = 1.0;

/** Importance weight for isolation exercises. */
const ISOLATION_WEIGHT = 0.6;

/** Equipment strings that indicate a machine (fixed-path). */
const MACHINE_EQUIPMENT = new Set(['machine', 'cable', 'smith_machine']);

/** Experience-level multipliers applied to MIN_IMPROVEMENT_RATE. */
const EXPERIENCE_RATE_MULTIPLIER: Record<string, number> = {
  beginner:     2.0,
  intermediate: 1.0,
  advanced:     0.5,
};

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Returns true when the exercise name / equipment suggests it's a compound
 * (multi-joint) movement. We use equipment as a heuristic since the DTO
 * does not carry an `isCompound` flag directly.
 *
 * Heuristic: bodyweight, barbell, trap_bar, and smith_machine exercises are
 * compound by default; machine + cable cables can go either way but we default
 * to isolation weighting for them unless the name contains a compound keyword.
 */
function isCompoundExercise(name: string, equipment: string): boolean {
  const compoundKeywords = [
    'squat', 'deadlift', 'bench', 'press', 'row', 'pull-up', 'pullup',
    'dip', 'lunge', 'step-up', 'clean', 'snatch', 'thruster',
  ];
  const lowerName = name.toLowerCase();
  const hasCompoundKeyword = compoundKeywords.some((kw) => lowerName.includes(kw));
  const isMachineEq = MACHINE_EQUIPMENT.has(equipment);

  if (hasCompoundKeyword) return true;
  if (equipment === 'barbell' || equipment === 'trap_bar') return true;
  if (isMachineEq) return false;
  return false;
}

/**
 * Maps an improvementRate to an exercise score [0, 100].
 *
 *  rate ≥ minRate → 100
 *  0 ≤ rate < minRate → linear interpolation: 50 + 50 × (rate / minRate)
 *  rate < 0 → linear interpolation: 50 + 50 × (rate / minRate)  [goes toward 0]
 */
function rateToScore(improvementRate: number, minRate: number): number {
  if (minRate <= 0) return 50;
  if (improvementRate >= minRate) return 100;
  // Linear scale between -minRate → 0 and minRate → 100
  // At rate=0 → score=50; at rate=−minRate → score=0; at rate=minRate → score=100
  const normalized = improvementRate / minRate; // range: (−∞, 1]
  const clamped = Math.max(-1, Math.min(1, normalized));
  return 50 + 50 * clamped;
}

// ─── Public Scorer ───────────────────────────────────────────────────────────

/**
 * Calculates the Progressive Overload Score for a given analysis input.
 *
 * @param input - The full GrowthAnalysisInput context.
 * @returns A fully-shaped ScoreDetail for the 'progressive_overload' dimension.
 */
export function calculateProgressiveOverloadScore(
  input: GrowthAnalysisInput,
): ScoreDetail {
  const { sessions, windowStart, windowEnd, experienceLevel } = input;

  // ── Filter completed sessions inside window, sorted chronologically ────────
  const completed = sessions
    .filter((s) => {
      if (s.status !== 'completed') return false;
      const d = new Date(s.startedAt);
      return d >= windowStart && d <= windowEnd;
    })
    .sort(
      (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    )
    .slice(-PROGRESSIVE_OVERLOAD_SESSION_WINDOW * 4); // cap history to prevent O(n²)

  const sessionCount = completed.length;
  const confidenceLevel = resolveConfidenceLevel(sessionCount);
  const confidence = CONFIDENCE_LEVEL_TO_VALUE[confidenceLevel];

  // ── Experience-adjusted minimum improvement rate ───────────────────────────
  const expMultiplier = EXPERIENCE_RATE_MULTIPLIER[experienceLevel] ?? 1.0;
  const effectiveMinRate = PROGRESSIVE_OVERLOAD_MIN_IMPROVEMENT_RATE * expMultiplier;

  if (sessionCount < 2) {
    return {
      key: 'progressive_overload',
      label: 'Progressive Overload Score',
      value: 0,
      status: 'critical',
      confidence,
      confidenceLevel,
      trend: 'insufficient_data',
      explanation: 'Need at least 2 completed sessions to calculate progressive overload.',
      breakdown: {
        totalCompletedSessions: sessionCount,
        exercisesAnalyzed: 0,
        experienceLevel,
      },
    };
  }

  // ── Build per-exercise e1RM time series ───────────────────────────────────
  // Map: exerciseId → array of { sessionIndex, e1rm, name, equipment }
  type ExercisePoint = { sessionIndex: number; e1rm: number };
  const exerciseData = new Map<
    string,
    { name: string; equipment: string; points: ExercisePoint[] }
  >();

  for (let si = 0; si < completed.length; si++) {
    const session = completed[si];
    for (const ex of session.exercises) {
      if (!ex.exerciseId) continue;

      const exId = ex.exerciseId._id;
      const exName = ex.exerciseId.name;
      const exEquipment = ex.exerciseId.equipment ?? '';

      // Find the best (highest) e1RM set in this exercise within this session
      let bestE1RM = 0;
      for (const set of ex.performedSets) {
        if (!set.completed || set.weight <= 0 || set.reps <= 0) continue;
        const e1rm = calculateEpley1RM(set.weight, set.reps);
        if (e1rm > bestE1RM) bestE1RM = e1rm;
      }

      if (bestE1RM === 0) continue; // Skip exercises with no valid sets

      if (!exerciseData.has(exId)) {
        exerciseData.set(exId, { name: exName, equipment: exEquipment, points: [] });
      }
      exerciseData.get(exId)!.points.push({ sessionIndex: si, e1rm: bestE1RM });
    }
  }

  // ── Score each exercise ───────────────────────────────────────────────────
  type ScoredExercise = {
    name: string;
    score: number;
    weight: number;
    slope: number;
    improvementRate: number;
  };

  const scoredExercises: ScoredExercise[] = [];

  for (const [, data] of exerciseData) {
    if (data.points.length < 2) continue; // Need ≥ 2 data points for regression

    const slope = linearRegressionSlope(
      data.points.map((p) => ({ x: p.sessionIndex, y: p.e1rm })),
    );

    const baseE1RM = data.points[0].e1rm || mean(data.points.map((p) => p.e1rm));
    const improvementRate = baseE1RM > 0 ? slope / baseE1RM : 0;
    const score = rateToScore(improvementRate, effectiveMinRate);

    const compound = isCompoundExercise(data.name, data.equipment);
    const weight = compound ? COMPOUND_WEIGHT : ISOLATION_WEIGHT;

    scoredExercises.push({
      name: data.name,
      score: clampScore(score),
      weight,
      slope: Math.round(slope * 100) / 100,
      improvementRate: Math.round(improvementRate * 10000) / 10000,
    });
  }

  if (scoredExercises.length === 0) {
    // Sessions exist but no exercise has weight+reps data (edge case)
    return {
      key: 'progressive_overload',
      label: 'Progressive Overload Score',
      value: 0,
      status: 'critical',
      confidence,
      confidenceLevel,
      trend: 'insufficient_data',
      explanation: 'No weighted exercises with reps found in the analysis window.',
      breakdown: {
        totalCompletedSessions: sessionCount,
        exercisesAnalyzed: 0,
        experienceLevel,
      },
    };
  }

  // ── Weighted mean across exercises ────────────────────────────────────────
  const totalWeight = scoredExercises.reduce((s, e) => s + e.weight, 0);
  const weightedScoreSum = scoredExercises.reduce(
    (s, e) => s + e.score * e.weight,
    0,
  );
  const value = clampScore(
    totalWeight > 0 ? weightedScoreSum / totalWeight : 0,
  );
  const status = resolveScoreStatus(value);

  // ── Trend (first-half sessions vs second-half sessions) ───────────────────
  let trend: TrendDirection = 'stable';
  if (sessionCount >= 4) {
    const half = Math.floor(sessionCount / 2);
    const firstSessions = new Set(Array.from({ length: half }, (_, i) => i));
    const secondSessions = new Set(
      Array.from({ length: sessionCount - half }, (_, i) => i + half),
    );

    const firstScores: number[] = [];
    const secondScores: number[] = [];

    for (const [, data] of exerciseData) {
      for (const p of data.points) {
        // Compare raw e1RM values across halves to detect trend direction
        if (firstSessions.has(p.sessionIndex)) firstScores.push(p.e1rm);
        if (secondSessions.has(p.sessionIndex)) secondScores.push(p.e1rm);
      }
    }

    if (firstScores.length > 0 && secondScores.length > 0) {
      const firstMean = mean(firstScores);
      const secondMean = mean(secondScores);
      if (firstMean > 0) {
        const delta = (secondMean - firstMean) / firstMean;
        if (delta > 0.02) trend = 'improving';
        else if (delta < -0.02) trend = 'declining';
      }
    }
  } else {
    trend = 'insufficient_data';
  }

  // ── Explanation ────────────────────────────────────────────────────────────
  const progressing = scoredExercises.filter((e) => e.score >= 70).length;
  const stalled = scoredExercises.filter(
    (e) => e.score >= 40 && e.score < 70,
  ).length;
  const regressing = scoredExercises.filter((e) => e.score < 40).length;

  const explanation =
    `Analysed ${scoredExercises.length} exercise${scoredExercises.length === 1 ? '' : 's'}: ` +
    `${progressing} progressing, ${stalled} stalled, ${regressing} regressing.`;

  return {
    key: 'progressive_overload',
    label: 'Progressive Overload Score',
    value,
    status,
    confidence,
    confidenceLevel,
    trend,
    explanation,
    breakdown: {
      totalCompletedSessions: sessionCount,
      exercisesAnalyzed: scoredExercises.length,
      experienceLevel,
      effectiveMinImprovementRate: effectiveMinRate,
      exercises: scoredExercises.map((e) => ({
        name: e.name,
        score: e.score,
        slope: e.slope,
        improvementRate: e.improvementRate,
      })),
    },
  };
}
