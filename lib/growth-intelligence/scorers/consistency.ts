/**
 * @file scorers/consistency.ts
 * @module lib/growth-intelligence/scorers
 * @description
 *   Consistency Score — measures how reliably the user trains relative to
 *   their planned workout schedule over the analysis window.
 *
 * ─── Scoring Formula ─────────────────────────────────────────────────────────
 *
 *   1. Bucket all COMPLETED sessions by ISO week key (e.g. "2024-W03").
 *   2. For every ISO week in the analysis window, compute:
 *        adherenceRatio_k = completedSessions_k / plannedWorkoutDaysPerWeek
 *        Capped at 1.0 so extra sessions don't inflate the score.
 *   3. Apply exponential recency weighting so recent weeks matter more:
 *        weight_k = e^(-λ × (totalWeeks − k))   where λ = 0.15
 *        k = 1 (oldest week) … totalWeeks (most recent week)
 *   4. Weighted mean:
 *        weightedAdherence = Σ(weight_k × adherenceRatio_k) / Σ(weight_k)
 *   5. Score = weightedAdherence × 100, clamped [0, 100].
 *
 *   Score interpretation (approximate):
 *     100 = perfect adherence every week
 *      80 = ~1 missed session per planned week on average
 *      60 = ~60 % of planned sessions completed
 *      40 = ~40 % of planned sessions completed
 *       0 = no sessions in window
 *
 * ─── Trend Calculation ───────────────────────────────────────────────────────
 *   Split the window into first-half and second-half weeks.
 *   Compare adherence means:
 *     second > first + 5 %  → 'improving'
 *     second < first − 5 %  → 'declining'
 *     otherwise             → 'stable'
 *
 * ─── Confidence ─────────────────────────────────────────────────────────────
 *   Derived from the total completed session count via `resolveConfidenceLevel`.
 *
 * ─── Inputs consumed ─────────────────────────────────────────────────────────
 *   sessions[].startedAt              — for ISO-week bucketing
 *   sessions[].status === 'completed' — only completed sessions count
 *   plannedWorkoutDaysPerWeek         — denominator for adherence ratio
 *   windowStart / windowEnd           — bounds of the analysis period
 */

import type { GrowthAnalysisInput, ScoreDetail, TrendDirection } from '../types';
import {
  CONFIDENCE_LEVEL_TO_VALUE,
} from '../constants';
import {
  clampScore,
  isoWeekKey,
  resolveConfidenceLevel,
  resolveScoreStatus,
} from '../helpers';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Exponential decay factor λ for recency weighting.
 * Higher values = recent weeks dominate more strongly.
 * At λ=0.15 an 8-week window, the most recent week has ~3× the weight of
 * the oldest week.
 */
const RECENCY_DECAY = 0.15;

/**
 * Minimum difference in adherence ratio between window halves to classify
 * the trend as 'improving' or 'declining' rather than 'stable'.
 */
const TREND_DELTA_THRESHOLD = 0.05;

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Generates every ISO week key that falls within [start, end] (inclusive).
 * Used to fill weeks with 0 sessions so the adherence denominator is correct.
 */
