import { STIMULUS_MULTIPLIERS } from './constants';

/**
 * Calculates a relative muscle stimulus score based on the number of working sets
 * and whether the exercise is compound or isolation.
 * 
 * @param workingSets - The number of effective working sets completed.
 * @param isCompound - True if the exercise is a compound movement (e.g., squat, bench press).
 * @returns A numeric score representing the training stimulus applied.
 */
export function calculateMuscleStimulus(workingSets: number, isCompound: boolean): number {
  if (workingSets <= 0) {
    return 0;
  }

  const multiplier = isCompound ? STIMULUS_MULTIPLIERS.compound : STIMULUS_MULTIPLIERS.isolation;
  
  // Base stimulus calculation: sets * exercise type multiplier
  // Future enhancements could include factors for RPE (Rate of Perceived Exertion)
  const stimulusScore = workingSets * multiplier;

  // Returning rounded score to 1 decimal place to prevent floating point inaccuracies
  return Math.round(stimulusScore * 10) / 10;
}
