
import type { RepRange } from "./types";


export type ProgressionRecommendation = "Increase" | "Maintain" | "Decrease";

export interface ProgressionResult {
  recommendation: ProgressionRecommendation;
  suggestedWeight: number;
  confidence: number;
  reason: string;
}

export interface ProgressionExercise {
  performedSets: {
    weight: number;
    reps: number;
    completed: boolean;
  }[];
}

export function getProgressionRecommendation(
  previousExercise: ProgressionExercise | null,
  currentExercise: ProgressionExercise,
  plannedRepRange: RepRange,
  isLowerBody = false
): ProgressionResult {
  const completedSets = currentExercise.performedSets.filter((set) => set.completed);

  if (completedSets.length === 0) {
    return {
      recommendation: "Maintain",
      suggestedWeight: 0,
      confidence: 0,
      reason: "No completed sets to evaluate progression.",
    };
  }

  // Find the maximum weight used in the current session
  const maxWeight = Math.max(...completedSets.map((set) => set.weight));

  // Check if every planned set reached the top of the rep range
  const allHitMax = completedSets.every((set) => set.reps >= plannedRepRange.max);
  
  // Check if any set fell below the minimum rep range
  const anyFellBelowMin = completedSets.some((set) => set.reps < plannedRepRange.min);

  const increment = isLowerBody ? 5 : 2.5;

  if (allHitMax) {
    return {
      recommendation: "Increase",
      suggestedWeight: maxWeight + increment,
      confidence: 0.9,
      reason: `You hit the top of your rep range (${plannedRepRange.max} reps) for all sets. It's time to increase the weight!`,
    };
  }

  if (anyFellBelowMin) {
    return {
      recommendation: "Decrease",
      suggestedWeight: Math.max(0, maxWeight - increment),
      confidence: 0.8,
      reason: `You fell below your minimum rep range (${plannedRepRange.min} reps). Consider lowering the weight slightly to maintain good form.`,
    };
  }

  return {
    recommendation: "Maintain",
    suggestedWeight: maxWeight,
    confidence: 0.85,
    reason: `You stayed within your rep range (${plannedRepRange.min}-${plannedRepRange.max} reps). Maintain this weight until you can hit the top range for all sets.`,
  };
}
