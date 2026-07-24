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

export interface RepRange {
  min: number;
  max: number;
}

// ---------------------------------------------------------------------------
// Recovery Engine Types
// ---------------------------------------------------------------------------

/**
 * The recovery status of a muscle group.
 * - `Recovered`  : >= 100% recovery, ready to train.
 * - `Recovering` : < 100% recovery, still fatigued.
 */
export type RecoveryStatus = 'Recovered' | 'Recovering';

/**
 * Recovery details for a single muscle group.
 */
export interface RecoveryMuscle {
  /** The canonical muscle name, e.g. "Chest", "Quads". */
  muscle: string;
  /** Recovery percentage clamped between 0 and 100. */
  recovery: number;
  /** Whether the muscle is fully recovered or still recovering. */
  status: RecoveryStatus;
  /** Estimated hours remaining until full recovery. 0 if already recovered. */
  hoursRemaining: number;
}

/**
 * A single set within a completed exercise.
 * Only sets where `completed === true` contribute to fatigue.
 */
export interface CompletedSet {
  weight: number;
  reps: number;
  completed: boolean;
}

/**
 * A completed exercise within a workout session.
 * `targetMuscles` maps to the canonical muscle names defined in DEFAULT_RECOVERY_TIMES_HOURS.
 */
export interface CompletedExercise {
  name: string;
  /** Canonical muscle names this exercise primarily targets. */
  targetMuscles: string[];
  performedSets: CompletedSet[];
}

/**
 * A completed workout session, consumed by the recovery engine.
 */
export interface CompletedWorkout {
  /** The UTC date/time when the workout ended (ISO string or Date). */
  completedAt: Date | string;
  exercises: CompletedExercise[];
}

/**
 * The workout split recommendation derived from current muscle recovery states.
 */
export interface WorkoutRecommendation {
  /** Suggested split name, e.g. "Push", "Pull", "Legs", "Upper Body", "Full Body". */
  workout: string;
  /** Human-readable reasoning behind the recommendation. */
  reason: string;
}

/**
 * The full output of `calculateAllRecovery()`.
 */
export interface RecoveryResult {
  muscles: RecoveryMuscle[];
  recommendation: WorkoutRecommendation;
}

// ---------------------------------------------------------------------------
// Volume Engine Types
// ---------------------------------------------------------------------------

export type VolumeStatus = 'Very Low' | 'Low' | 'Optimal' | 'High' | 'Excessive';

export interface MuscleVolume {
  muscle: string;
  weeklySets: number;
  targetMin: number;
  targetMax: number;
  status: VolumeStatus;
  recommendation: string;
}

// ---------------------------------------------------------------------------
// Stimulus Engine Types
// ---------------------------------------------------------------------------

export type StimulusQuality = 'Very Low' | 'Low' | 'Good' | 'High' | 'Excellent';

export interface MuscleStimulus {
  muscle: string;
  stimulusScore: number;
  quality: StimulusQuality;
  recommendation: string;
}
