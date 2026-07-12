import { WorkoutIntensity } from './types';
import { MET_VALUES, DEFAULT_BODYWEIGHT_KG } from './constants';

/**
 * Calculates the estimated calories burned during a workout based on MET value, body weight, and duration.
 * Uses the formula: Calories = MET × Bodyweight(kg) × Time(hours)
 * 
 * @param durationMinutes - The duration of the workout in minutes.
 * @param bodyWeightKg - The body weight of the user in kilograms (defaults to 70kg).
 * @param intensity - The subjective intensity of the workout ('light', 'moderate', 'vigorous').
 * @returns The estimated total calories burned.
 */
export function calculateCalories(
  durationMinutes: number,
  bodyWeightKg: number = DEFAULT_BODYWEIGHT_KG,
  intensity: WorkoutIntensity = 'moderate'
): number {
  if (durationMinutes <= 0) {
    return 0;
  }

  // Ensure body weight is positive
  const weight = Math.max(1, bodyWeightKg);
  
  const metValue = MET_VALUES[intensity];
  const durationHours = durationMinutes / 60;

  // Formula: kcal = METs * weight in kg * time in hours
  const calories = metValue * weight * durationHours;

  return Math.round(calories);
}
