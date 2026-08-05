/**
 * @file helpers.ts
 * @module lib/growth-intelligence
 * @description
 *   Pure utility functions shared across all scorer modules.
 *
 *   Deliberately kept framework-free and side-effect-free so they are
 *   trivially unit-testable in Phase 2.
 */

import type { ConfidenceLevel, ScoreStatus } from './types';
import {
  CONFIDENCE_THRESHOLDS,
  SCORE_THRESHOLDS,
} from './constants';

// ─────────────────────────────────────────────────────────────────────────────
// Score / Confidence Resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps a raw session count to the appropriate `ConfidenceLevel`.
 *
 * Iterates the thresholds table in ascending order and returns the highest
 * level whose `minSessions` the count satisfies.
 *
 * @param sessionCount - Total number of completed sessions available.
 * @returns The resolved `ConfidenceLevel`.
 */
export function resolveConfidenceLevel(sessionCount: number): ConfidenceLevel {
  let resolved: ConfidenceLevel = 'insufficient';
  for (const threshold of CONFIDENCE_THRESHOLDS) {
    if (sessionCount >= threshold.minSessions) {
      resolved = threshold.level;
    }
  }
  return resolved;
}

/**
 * Maps a numeric score [0, 100] to the appropriate `ScoreStatus`.
 *
 * Iterates the thresholds table in ascending order and returns the highest
 * status whose `min` value the score satisfies.
 *
 * @param score - A value clamped in [0, 100].
 * @returns The resolved `ScoreStatus`.
 */
export function resolveScoreStatus(score: number): ScoreStatus {
  let resolved: ScoreStatus = 'critical';
  for (const threshold of SCORE_THRESHOLDS) {
    if (score >= threshold.min) {
      resolved = threshold.status;
    }
  }
  return resolved;
}

// ─────────────────────────────────────────────────────────────────────────────
// Score Arithmetic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clamps a number to the [0, 100] range and rounds to 1 decimal place.
 *
 * Use this whenever combining partial scores to prevent floating-point
 * drift outside the valid range.
 *
 * @param value - Raw computed score.
 * @returns A value in [0, 100] rounded to 1 d.p.
 */
export function clampScore(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)) * 10) / 10;
}

/**
 * Clamps a confidence value to [0, 1] and rounds to 2 decimal places.
 *
 * @param value - Raw confidence fraction.
 * @returns A value in [0, 1] rounded to 2 d.p.
 */
export function clampConfidence(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Date Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the calendar week number (ISO 8601) for a given date.
 * Used by the Consistency scorer when grouping sessions by week.
 *
 * @param date - The date to evaluate.
 * @returns An integer week number in [1, 53].
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
}

/**
 * Returns the ISO year for a date, accounting for week-year boundary cases.
 *
 * @param date - The date to evaluate.
 * @returns The ISO week-year (e.g., last few days of December can be week 1
 *          of the following year).
 */
export function getISOWeekYear(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

/**
 * Returns a `"YYYY-Www"` string key for grouping sessions by ISO week.
 *
 * @example
 * isoWeekKey(new Date('2024-01-03')) // "2024-W01"
 *
 * @param date - The date to evaluate.
 * @returns ISO week key string.
 */
export function isoWeekKey(date: Date): string {
  const week = getISOWeekNumber(date).toString().padStart(2, '0');
  return `${getISOWeekYear(date)}-W${week}`;
}

/**
 * Filters an array of dated records to those within [start, end] (inclusive).
 *
 * @param items    - Array of records with a `date` field.
 * @param start    - Window start.
 * @param end      - Window end.
 * @returns Filtered array in the same order as the input.
 */
export function filterByDateRange<T extends { date: Date }>(
  items: T[],
  start: Date,
  end: Date,
): T[] {
  return items.filter(
    (item) => item.date >= start && item.date <= end,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Statistical Helpers (Phase 2+ consumers)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the arithmetic mean of a numeric array.
 * Returns 0 for an empty array (safe default for Phase 1 stubs).
 *
 * @param values - Array of numbers.
 * @returns The mean value, or 0 if the array is empty.
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Fits a simple ordinary-least-squares linear regression to a series of
 * (x, y) pairs and returns the slope.
 *
 * Used by the Progressive Overload scorer in Phase 2 to detect trend
 * direction across e1RM values over sessions.
 *
 * @param points - Array of { x, y } data points. Requires ≥ 2 points.
 * @returns Slope of the best-fit line. 0 if < 2 points.
 */
export function linearRegressionSlope(
  points: ReadonlyArray<{ x: number; y: number }>,
): number {
  if (points.length < 2) return 0;

  const n = points.length;
  const sumX = points.reduce((acc, p) => acc + p.x, 0);
  const sumY = points.reduce((acc, p) => acc + p.y, 0);
  const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0);
  const sumX2 = points.reduce((acc, p) => acc + p.x * p.x, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = n * sumX2 - sumX * sumX;

  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Generates a unique, stable string ID for a `GrowthRecommendation`.
 *
 * IDs are deterministic (same inputs → same ID) so the UI can use them
 * as stable React keys and for deduplication across repeated analyses.
 *
 * @param category - Recommendation category.
 * @param target   - Muscle / exercise target, or 'global'.
 * @param index    - Position within the recommendation list.
 * @returns A dash-separated identifier string.
 */
export function buildRecommendationId(
  category: string,
  target: string,
  index: number,
): string {
  return `gi-rec-${category}-${target.toLowerCase().replace(/\s+/g, '-')}-${index}`;
}
