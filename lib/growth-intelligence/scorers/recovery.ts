/**
 * @file scorers/recovery.ts
 * @module lib/growth-intelligence/scorers
 * @description
 *   Recovery Score — measures how well the user manages inter-session recovery,
 *   expressed as the quality of the muscle recovery state at the start of each
 *   training session.
 *
 * ─── Scoring Formula ─────────────────────────────────────────────────────────
 *
 *   For every completed session S in the analysis window (chronological order):
 *
 *   1. Use session.startedAt as the "now" reference point.
 *
 *   2. Build the CompletedWorkout history from all PRIOR sessions only
 *      (sessions before S.startedAt). This ensures we only consider fatigue
 *      accumulated before the session started.
 *
 *   3. Call `calculateAllRecovery(priorHistory, session.startedAt)` to get the
 *      per-muscle recovery percentages at the moment the athlete walked into
 *      the gym.
 *
 *   4. Filter to only the muscles ACTUALLY trained in session S (i.e., muscles
 *      that appear in S's exercise list). Untrained muscles are always 100%
 *      recovered and would inflate the score.
 *
 *   5. Compute:
 *        sessionRecoveryScore = mean(recoveryPct for each trained muscle)
 *        (Already 0–100 from the recovery engine)
 *
 *   6. After scoring all sessions:
 *        overallScore = mean(sessionRecoveryScores)
 *
 *   7. Deload bonus: if any ISO week in the window has ≤ 1 session (deload
 *      week detected), add +5 to the final score, capped at 100.
 *
 *   Score interpretation:
 *     100 = every session started with all trained muscles fully recovered
 *      80 = most sessions had ≥ 80 % mean muscle recovery at start
 *      60 = moderate fatigue going into sessions — some junk volume
 *      40 = chronically training under-recovered muscles
 *       0 = every session trained severely fatigued muscles
 *
 * ─── Trend Calculation ───────────────────────────────────────────────────────
 *   Compare mean session recovery score of the first half vs second half of
 *   sessions (chronological order):
 *     second > first + 5 → 'improving'
 *     second < first − 5 → 'declining'
 *     otherwise          → 'stable'
 *
 * ─── Confidence ─────────────────────────────────────────────────────────────
 *   Derived from total completed session count.
 *
 * ─── Inputs consumed ─────────────────────────────────────────────────────────
 *   sessions[].startedAt                — reference point for each session
 *   sessions[].exercises[].exerciseId   — to identify trained muscles per session
 *   sessions[].status === 'completed'   — only completed sessions
 *   windowStart / windowEnd
 */

import type { GrowthAnalysisInput, ScoreDetail, TrendDirection } from '../types';
import {
  CONFIDENCE_LEVEL_TO_VALUE,
  RECOVERY_GOOD_THRESHOLD_PCT,
} from '../constants';
import { calculateAllRecovery } from '../../performance/recovery';
import type { CompletedWorkout } from '../../performance/types';
import {
  clampScore,
  isoWeekKey,
  mean,
  resolveConfidenceLevel,
  resolveScoreStatus,
} from '../helpers';
import type { WorkoutSessionDTO } from '../../serializers/workoutSession';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Score delta between window halves to be classified as a trend. */
const TREND_DELTA = 5;

/** Number of sessions in a week to classify it as a "deload" week. */
const DELOAD_SESSION_THRESHOLD = 1;

/** Bonus added to final score when a deload week is detected. */
const DELOAD_BONUS = 5;

// ─── Bridge: WorkoutSessionDTO → CompletedWorkout ────────────────────────────

/**
 * Converts a `WorkoutSessionDTO` to the `CompletedWorkout` shape expected by
 * `calculateAllRecovery()`.
 */
function sessionToCompletedWorkout(session: WorkoutSessionDTO): CompletedWorkout {
  return {
    completedAt: session.finishedAt ?? session.startedAt,
    exercises: session.exercises
      .filter((ex) => ex.exerciseId !== null)
      .map((ex) => ({
        name: ex.exerciseId!.name,
        targetMuscles: [ex.exerciseId!.primaryMuscle].filter(Boolean),
        performedSets: ex.performedSets.map((s) => ({
          weight: s.weight,
          reps: s.reps,
          completed: s.completed,
        })),
      })),
  };
}

/**
 * Extracts the set of muscle names trained in a given session.
 */
function trainedMusclesInSession(session: WorkoutSessionDTO): Set<string> {
  const muscles = new Set<string>();
  for (const ex of session.exercises) {
    if (ex.exerciseId?.primaryMuscle) {
      muscles.add(ex.exerciseId.primaryMuscle);
    }
  }
  return muscles;
}

// ─── Public Scorer ───────────────────────────────────────────────────────────

/**
 * Calculates the Recovery Score for a given analysis input.
 *
 * @param input - The full GrowthAnalysisInput context.
 * @returns A fully-shaped ScoreDetail for the 'recovery' dimension.
 */
