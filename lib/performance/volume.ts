import { WorkoutSet, CompletedWorkout, MuscleVolume, VolumeStatus } from './types';

// Target constants for weekly volume
export const VOLUME_TARGETS = {
  MIN_OPTIMAL: 10,
  MAX_OPTIMAL: 20,
};

/**
 * Evaluates the total weekly sets for a muscle group and returns its status and recommendation.
 */
function evaluateVolumeStatus(sets: number): { status: VolumeStatus; recommendation: string } {
  if (sets <= 5) return { status: 'Very Low', recommendation: 'Consider adding more volume to stimulate growth.' };
  if (sets <= 9) return { status: 'Low', recommendation: 'You are slightly below optimal. Add 1-2 exercises.' };
  if (sets <= 20) return { status: 'Optimal', recommendation: 'In the sweet spot for hypertrophy and strength.' };
  if (sets <= 25) return { status: 'High', recommendation: 'Monitor your recovery. You are pushing your limits.' };
  return { status: 'Excessive', recommendation: 'High risk of overtraining. Deload recommended.' };
}

/**
 * Analyzes completed workouts over a period (e.g., 7 days) and calculates the total sets per muscle.
 * 
 * @param workouts - An array of completed workouts.
 * @returns An array of MuscleVolume objects with calculated sets and status.
 */
export function analyzeWeeklyVolume(workouts: CompletedWorkout[]): MuscleVolume[] {
  const muscleSets = new Map<string, number>();

  workouts.forEach(workout => {
    workout.exercises.forEach(exercise => {
      // Calculate how many valid, completed sets were performed in this exercise
      const validSets = exercise.performedSets.filter(s => s.completed && s.reps > 0 && s.weight >= 0).length;
      if (validSets > 0) {
        // Distribute or assign sets to targeted muscles. 
        // Here, we count the full sets for every target muscle of the exercise.
        exercise.targetMuscles.forEach(muscle => {
          const currentSets = muscleSets.get(muscle) || 0;
          muscleSets.set(muscle, currentSets + validSets);
        });
      }
    });
  });

  const results: MuscleVolume[] = [];
  muscleSets.forEach((sets, muscle) => {
    const { status, recommendation } = evaluateVolumeStatus(sets);
    results.push({
      muscle,
      weeklySets: sets,
      targetMin: VOLUME_TARGETS.MIN_OPTIMAL,
      targetMax: VOLUME_TARGETS.MAX_OPTIMAL,
      status,
      recommendation,
    });
  });

  // Sort by weeklySets descending, then alphabetically
  return results.sort((a, b) => {
    if (b.weeklySets !== a.weeklySets) return b.weeklySets - a.weeklySets;
    return a.muscle.localeCompare(b.muscle);
  });
}

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
