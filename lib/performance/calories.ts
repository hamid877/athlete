export interface CalorieSet {
  weight: number;
  reps: number;
}

export interface CalorieExercise {
  isCompound: boolean;
  isMachine: boolean;
  isBodyweight: boolean;
  sets: CalorieSet[];
}

export interface CalorieEstimationParams {
  bodyweightKg: number;
  durationMinutes: number;
  exercises: CalorieExercise[];
}

/**
 * Calculates the estimated calories burned during a resistance training session.
 * Does not solely rely on MET. Incorporates work volume, exercise types, and density.
 */
export function calculateCalories(params: CalorieEstimationParams): number {
  const { bodyweightKg, durationMinutes, exercises } = params;

  if (durationMinutes <= 0 || bodyweightKg <= 0) {
    return 0;
  }

  // 1. Base Resting/Light Activity Burn (MET = 1.5 for rest periods and minimal movement)
  // Formula: kcal = Duration(min) * (MET * 3.5 * Bodyweight(kg)) / 200
  const BASE_MET = 1.5;
  const baseCalories = durationMinutes * ((BASE_MET * 3.5 * bodyweightKg) / 200);

  // 2. Active Work Burn (from sets)
  let totalSets = 0;
  let activeCalories = 0;

  for (const exercise of exercises) {
    const isCompound = exercise.isCompound;
    const isMachine = exercise.isMachine;
    const isBodyweight = exercise.isBodyweight;

    for (const set of exercise.sets) {
      if (set.reps <= 0) continue;
      totalSets++;

      // Effective weight lifted
      // If it's a bodyweight exercise, we assume they lift ~70% of their bodyweight + any added weight.
      let effectiveWeight = set.weight;
      if (isBodyweight) {
        effectiveWeight += bodyweightKg * 0.7;
      }

      // Base burn per set just for moving into position and executing
      const baseSetBurn = 1.5;

      // Work burn based on volume (weight * reps)
      // Assuming rough mechanical efficiency and average range of motion
      // A typical factor is ~0.003 kcal per kg lifted.
      const volume = effectiveWeight * set.reps;
      const workBurn = volume * 0.003;

      let setCalories = baseSetBurn + workBurn;

      // Multipliers for physiological demands
      if (isCompound) {
        // Compound movements recruit more muscle mass
        setCalories *= 1.4;
      } else {
        // Isolation movements
        setCalories *= 0.9;
      }

      if (!isMachine) {
        // Free weights require more stabilizing muscle activation
        setCalories *= 1.15;
      }

      activeCalories += setCalories;
    }
  }

  // 3. Density Multiplier
  // Density = sets per minute.
  // Higher density keeps heart rate up, increasing EPOC and intra-workout aerobic cost.
  let densityMultiplier = 1.0;
  if (durationMinutes > 0 && totalSets > 0) {
    const setsPerMinute = totalSets / durationMinutes;
    
    if (setsPerMinute > 0.5) {
      // e.g. 1 set every 2 minutes or faster
      densityMultiplier = 1.15;
    } else if (setsPerMinute > 0.3) {
      // e.g. 1 set every 3 minutes
      densityMultiplier = 1.05;
    } else if (setsPerMinute < 0.15) {
      // e.g. lots of rest, powerlifting style
      densityMultiplier = 0.95;
    }
  }

  const totalCalories = baseCalories + (activeCalories * densityMultiplier);

  return Math.round(totalCalories);
}
