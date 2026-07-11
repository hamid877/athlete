import mongoose, { Schema, type Document, type Model } from "mongoose";

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type Day = (typeof DAYS)[number];

export interface IWorkoutExercise {
  exerciseId: mongoose.Types.ObjectId;

  order: number;

  sets: number;

  repRange: {
    min: number;
    max: number;
  };

  rest: number;
}

export interface IWorkout extends Document {
  userId: mongoose.Types.ObjectId;

  name: string;

  isRestDay: boolean;

  exercises: IWorkoutExercise[];

  createdAt: Date;

  updatedAt: Date;
}

const workoutExerciseSchema = new Schema<IWorkoutExercise>(
  {
    exerciseId: {
      type: Schema.Types.ObjectId,
      ref: "Exercise",
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

const workoutSchema = new Schema<IWorkout>(
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


    isRestDay: {
      type: Boolean,
      default: false,
    },


    exercises: {
      type: [workoutExerciseSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "workouts",
  }
);

workoutSchema.index({
  userId: 1,
  name: 1,
});

const Workout: Model<IWorkout> =
  mongoose.models.Workout ??
  mongoose.model<IWorkout>("Workout", workoutSchema);

export default Workout;