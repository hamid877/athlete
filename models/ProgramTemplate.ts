import mongoose, { Schema, type Document, type Model } from "mongoose";

export const SPLIT_TYPES = [
  "push_pull_legs",
  "bro_split",
  "upper_lower",
  "full_body",
  "arnold",
  "custom",
] as const;

export type SplitType = (typeof SPLIT_TYPES)[number];

export interface IWorkoutTemplateExercise {
  exerciseSlug: string;
  order: number;
  sets: number;
  repRange: {
    min: number;
    max: number;
  };
  rest: number;
}

export interface IWorkoutTemplate {
  name: string;
  isRestDay: boolean;
  exercises: IWorkoutTemplateExercise[];
}

export interface IProgramTemplateDay {
  day:
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday"
    | "Sunday";
  workout: IWorkoutTemplate | null;
  isRestDay: boolean;
}

export interface IProgramTemplate extends Document {
  name: string;
  splitType: SplitType;
  description?: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  goal: "strength" | "hypertrophy" | "fat_loss" | "endurance" | "general_fitness" | "rehabilitation" | "sport_performance" | "all";
  daysPerWeek: number;
  estimatedSessionMinutes: number;
  tags: string[];
  coverImage?: string;
  version: string;
  workoutDays: IProgramTemplateDay[];
  createdAt: Date;
  updatedAt: Date;
}

const workoutTemplateExerciseSchema = new Schema<IWorkoutTemplateExercise>(
  {
    exerciseSlug: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
    sets: {
      type: Number,
      default: 3,
    },
    repRange: {
      min: {
        type: Number,
        default: 8,
      },
      max: {
        type: Number,
        default: 12,
      },
    },
    rest: {
      type: Number,
      default: 90,
    },
  },
  {
    _id: false,
  }
);

const workoutTemplateSchema = new Schema<IWorkoutTemplate>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isRestDay: {
      type: Boolean,
      default: false,
    },
    exercises: {
      type: [workoutTemplateExerciseSchema],
      default: [],
    },
  },
  {
    _id: false,
  }
);

const programTemplateDaySchema = new Schema<IProgramTemplateDay>(
  {
    day: {
      type: String,
      required: true,
    },
    isRestDay: {
      type: Boolean,
      default: false,
    },
    workout: {
      type: workoutTemplateSchema,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const programTemplateSchema = new Schema<IProgramTemplate>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    splitType: {
      type: String,
      enum: SPLIT_TYPES,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "expert"],
      required: true,
    },
    goal: {
      type: String,
      enum: ["strength", "hypertrophy", "fat_loss", "endurance", "general_fitness", "rehabilitation", "sport_performance", "all"],
      required: true,
    },
    daysPerWeek: {
      type: Number,
      required: true,
      min: 1,
      max: 7,
    },
    estimatedSessionMinutes: {
      type: Number,
      required: true,
      default: 60,
    },
    tags: {
      type: [String],
      default: [],
    },
    coverImage: {
      type: String,
      default: null,
    },
    version: {
      type: String,
      required: true,
      default: "1.0",
    },
    workoutDays: {
      type: [programTemplateDaySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "programTemplates",
  }
);

const ProgramTemplate: Model<IProgramTemplate> =
  mongoose.models.ProgramTemplate ??
  mongoose.model<IProgramTemplate>("ProgramTemplate", programTemplateSchema);

export default ProgramTemplate;
