/**
 * @file velocity.service.ts
 * @module lib/growth-intelligence
 * @description
 *   Growth Velocity Engine — computes the rate of change and acceleration of
 *   a user's growth progress over time, using historical snapshots.
 *
 *   ─── Responsibilities ────────────────────────────────────────────────────
 *   This service analyzes a time-series of GrowthAnalysisSnapshot documents
 *   to determine how fast a user is improving (velocity), whether their
 *   progress is speeding up or slowing down (acceleration), and how consistent
 *   their improvement is.
 */

import type { IGrowthAnalysisSnapshot } from '@/models/GrowthAnalysisSnapshot';
import { TrendDirection, classifyTrend } from './comparison.service';
import { linearRegressionSlope } from './helpers';

// ─────────────────────────────────────────────────────────────────────────────
// Public Interfaces
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The complete result of a velocity analysis over a time-series of snapshots.
 *
 * All rates are expressed in score points (0-100 scale) per unit of time.
 */
export interface VelocityAnalysis {
  /** Average score points gained or lost per week. */
  weeklyGrowthRate: number;
  /** Average score points gained or lost per month (30 days). */
  monthlyGrowthRate: number;
  /** The overall average growth rate (points per day). */
  averageGrowthRate: number;
  /**
   * The rate of change of the growth rate.
   * Positive = progress is accelerating (speeding up).
   * Negative = progress is decelerating (slowing down).
   * Expressed as change in weekly growth rate between the first and second half of the period.
   */
  acceleration: number;
  /**
   * Fraction of sequential snapshot pairs that showed improvement (score went up).
   * Value between 0 and 1.
   */
  consistencyOfImprovement: number;
  /** Estimated overall trend direction across the analyzed period. */
  estimatedTrendDirection: TrendDirection;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ─────────────────────────────────────────────────────────────────────────────
// Public Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the average growth rate (points per day) across a series of snapshots.
 *
 * Uses a simple ordinary-least-squares linear regression over the snapshots
 * to find the slope (points per day).
 *
 * @param snapshots - Array of historical snapshots.
 * @returns Average growth rate in points per day.
 */
export function calculateAverageGrowthRate(snapshots: IGrowthAnalysisSnapshot[]): number {
  if (snapshots.length < 2) return 0;

  // Ensure snapshots are sorted chronologically (oldest first)
  const sorted = [...snapshots].sort((a, b) => a.analyzedAt.getTime() - b.analyzedAt.getTime());
  const baselineTime = sorted[0].analyzedAt.getTime();

  const points = sorted.map(s => ({
    x: (s.analyzedAt.getTime() - baselineTime) / MS_PER_DAY,
    y: s.overallScore.value,
  }));

  // Prevent artificially massive rates if snapshots are clustered on the same day
  const uniqueDays = new Set(points.map(p => Math.round(p.x)));
  if (uniqueDays.size < 2) {
    return 0;
  }

  return linearRegressionSlope(points);
}

/**
 * Calculates the acceleration (change in growth rate) across a series of snapshots.
 *
 * Splits the time-series into an older half and a newer half, computes the
 * weekly growth rate for both, and returns the difference.
 *
 * @param snapshots - Array of historical snapshots.
 * @returns Change in weekly growth rate. Positive = accelerating.
 */
export function calculateAcceleration(snapshots: IGrowthAnalysisSnapshot[]): number {
  if (snapshots.length < 3) return 0; // Need at least 3 points to detect acceleration

  const sorted = [...snapshots].sort((a, b) => a.analyzedAt.getTime() - b.analyzedAt.getTime());
  
  // Split snapshots into two halves by count
  const midpoint = Math.floor(sorted.length / 2);
  // Include the midpoint in both halves so the two slopes share the hinge point
  const olderHalf = sorted.slice(0, midpoint + 1);
  const newerHalf = sorted.slice(midpoint);

  const olderRatePerDay = calculateAverageGrowthRate(olderHalf);
  const newerRatePerDay = calculateAverageGrowthRate(newerHalf);

  const olderWeeklyRate = olderRatePerDay * 7;
  const newerWeeklyRate = newerRatePerDay * 7;

  return newerWeeklyRate - olderWeeklyRate;
}

/**
 * Calculates the overall trend direction over the period.
 *
 * @param snapshots - Array of historical snapshots.
 * @returns Estimated trend direction.
 */
export function calculateTrendDirection(snapshots: IGrowthAnalysisSnapshot[]): TrendDirection {
  if (snapshots.length < 2) return TrendDirection.InsufficientData;

  // Check if any snapshot in the sequence has insufficient data for overall score
  const hasInsufficientData = snapshots.some(s => s.overallScore.confidenceLevel === 'insufficient');
  if (hasInsufficientData) {
    return TrendDirection.InsufficientData;
  }

  const sorted = [...snapshots].sort((a, b) => a.analyzedAt.getTime() - b.analyzedAt.getTime());
  
  // Use the total change from first to last to classify trend
  const totalChange = sorted[sorted.length - 1].overallScore.value - sorted[0].overallScore.value;
  return classifyTrend(totalChange);
}

/**
 * Analyzes a historical sequence of snapshots to compute velocity, acceleration,
 * and trend direction.
 *
 * @param snapshots - Array of historical snapshots.
 * @returns A fully populated VelocityAnalysis object.
 */
export function calculateVelocity(snapshots: IGrowthAnalysisSnapshot[]): VelocityAnalysis {
  if (snapshots.length < 2) {
    return {
      weeklyGrowthRate: 0,
      monthlyGrowthRate: 0,
      averageGrowthRate: 0,
      acceleration: 0,
      consistencyOfImprovement: 0,
      estimatedTrendDirection: TrendDirection.InsufficientData,
    };
  }

  const sorted = [...snapshots].sort((a, b) => a.analyzedAt.getTime() - b.analyzedAt.getTime());

  const averageGrowthRatePerDay = calculateAverageGrowthRate(sorted);
  const weeklyGrowthRate = round2(averageGrowthRatePerDay * 7);
  const monthlyGrowthRate = round2(averageGrowthRatePerDay * 30);
  const averageGrowthRate = round2(averageGrowthRatePerDay);

  const acceleration = round2(calculateAcceleration(sorted));

  let improvements = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].overallScore.value > sorted[i - 1].overallScore.value) {
      improvements++;
    }
  }
  const consistencyOfImprovement = round2(improvements / (sorted.length - 1));

  const estimatedTrendDirection = calculateTrendDirection(sorted);

  return {
    weeklyGrowthRate,
    monthlyGrowthRate,
    averageGrowthRate,
    acceleration,
    consistencyOfImprovement,
    estimatedTrendDirection,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Round to 2 decimal places. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
