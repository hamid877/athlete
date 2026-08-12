import mongoose, { Schema } from "mongoose";

export const SPLIT_TYPES = [
  "push_pull_legs",
  "bro_split",
  "upper_lower",
  "full_body",
  "arnold",
  "custom",
] as const;

export type SplitType = (typeof SPLIT_TYPES)[number];

interface WorkoutDay {
  day:
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday"
    | "Sunday";


  workoutId: mongoose.Types.ObjectId | null;

  isRestDay: boolean;
}


export interface TrainingProgramDocument
  extends mongoose.Document {

  userId: mongoose.Types.ObjectId;

  name: string;

  splitType?: SplitType;

  isActive: boolean;

  activatedAt?: Date;

  workoutDays: WorkoutDay[];

  description?: string;

  templateId?: mongoose.Types.ObjectId | null;

  isArchived: boolean;
}

const workoutDaySchema = new Schema(
  {
    day: {
      type: String,
      required: true,
    },
    isRestDay: {
      type: Boolean,
      default: false,
    },
    workoutId: {
      type: Schema.Types.ObjectId,
      ref: "Workout",
      default: null,
    },
  },

  {
    _id: false,
  }
);

const trainingProgramSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },

    splitType: {
      type: String,
      enum: SPLIT_TYPES,
      required: function (this: TrainingProgramDocument) {
        return !this.templateId;
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    activatedAt: {
      type: Date,
    },

    isArchived: {
      type: Boolean,
      default: false,
    },

    templateId: {
      type: Schema.Types.ObjectId,
      ref: "ProgramTemplate",
      default: null,
    },

    workoutDays: {
      type: [workoutDaySchema],
      default: [],
    },
  },

  {
    timestamps: true,
    collection: "trainingPrograms",
  }
);

trainingProgramSchema.index({
  userId: 1,
  isActive: 1,
});

const TrainingProgram =
  mongoose.models.TrainingProgram ||
  mongoose.model(
    "TrainingProgram",
    trainingProgramSchema
  );

export default TrainingProgram;