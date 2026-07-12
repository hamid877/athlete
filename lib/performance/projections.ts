import { ProjectionResult } from './types';

/**
 * Calculates a projected progress range based on an initial value and a timeframe in weeks.
 * Applies an evidence-based approximation for strength/hypertrophy gains.
 * 
 * Standard approximation: 
 * - Minimum projected gain: 0.25% improvement per week
 * - Maximum projected gain: 1.00% improvement per week
 * (Note: Beginners might progress faster, while advanced athletes progress slower. 
 * This model serves as a generalized moderate approximation.)
 * 
 * @param currentValue - The current metric value (e.g., 1RM in kg, max volume).
 * @param weeks - The number of weeks into the future for the projection.
 * @returns An object containing the min and max projected values.
 */
export function calculateProgressProjection(currentValue: number, weeks: number): ProjectionResult {
  if (currentValue <= 0 || weeks <= 0) {
    return { min: currentValue, max: currentValue };
  }

  const minWeeklyGrowthRate = 1.0025; // 0.25% per week
  const maxWeeklyGrowthRate = 1.0100; // 1.00% per week

  // Calculate compound interest for the given number of weeks
  const minProjected = currentValue * Math.pow(minWeeklyGrowthRate, weeks);
  const maxProjected = currentValue * Math.pow(maxWeeklyGrowthRate, weeks);

  // Round results to 1 decimal place for readability
  return {
    min: Math.round(minProjected * 10) / 10,
    max: Math.round(maxProjected * 10) / 10,
  };
}
