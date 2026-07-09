import mongoose, { Schema, type Model } from "mongoose";
import type {
  ExerciseDocument,
  MuscleGroup,
  PrimaryMuscle,
  Equipment,
  ExerciseType,
  Difficulty,
  RecommendedExperience,
  RecommendedGoal,
} from "@/types";

/* ─── Enum arrays (single source of truth) ──────────────────── */

const MUSCLE_GROUPS: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "core",
  "legs",
  "glutes",
  "calves",
  "full_body",
  "cardio",
];

const PRIMARY_MUSCLES: PrimaryMuscle[] = [
  "pectorals",
  "upper_chest",
  "lower_chest",
  "latissimus_dorsi",
  "rhomboids",
  "trapezius",
  "rear_deltoids",
  "front_deltoids",
  "lateral_deltoids",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "obliques",
  "lower_back",
  "hip_flexors",
  "quadriceps",
  "hamstrings",
  "glutes",
  "adductors",
  "abductors",
  "calves",
  "tibialis_anterior",
  "full_body",
];

const EQUIPMENT_VALUES: Equipment[] = [
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "bodyweight",
  "kettlebell",
  "resistance_band",
  "smith_machine",
  "trap_bar",
  "ez_bar",
  "pull_up_bar",
  "dip_bars",
  "rings",
  "medicine_ball",
  "foam_roller",
  "suspension",
  "cardio_machine",
  "other",
];

const EXERCISE_TYPES: ExerciseType[] = [
  "strength",
  "hypertrophy",
  "endurance",
  "power",
  "mobility",
  "stability",
  "cardio",
  "plyometric",
  "stretching",
];

const DIFFICULTY_VALUES: Difficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
];

const RECOMMENDED_EXPERIENCE_VALUES: RecommendedExperience[] = [
  "beginner",
  "intermediate",
  "advanced",
  "all",
];

const RECOMMENDED_GOAL_VALUES: RecommendedGoal[] = [
  "strength",
  "hypertrophy",
  "fat_loss",
  "endurance",
  "general_fitness",
  "rehabilitation",
  "sport_performance",
  "all",
];

/* ─── Schema ─────────────────────────────────────────────────── */

const exerciseSchema = new Schema<ExerciseDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    primaryMuscle: {
      type: String,
      enum: PRIMARY_MUSCLES,
      required: true,
    },
    muscleGroup: {
      type: String,
      enum: MUSCLE_GROUPS,
      required: true,
    },
    secondaryMuscles: {
      type: [String],
      enum: PRIMARY_MUSCLES,
      default: [],
    },
    equipment: {
      type: String,
      enum: EQUIPMENT_VALUES,
      required: true,
    },
    exerciseType: {
      type: String,
      enum: EXERCISE_TYPES,
      required: true,
    },
    difficulty: {
      type: String,
      enum: DIFFICULTY_VALUES,
      required: true,
    },
    instructions: {
      type: [String],
      default: [],
    },
    tips: {
      type: [String],
      default: [],
    },
    videoUrl: {
      type: String,
      default: null,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    isCompound: {
      type: Boolean,
      required: true,
      default: false,
    },
    isMachine: {
      type: Boolean,
      required: true,
      default: false,
    },
    isBodyweight: {
      type: Boolean,
      required: true,
      default: false,
    },
    recommendedExperience: {
      type: String,
      enum: RECOMMENDED_EXPERIENCE_VALUES,
      required: true,
      default: "all",
    },
    recommendedGoal: {
      type: String,
      enum: RECOMMENDED_GOAL_VALUES,
      required: true,
      default: "all",
    },
  },
  {
    timestamps: true,
    collection: "exercises",
  }
);

/* ─── Indexes ────────────────────────────────────────────────── */

// Primary lookup — slug must be unique
exerciseSchema.index({ slug: 1 }, { unique: true });

// Most common browse/filter patterns
exerciseSchema.index({ muscleGroup: 1, difficulty: 1 });
exerciseSchema.index({ equipment: 1, exerciseType: 1 });
exerciseSchema.index({ primaryMuscle: 1 });
exerciseSchema.index({ recommendedExperience: 1, recommendedGoal: 1 });
exerciseSchema.index({ isCompound: 1, muscleGroup: 1 });

// Full-text search on name for search-as-you-type
exerciseSchema.index({ name: "text" });

/* ─── Model (hot-reload safe) ────────────────────────────────── */

const Exercise: Model<ExerciseDocument> =
  mongoose.models.Exercise ??
  mongoose.model<ExerciseDocument>("Exercise", exerciseSchema);

export default Exercise;
