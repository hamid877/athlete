import { StimulusCategory } from './types';
import { RECOVERY_WINDOWS_HOURS } from './constants';

/**
 * Categorizes a numeric stimulus score into a classification.
 * This is an internal helper used for recovery calculations.
 * 
 * @param stimulusScore - The calculated muscle stimulus score.
 * @returns The stimulus category (low, moderate, high, extreme).
 */
function categorizeStimulus(stimulusScore: number): StimulusCategory {
  if (stimulusScore < 4) {
    return 'low';      // E.g., 3-4 isolation sets or 2-3 compound sets
  } else if (stimulusScore < 10) {
    return 'moderate'; // E.g., 6-10 working sets total for a muscle
  } else if (stimulusScore < 18) {
    return 'high';     // E.g., 10-18 working sets (heavy volume)
  } else {
    return 'extreme';  // E.g., 18+ working sets (overreaching/maximal volume)
  }
}

/**
 * Calculates the recommended recovery time for a muscle group based on the training stimulus.
 * Uses standard recovery windows (24h to 96h) depending on the magnitude of the stimulus.
 * 
 * @param stimulusScore - The relative muscle stimulus score derived from working sets.
 * @returns The recommended recovery time in hours.
 */
export function calculateRecovery(stimulusScore: number): number {
  if (stimulusScore <= 0) {
    return 0;
  }

  const category = categorizeStimulus(stimulusScore);
  return RECOVERY_WINDOWS_HOURS[category];
}
