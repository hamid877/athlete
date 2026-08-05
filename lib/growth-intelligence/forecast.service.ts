/**
 * @file forecast.service.ts
 * @module lib/growth-intelligence
 * @description
 *   Forecast Engine — projects future Growth Intelligence scores based on
 *   historical velocity and momentum.
 *
 *   ─── Responsibilities ────────────────────────────────────────────────────
 *   This service uses historical snapshots and the Velocity Engine to project
 *   future performance. It calculates projected scores at future dates, estimates
 *   the time required to hit specific targets or milestones, and quantifies
 *   the confidence of these predictions.
 */

import type { IGrowthAnalysisSnapshot } from '@/models/GrowthAnalysisSnapshot';
import { calculateVelocity, type VelocityAnalysis } from './velocity.service';
import { TrendDirection } from './comparison.service';
import { clampScore, clampConfidence } from './helpers';

// ─────────────────────────────────────────────────────────────────────────────
// Public Interfaces
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The complete result of a forecast analysis.
 */
export interface ForecastAnalysis {
  /** The projected Growth Index (score) at the forecastDate. */
  projectedGrowthIndex: number;
  /** The anticipated weekly growth rate used for this projection. */
  projectedWeeklyGrowth: number;
  /** 
   * Estimated number of weeks to hit a user-defined target GI.
   * `null` if the target is unreachable based on current trajectory.
   */
  estimatedWeeksToTarget: number | null;
  /** Confidence in the forecast, [0, 1]. */
  confidence: number;
  /** Human-readable statements explaining the constraints of the forecast. */
  assumptions: string[];
  /** The future date this forecast is projecting towards. */
  forecastDate: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ─────────────────────────────────────────────────────────────────────────────
// Public Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates a confidence score [0, 1] for a forecast based on the volume of
 * historical data and the consistency of past improvement.
 *
 * @param snapshots - Array of historical snapshots.
 * @param velocity  - Pre-calculated velocity analysis.
 * @returns A confidence score between 0 and 1.
 */
export function calculateForecastConfidence(
  snapshots: IGrowthAnalysisSnapshot[],
  velocity: VelocityAnalysis
): number {
  if (snapshots.length < 3) return 0;
  if (velocity.estimatedTrendDirection === TrendDirection.InsufficientData) return 0;

  // Data volume contribution: scales linearly up to 12 snapshots (approx 3 months), max 0.7 weight
  const dataVolumeConfidence = Math.min(snapshots.length / 12, 1) * 0.7;

  // Consistency contribution: scales by how reliably the user improved, max 0.3 weight
  const consistencyConfidence = velocity.consistencyOfImprovement * 0.3;

  // Base confidence is diminished if acceleration is highly negative (volatile deceleration)
  const stabilityPenalty = velocity.acceleration < -2 ? 0.1 : 0;

  const rawConfidence = dataVolumeConfidence + consistencyConfidence - stabilityPenalty;
  return clampConfidence(rawConfidence);
}

/**
 * Estimates the time required to reach a specific target Growth Index.
 *
 * @param currentGI - The latest Growth Index (score).
 * @param targetGI  - The goal Growth Index.
 * @param velocity  - Pre-calculated velocity analysis.
 * @returns Estimated number of weeks, or null if trajectory never hits target.
 */
export function estimateTimeToTargetGI(
  currentGI: number,
  targetGI: number,
  velocity: VelocityAnalysis
): number | null {
  const delta = targetGI - currentGI;

  // Already reached
  if (delta <= 0 && velocity.weeklyGrowthRate >= 0) return 0;

  // Wrong direction or stagnant
  if (delta > 0 && velocity.weeklyGrowthRate <= 0) return null;
  if (delta < 0 && velocity.weeklyGrowthRate >= 0) return null;

  return Math.abs(delta / velocity.weeklyGrowthRate);
}

/**
 * Identifies the next logical milestone (e.g., reaching the next decile).
 *
 * @param currentGI - The latest Growth Index (score).
 * @returns The next milestone target (e.g., 72 -> 80).
 */
export function estimateNextMilestone(currentGI: number): number {
  if (currentGI >= 100) return 100;
  return Math.min(Math.floor(currentGI / 10) * 10 + 10, 100);
}

/**
 * Generates a full forecast projection for a specific future date and optional target.
 *
 * @param snapshots  - Array of historical snapshots.
 * @param targetDate - The future date to project to.
 * @param targetGI   - Optional goal score to calculate time-to-target.
 * @returns A fully populated ForecastAnalysis object.
 */
export function forecastGrowthIndex(
  snapshots: IGrowthAnalysisSnapshot[],
  targetDate: Date,
  targetGI?: number
): ForecastAnalysis {
  const sorted = [...snapshots].sort((a, b) => a.analyzedAt.getTime() - b.analyzedAt.getTime());
  
  if (sorted.length === 0) {
    return {
      projectedGrowthIndex: 0,
      projectedWeeklyGrowth: 0,
      estimatedWeeksToTarget: null,
      confidence: 0,
      assumptions: ['Insufficient data to generate a forecast.'],
      forecastDate: targetDate,
    };
  }

  const latestSnapshot = sorted[sorted.length - 1];
  const currentGI = latestSnapshot.overallScore.value;
  const velocity = calculateVelocity(sorted);

  const daysInFuture = Math.max(0, (targetDate.getTime() - latestSnapshot.analyzedAt.getTime()) / MS_PER_DAY);
  
  // Projection is based on simple linear extrapolation using average growth rate
  const projectedChange = velocity.averageGrowthRate * daysInFuture;
  const projectedGrowthIndex = clampScore(currentGI + projectedChange);

  // Time to target calculation
  let estimatedWeeksToTarget = null;
  if (targetGI !== undefined) {
    const rawWeeks = estimateTimeToTargetGI(currentGI, targetGI, velocity);
    if (rawWeeks !== null) {
      estimatedWeeksToTarget = Math.round(rawWeeks * 10) / 10;
    }
  } else {
    // If no target provided, estimate time to next standard milestone
    const nextMilestone = estimateNextMilestone(currentGI);
    const rawWeeks = estimateTimeToTargetGI(currentGI, nextMilestone, velocity);
    if (rawWeeks !== null) {
      estimatedWeeksToTarget = Math.round(rawWeeks * 10) / 10;
    }
  }

  const confidence = calculateForecastConfidence(sorted, velocity);

  // Build natural language assumptions
  const assumptions = [
    `Assumes historical growth rate of ${velocity.weeklyGrowthRate > 0 ? '+' : ''}${velocity.weeklyGrowthRate} pts/week remains constant.`,
    `Assumes training consistency and volume align with historical patterns.`
  ];
  if (velocity.acceleration < 0) {
    assumptions.push(`Note: Recent deceleration detected; projections may be optimistic if trend worsens.`);
  }

  return {
    projectedGrowthIndex,
    projectedWeeklyGrowth: velocity.weeklyGrowthRate,
    estimatedWeeksToTarget,
    confidence,
    assumptions,
    forecastDate: targetDate,
  };
}
