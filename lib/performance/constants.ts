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
 * Default bodyweight (kg) used for calorie calculations if user weight is unknown.
 */
export const DEFAULT_BODYWEIGHT_KG = 70;
