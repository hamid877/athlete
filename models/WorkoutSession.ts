import mongoose, { Schema, type Model, type Document } from "mongoose";

export interface IPerformedSet {
  weight: number;

  reps: number;

  completed: boolean;

  rpe?: number;
}

export interface IWorkoutSessionExercise {
  exerciseId: mongoose.Types.ObjectId;

  notes?: string;

  order: number;

  performedSets: IPerformedSet[];
}

export const SESSION_STATUS = [
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type SessionStatus =
  (typeof SESSION_STATUS)[number];

export interface IWorkoutSession extends Document {
  userId: mongoose.Types.ObjectId;

  workoutId: mongoose.Types.ObjectId;

  startedAt: Date;

  finishedAt?: Date;

  duration?: number;

  status: SessionStatus;

  exercises: IWorkoutSessionExercise[];
}

const performedSetSchema = new Schema<IPerformedSet>(
  {
    weight: {
      type: Number,
      required: true,
      min: 0,
    },

    reps: {
      type: Number,
      required: true,
      min: 0,
    },

    completed: {
      type: Boolean,
      default: true,
    },

    rpe: {
      type: Number,
      min: 1,
      max: 10,
    },
  },
  {
    _id: false,
  }
);

const workoutSessionExerciseSchema = new Schema<IWorkoutSessionExercise>(
    {
      exerciseId: {
        type: Schema.Types.ObjectId,
        ref: "Exercise",
        required: true,
      },

      performedSets: {
        type: [performedSetSchema],
        default: [],
      },
      order: {
  type: Number,
  required: true,
  min:0,
},
notes: {
  type: String,
  trim: true,
  default: "",
},
    },
    {
      _id: false,
    }
);

const workoutSessionSchema = new Schema<IWorkoutSession>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      workoutId: {
        type: Schema.Types.ObjectId,
        ref: "Workout",
        required: true,
      },

      startedAt: {
        type: Date,
        default: Date.now,
      },

      finishedAt: {
        type: Date,
        default: null,
      },

      status: {
        type: String,
        enum: SESSION_STATUS,
        default: "in_progress",
      },

      duration: {
        type: Number,
      },

      exercises: {
        type: [workoutSessionExerciseSchema],
        default: [],
      },
    },
    {
      timestamps: true,
      collection: "workoutSessions",
    }
);

workoutSessionSchema.index({
  userId: 1,
  startedAt: -1,
});

workoutSessionSchema.index({
  workoutId: 1,
});

workoutSessionSchema.index({
  status: 1,
});

const WorkoutSession: Model<IWorkoutSession> =
  mongoose.models.WorkoutSession ??
  mongoose.model<IWorkoutSession>(
    "WorkoutSession",
    workoutSessionSchema
  );

export default WorkoutSession;