function enumerateWeeksInWindow(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(start);

  // Align cursor to the Monday of the start week.
  const day = cursor.getUTCDay() || 7; // 1=Mon … 7=Sun
  cursor.setUTCDate(cursor.getUTCDate() - (day - 1));

  while (cursor <= end) {
    keys.push(isoWeekKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return [...new Set(keys)]; // deduplicate edge cases
}

/**
 * Exponential recency weight for week at index `k` (1-based) out of `total`.
 *   weight = e^(-λ × (total − k))
 */
function recencyWeight(k: number, total: number): number {
  return Math.exp(-RECENCY_DECAY * (total - k));
}

// ─── Public Scorer ───────────────────────────────────────────────────────────

/**
 * Calculates the Consistency Score for a given analysis input.
 *
 * @param input - The full GrowthAnalysisInput context.
 * @returns A fully-shaped ScoreDetail for the 'consistency' dimension.
 */
export function calculateConsistencyScore(
  input: GrowthAnalysisInput,
): ScoreDetail {
  const { sessions, plannedWorkoutDaysPerWeek, windowStart, windowEnd } = input;

  // ── Step 1: Filter completed sessions inside the window ───────────────────
  const completed = sessions.filter((s) => {
    if (s.status !== 'completed') return false;
    const d = new Date(s.startedAt);
    return d >= windowStart && d <= windowEnd;
  });

  const sessionCount = completed.length;
  const confidenceLevel = resolveConfidenceLevel(sessionCount);
  const confidence = CONFIDENCE_LEVEL_TO_VALUE[confidenceLevel];

  // ── Step 2: Bucket sessions by ISO week ───────────────────────────────────
  const sessionsByWeek = new Map<string, number>();
  for (const s of completed) {
    const key = isoWeekKey(new Date(s.startedAt));
    sessionsByWeek.set(key, (sessionsByWeek.get(key) ?? 0) + 1);
  }

  // ── Step 3: Enumerate all weeks in the window (fills zeros) ───────────────
  const allWeeks = enumerateWeeksInWindow(windowStart, windowEnd);
  const totalWeeks = allWeeks.length;

  if (totalWeeks === 0 || sessionCount === 0) {
    return {
      key: 'consistency',
      label: 'Consistency Score',
      value: 0,
      status: 'critical',
      confidence,
      confidenceLevel,
      trend: 'insufficient_data',
      explanation: 'No completed sessions found in the analysis window.',
      breakdown: {
        totalCompletedSessions: 0,
        plannedDaysPerWeek: plannedWorkoutDaysPerWeek,
        weeksInWindow: totalWeeks,
        weightedAdherence: 0,
      },
    };
  }

  // ── Step 4: Compute per-week adherence ratios ─────────────────────────────
  const adherenceRatios: number[] = allWeeks.map((wk) => {
    const actual = sessionsByWeek.get(wk) ?? 0;
    // Cap at 1.0 — training more than planned doesn't inflate consistency.
    return Math.min(1, actual / plannedWorkoutDaysPerWeek);
  });

  // ── Step 5: Apply exponential recency weighting ───────────────────────────
  let weightedSum = 0;
  let weightTotal = 0;
  for (let i = 0; i < totalWeeks; i++) {
    const k = i + 1; // 1-based index (oldest = 1)
    const w = recencyWeight(k, totalWeeks);
    weightedSum += w * adherenceRatios[i];
    weightTotal += w;
  }

  const weightedAdherence = weightTotal > 0 ? weightedSum / weightTotal : 0;
  const value = clampScore(weightedAdherence * 100);
  const status = resolveScoreStatus(value);

  // ── Step 6: Trend (first half vs second half) ─────────────────────────────
  const half = Math.floor(totalWeeks / 2);
  let trend: TrendDirection = 'stable';

  if (totalWeeks >= 2) {
    const firstHalf = adherenceRatios.slice(0, half);
    const secondHalf = adherenceRatios.slice(half);
    const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (secondMean > firstMean + TREND_DELTA_THRESHOLD) {
      trend = 'improving';
    } else if (secondMean < firstMean - TREND_DELTA_THRESHOLD) {
      trend = 'declining';
    }
  } else {
    trend = 'insufficient_data';
  }

  // ── Step 7: Human-readable explanation ────────────────────────────────────
  const adherencePct = Math.round(weightedAdherence * 100);
  const explanation =
    `You completed ${sessionCount} session${sessionCount === 1 ? '' : 's'} ` +
    `across ${totalWeeks} week${totalWeeks === 1 ? '' : 's'} ` +
    `(${adherencePct}% weighted adherence to your ${plannedWorkoutDaysPerWeek}-day plan).`;

  return {
    key: 'consistency',
    label: 'Consistency Score',
    value,
    status,
    confidence,
    confidenceLevel,
    trend,
    explanation,
    breakdown: {
      totalCompletedSessions: sessionCount,
      plannedDaysPerWeek: plannedWorkoutDaysPerWeek,
      weeksInWindow: totalWeeks,
      weightedAdherence: Math.round(weightedAdherence * 1000) / 1000,
      adherenceRatiosByWeek: Object.fromEntries(
        allWeeks.map((wk, i) => [wk, Math.round(adherenceRatios[i] * 100) / 100]),
      ),
    },
  };
}
