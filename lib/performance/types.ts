/**
 * Defines the structure for a single set used in volume calculations.
 */
export interface WorkoutSet {
  weight: number;
  reps: number;
}

/**
 * Defines the output of the progress projection calculation.
 */
export interface ProjectionResult {
  min: number;
  max: number;
}

/**
 * Supported workout intensity levels for metabolic equivalent (MET) calculations.
 */
export type WorkoutIntensity = 'light' | 'moderate' | 'vigorous';

/**
 * Supported stimulus categories for muscle recovery estimation.
 */
export type StimulusCategory = 'low' | 'moderate' | 'high' | 'extreme';
