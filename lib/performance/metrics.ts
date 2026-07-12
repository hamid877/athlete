import { calculateMuscleStimulus } from "./stimulus";
import { calculateRecovery } from "./recovery";

/**
 * Calculates the training density of a session.
 * Formula: Total Volume (kg) / Duration (minutes)
 */
export function calculateTrainingDensity(volume: number, durationMinutes: number): number {
  if (durationMinutes <= 0) return 0;
  return Math.round((volume / durationMinutes) * 10) / 10;
}

/**
 * Calculates the session intensity.
 * Formula: Total Working Sets / Duration (minutes)
 */
export function calculateSessionIntensity(workingSets: number, durationMinutes: number): number {
  if (durationMinutes <= 0) return 0;
  return Math.round((workingSets / durationMinutes) * 100) / 100;
}

/**
 * Calculates the overall workout quality score (0-100) and returns a classification.
 * A simple heuristic based on normalized volume and intensity.
 */
export function calculateWorkoutQuality(
  volume: number,
  durationMinutes: number,
  totalSets: number
): { score: number; rating: string } {
  // Edge cases
  if (durationMinutes <= 0 || totalSets <= 0) {
    return { score: 0, rating: "Poor" };
  }

  const density = calculateTrainingDensity(volume, durationMinutes);
  const intensity = calculateSessionIntensity(totalSets, durationMinutes);

  // Example heuristic weighting:
  // Density accounts for 60% of the score. (Assuming ~100 kg/min is great).
  // Intensity accounts for 40% of the score. (Assuming ~0.5 sets/min is great).
  
  // Normalize components to roughly 0-100
  let densityScore = (density / 100) * 100;
  let intensityScore = (intensity / 0.5) * 100;

  // Cap at 100
  densityScore = Math.min(densityScore, 100);
  intensityScore = Math.min(intensityScore, 100);

  const finalScore = Math.round((densityScore * 0.6) + (intensityScore * 0.4));
  const boundedScore = Math.min(Math.max(finalScore, 0), 100);

  let rating = "Poor";
  if (boundedScore >= 90) rating = "Elite";
  else if (boundedScore >= 75) rating = "Excellent";
  else if (boundedScore >= 50) rating = "Good";
  else if (boundedScore >= 30) rating = "Average";

  return { score: boundedScore, rating };
}

/**
 * Aggregates muscle stimulus across an entire workout session.
 * Identifies the top 3 muscles hit and provides an overall recovery estimate.
 */
export function aggregateSessionStimulus(
  exercises: {
    performedSets: { completed: boolean }[];
    exerciseId?: { name: string; isCompound?: boolean; primaryMuscle?: string; muscleGroup?: string } | null;
  }[]
) {
  const stimulusMap = new Map<string, number>();

  exercises.forEach((ex) => {
    if (!ex.exerciseId) return;
    
    // Default values if not populated
    const isCompound = ex.exerciseId.isCompound || false;
    const primaryMuscle = ex.exerciseId.primaryMuscle || "Unknown";
    
    const workingSets = ex.performedSets.filter((s) => s.completed).length;
    if (workingSets === 0) return;

    const stimulus = calculateMuscleStimulus(workingSets, isCompound);

    const currentStimulus = stimulusMap.get(primaryMuscle) || 0;
    stimulusMap.set(primaryMuscle, currentStimulus + stimulus);
  });

  const sortedMuscles = Array.from(stimulusMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([muscle, score]) => ({ muscle, score }));

  const top3Muscles = sortedMuscles.slice(0, 3);
  
  // Overall recovery based on the most stimulated primary muscle
  const maxStimulus = sortedMuscles.length > 0 ? sortedMuscles[0].score : 0;
  const primaryRecoveryHours = calculateRecovery(maxStimulus);

  return {
    top3Muscles,
    primaryRecoveryHours,
    totalMusclesTargeted: sortedMuscles.length
  };
}
