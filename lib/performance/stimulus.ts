import { FATIGUE_NORMALIZATION_CAP, STIMULUS_MULTIPLIERS } from './constants';
import type { CompletedExercise, CompletedWorkout, MuscleStimulus, StimulusQuality } from './types';

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

// ---------------------------------------------------------------------------
// Sprint 7.4 Muscle Stimulus Engine
// ---------------------------------------------------------------------------

/**
 * Computes the raw stimulus score for a single exercise.
 * Formula: completedSets × averageWeight × averageReps * Multiplier
 */
function computeExerciseStimulus(exercise: CompletedExercise): number {
  const doneSets = exercise.performedSets.filter((s) => s.completed);
  if (doneSets.length === 0) return 0;

  const avgWeight =
    doneSets.reduce((sum, s) => sum + s.weight, 0) / doneSets.length;
  const avgReps =
    doneSets.reduce((sum, s) => sum + s.reps, 0) / doneSets.length;
    
  const isCompound = exercise.targetMuscles.length > 1;
  const multiplier = isCompound ? STIMULUS_MULTIPLIERS.compound : STIMULUS_MULTIPLIERS.isolation;

  return (doneSets.length * avgWeight * avgReps) * multiplier;
}

export function calculateAllStimulus(workouts: CompletedWorkout[]): MuscleStimulus[] {
  // Aggregate raw stimulus by muscle
  const muscleMap = new Map<string, number>();

  for (const workout of workouts) {
    for (const ex of workout.exercises) {
      const rawStimulus = computeExerciseStimulus(ex);
      if (rawStimulus > 0) {
        for (const muscle of ex.targetMuscles) {
          const current = muscleMap.get(muscle) || 0;
          muscleMap.set(muscle, current + rawStimulus);
        }
      }
    }
  }

  // Convert raw to 0-100 normalized score and generate MuscleStimulus objects
  const results: MuscleStimulus[] = [];
  
  for (const [muscle, rawScore] of muscleMap.entries()) {
    // Normalization: 0 to FATIGUE_NORMALIZATION_CAP -> 0 to 100
    const rawPct = (rawScore / FATIGUE_NORMALIZATION_CAP) * 100;
    const stimulusScore = Math.min(100, Math.max(0, Math.round(rawPct)));

    let quality: StimulusQuality;
    let recommendation: string;

    if (stimulusScore <= 20) {
      quality = 'Very Low';
      recommendation = 'Insufficient stimulus. Increase volume or intensity for this muscle.';
    } else if (stimulusScore <= 40) {
      quality = 'Low';
      recommendation = 'Minimal stimulus. Consider adding more sets or weight.';
    } else if (stimulusScore <= 60) {
      quality = 'Good';
      recommendation = 'Solid stimulus. Adequate for maintenance or moderate growth.';
    } else if (stimulusScore <= 80) {
      quality = 'High';
      recommendation = 'Great stimulus! Ideal for muscle hypertrophy.';
    } else {
      quality = 'Excellent';
      recommendation = 'Exceptional stimulus! Ensure proper recovery before training again.';
    }

    results.push({
      muscle,
      stimulusScore,
      quality,
      recommendation,
    });
  }

  // Sort descending by score
  return results.sort((a, b) => b.stimulusScore - a.stimulusScore);
}