export function calculateRecoveryScore(
  input: GrowthAnalysisInput,
): ScoreDetail {
  const { sessions, windowStart, windowEnd } = input;

  // ── Filter and sort all completed sessions inside the window ──────────────
  const completed = sessions
    .filter((s) => {
      if (s.status !== 'completed') return false;
      const d = new Date(s.startedAt);
      return d >= windowStart && d <= windowEnd;
    })
    .sort(
      (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );

  // All completed sessions (including before window) for prior-history lookups
  const allCompleted = sessions
    .filter((s) => s.status === 'completed')
    .sort(
      (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );

  const sessionCount = completed.length;
  const confidenceLevel = resolveConfidenceLevel(sessionCount);
  const confidence = CONFIDENCE_LEVEL_TO_VALUE[confidenceLevel];

  if (sessionCount === 0) {
    return {
      key: 'recovery',
      label: 'Recovery Score',
      value: 0,
      status: 'critical',
      confidence,
      confidenceLevel,
      trend: 'insufficient_data',
      explanation: 'No completed sessions found in the analysis window.',
      breakdown: {
        totalCompletedSessions: 0,
        goodRecoveryThresholdPct: RECOVERY_GOOD_THRESHOLD_PCT,
        sessionsWellRecovered: 0,
        deloadBonusApplied: false,
      },
    };
  }

  // ── Score each session ────────────────────────────────────────────────────
  const sessionScores: number[] = [];

  for (let i = 0; i < completed.length; i++) {
    const currentSession = completed[i];
    const sessionStart = new Date(currentSession.startedAt);

    // Build prior-history: all completed sessions BEFORE this session's start
    const priorHistory: CompletedWorkout[] = allCompleted
      .filter((s) => new Date(s.startedAt) < sessionStart)
      .map(sessionToCompletedWorkout);

    if (priorHistory.length === 0) {
      // First ever session — muscles fully recovered → score = 100
      sessionScores.push(100);
      continue;
    }

    // Get recovery state at session start
    const recoveryResult = calculateAllRecovery(priorHistory, sessionStart);

    // Identify muscles trained in this session
    const trainedMuscles = trainedMusclesInSession(currentSession);

    if (trainedMuscles.size === 0) {
      // No identifiable muscles → treat as neutral
      sessionScores.push(50);
      continue;
    }

    // Filter to muscles actually trained in this session
    const relevantMuscleRecoveries = recoveryResult.muscles.filter((m) =>
      trainedMuscles.has(m.muscle),
    );

    if (relevantMuscleRecoveries.length === 0) {
      // Trained muscles don't match recovery engine muscles → neutral
      sessionScores.push(50);
      continue;
    }

    const sessionRecovery = mean(relevantMuscleRecoveries.map((m) => m.recovery));
    sessionScores.push(sessionRecovery);
  }

  // ── Overall score ─────────────────────────────────────────────────────────
  let rawScore = mean(sessionScores);

  // ── Deload bonus detection ─────────────────────────────────────────────────
  // Group sessions by ISO week and check if any week had ≤ DELOAD_SESSION_THRESHOLD
  const weekCounts = new Map<string, number>();
  for (const s of completed) {
    const key = isoWeekKey(new Date(s.startedAt));
    weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1);
  }
  const hasDeloadWeek = [...weekCounts.values()].some(
    (count) => count <= DELOAD_SESSION_THRESHOLD,
  );
  if (hasDeloadWeek) rawScore += DELOAD_BONUS;

  const value = clampScore(rawScore);
  const status = resolveScoreStatus(value);

  // ── Trend (first-half vs second-half of sessions) ─────────────────────────
  let trend: TrendDirection = 'stable';
  if (sessionScores.length >= 2) {
    const half = Math.floor(sessionScores.length / 2);
    const firstMean = mean(sessionScores.slice(0, half));
    const secondMean = mean(sessionScores.slice(half));

    if (secondMean > firstMean + TREND_DELTA) trend = 'improving';
    else if (secondMean < firstMean - TREND_DELTA) trend = 'declining';
  } else {
    trend = 'insufficient_data';
  }

  // ── Explanation ────────────────────────────────────────────────────────────
  const wellRecoveredSessions = sessionScores.filter(
    (s) => s >= RECOVERY_GOOD_THRESHOLD_PCT,
  ).length;

  const explanation =
    `${wellRecoveredSessions} of ${sessionCount} session${sessionCount === 1 ? '' : 's'} ` +
    `started with muscles ≥ ${RECOVERY_GOOD_THRESHOLD_PCT}% recovered.` +
    (hasDeloadWeek ? ' Deload week detected (+5 bonus).' : '');

  return {
    key: 'recovery',
    label: 'Recovery Score',
    value,
    status,
    confidence,
    confidenceLevel,
    trend,
    explanation,
    breakdown: {
      totalCompletedSessions: sessionCount,
      goodRecoveryThresholdPct: RECOVERY_GOOD_THRESHOLD_PCT,
      sessionsWellRecovered: wellRecoveredSessions,
      meanSessionRecoveryScore: Math.round(mean(sessionScores) * 10) / 10,
      deloadBonusApplied: hasDeloadWeek,
    },
  };
}
