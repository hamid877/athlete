import { WorkoutSet } from './types';

/**
 * Calculates the total volume for a given set of exercises.
 * Volume is defined as the sum of (weight × reps) across all sets.
 * 
 * @param sets - An array of workout sets containing weight and reps.
 * @returns The total workout volume in the provided weight units.
 */
export function calculateWorkoutVolume(sets: WorkoutSet[]): number {
  if (!sets || sets.length === 0) {
    return 0;
  }

  return sets.reduce((totalVolume, set) => {
    // If a set has a negative value for weight or reps, default it to 0
    const weight = Math.max(0, set.weight);
    const reps = Math.max(0, set.reps);
    
    return totalVolume + (weight * reps);
  }, 0);
}
