/**
 * Standard Metabolic Equivalent of Task (MET) values for different weightlifting intensities.
 * Based on the Compendium of Physical Activities.
 */
export const MET_VALUES = {
  light: 3.0,     // Light effort (e.g., bodyweight exercises, light dumbbell training)
  moderate: 5.0,  // Moderate effort (e.g., standard resistance training)
  vigorous: 6.0,  // Vigorous effort (e.g., powerlifting, intense bodybuilding, minimal rest)
} as const;

/**
 * Multipliers for determining muscle stimulus based on exercise type.
 * Compound exercises involve multiple joints/muscle groups and generally provide higher central stimulus.
 */
export const STIMULUS_MULTIPLIERS = {
  compound: 1.0,
  isolation: 0.6,
} as const;

/**
 * Standard recovery windows in hours required based on muscle stimulus categories.
 */
export const RECOVERY_WINDOWS_HOURS = {
  low: 24,       // Active recovery or light stimulus
  moderate: 48,  // Standard working stimulus
  high: 72,      // High volume/intensity stimulus
  extreme: 96,   // Very heavy eccentric or maximal effort stimulus
} as const;

/**
 * Default full-recovery times (in hours) for each muscle group.
 * Based on standard exercise science guidelines for natural athletes.
 * These are the baseline times assuming a normally fatiguing stimulus.
 */
export const DEFAULT_RECOVERY_TIMES_HOURS: Record<string, number> = {
  Chest: 48,
  'Upper Chest': 48,
  Back: 48,
  Lats: 48,
  'Front Delts': 36,
  'Side Delts': 36,
  'Rear Delts': 36,
  Biceps: 24,
  Triceps: 24,
  Forearms: 24,
  Core: 24,
  Quads: 72,
  Hamstrings: 72,
  Glutes: 72,
  Calves: 24,
};

/**
 * Minimum raw fatigue score for a muscle to be considered meaningfully fatigued.
 * Scores below this threshold are treated as no fatigue.
 */
export const FATIGUE_FLOOR = 0.01;

/**
 * Normalization cap for the raw fatigue formula (sets × avgWeight × avgReps).
 * A score at or above this value maps to a full 0% initial recovery (maximum fatigue).
 * Tuned for a typical heavy compound set: ~4 sets × 100 kg × 8 reps = 3200.
 */
export const FATIGUE_NORMALIZATION_CAP = 3200;

/**
 * Default bodyweight (kg) used for calorie calculations if user weight is unknown.
 */
export const DEFAULT_BODYWEIGHT_KG = 70;
