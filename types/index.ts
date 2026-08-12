import type { Types } from "mongoose";

export type Gender = "male" | "female" | "other" | "prefer-not-to-say";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type UnitPreference = "metric" | "imperial";
export type GoalType = "weight" | "bodyFat" | "strength" | "nutrition" | "habit";
export type GoalStatus = "active" | "achieved" | "abandoned";

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface UserDocument {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  image?: string;
  dateOfBirth: Date;
  gender: Gender;
  heightCm: number;
  activityLevel: ActivityLevel;
  experienceLevel: ExperienceLevel;
  unitPreference: UnitPreference;
  onboardingCompleted: boolean;
  profileCompleted: boolean;
  age?: number;
  weightKg?: number;
  fitnessGoal?: string;
  yearsOfLifting?: number;
  workoutDaysPerWeek?: number;
  workoutLocation?: "gym" | "home";
  injuries?: string;
  medicalConditions?: string;
  nutritionTargets?: NutritionTargets;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeightLogDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  date: Date;
  weightKg: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: GoalType;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  targetDate?: Date;
  status: GoalStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingData {
  dateOfBirth: string;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  experienceLevel: ExperienceLevel;
  unitPreference: UnitPreference;
  goalType: GoalType;
  goalTitle: string;
  goalTargetValue: number;
  goalUnit: string;
}

export interface DailyNutritionDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  dateString: string; // Format: YYYY-MM-DD
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MealDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  dateString: string; // Format: YYYY-MM-DD
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: Date;
  updatedAt: Date;
}

/* ─── Exercise ──────────────────────────────────────────────── */

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "core"
  | "legs"
  | "glutes"
  | "calves"
  | "full_body"
  | "cardio";

export type PrimaryMuscle =
  | "pectorals"
  | "upper_chest"
  | "lower_chest"
  | "latissimus_dorsi"
  | "rhomboids"
  | "trapezius"
  | "rear_deltoids"
  | "front_deltoids"
  | "lateral_deltoids"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "lower_back"
  | "hip_flexors"
  | "quadriceps"
  | "hamstrings"
  | "glutes"
  | "adductors"
  | "abductors"
  | "calves"
  | "tibialis_anterior"
  | "full_body";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "cable"
  | "machine"
  | "bodyweight"
  | "kettlebell"
  | "resistance_band"
  | "smith_machine"
  | "trap_bar"
  | "ez_bar"
  | "pull_up_bar"
  | "dip_bars"
  | "rings"
  | "medicine_ball"
  | "foam_roller"
  | "suspension"
  | "cardio_machine"
  | "other";

export type ExerciseType =
  | "strength"
  | "hypertrophy"
  | "endurance"
  | "power"
  | "mobility"
  | "stability"
  | "cardio"
  | "plyometric"
  | "stretching";

export type Difficulty = "beginner" | "intermediate" | "advanced" | "expert";

export type RecommendedExperience =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "all";

export type RecommendedGoal =
  | "strength"
  | "hypertrophy"
  | "fat_loss"
  | "endurance"
  | "general_fitness"
  | "rehabilitation"
  | "sport_performance"
  | "all";

export type WorkoutSplit =
  | "push"
  | "pull"
  | "legs"
  | "upper"
  | "lower"
  | "full_body"
  | "cardio";

export type WeightInputType =
  | "TOTAL_WEIGHT"
  | "PER_DUMBBELL"
  | "MACHINE_STACK"
  | "PLATE_LOADED"
  | "BODYWEIGHT"
  | "BODYWEIGHT_PLUS";

export interface ExerciseDocument {
  _id: Types.ObjectId;
  /** Human-readable name, e.g. "Barbell Back Squat" */
  name: string;
  /** URL-safe unique identifier, e.g. "barbell-back-squat" */
  slug: string;
  /** Primary muscle targeted */
  split: WorkoutSplit[];
  primaryMuscle: PrimaryMuscle;
  /** Top-level muscle group for browsing/filtering */
  muscleGroup: MuscleGroup;
  /** Additional muscles worked */
  secondaryMuscles: PrimaryMuscle[];
  /** Required equipment */
  equipment: Equipment;
  /** Format for entering weight (e.g. per dumbbell, total, machine) */
  weightInputType: WeightInputType;
  /** Training stimulus / exercise category */
  exerciseType: ExerciseType;
  /** Technical difficulty */
  difficulty: Difficulty;
  /** Step-by-step execution cues */
  instructions: string[];
  /** Form tips, common mistakes, coaching cues */
  tips: string[];
  /** Optional YouTube / video URL */
  videoUrl?: string;
  /** Optional thumbnail / demonstration image URL */
  imageUrl?: string;
  /** True if the exercise recruits multiple joint systems (e.g. squat, deadlift) */
  isCompound: boolean;
  /** True if performed on a fixed-path machine */
  isMachine: boolean;
  /** True if no external load is required */
  isBodyweight: boolean;
  /** Minimum experience level recommended before attempting */
  recommendedExperience: RecommendedExperience;
  /** Primary training goal this exercise serves */
  recommendedGoal: RecommendedGoal;
  createdAt: Date;
  updatedAt: Date;
}
