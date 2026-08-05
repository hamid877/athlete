import mongoose from "mongoose";

export interface ExerciseSummaryDTO {
  _id: string;
  name: string;
  equipment: string;
  primaryMuscle: string;
  weightInputType?: string;
}

export interface PlannedExerciseDTO {
  exerciseId: string;
  order: number;
  sets: number;
  repRange: { min: number; max: number };
  rest: number;
}

export interface PopulatedWorkoutDTO {
  _id: string;
  name: string;
  exercises: PlannedExerciseDTO[];
}

export interface PerformedSetDTO {
  weight: number;
  reps: number;
  completed: boolean;
  rpe?: number;
}

export interface PopulatedSessionExerciseDTO {
  exerciseId: ExerciseSummaryDTO | null;
  order: number;
  notes?: string;
  performedSets: PerformedSetDTO[];
}

export interface WorkoutSessionDTO {
  _id: string;
  userId: string;
  workoutId: PopulatedWorkoutDTO | null;
  startedAt: string;
  finishedAt?: string;
  status: string;
  exercises: PopulatedSessionExerciseDTO[];
}

// Internal lean types corresponding to populated Mongoose lean() document
export type LeanExercise = {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  equipment: string;
  primaryMuscle: string;
  weightInputType?: string;
};

export type LeanWorkoutExercise = {
  exerciseId: LeanExercise | mongoose.Types.ObjectId | string | null;
  order: number;
  sets: number;
  repRange: { min: number; max: number };
  rest: number;
};

export type LeanWorkout = {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  exercises: LeanWorkoutExercise[];
};

export type LeanPerformedSet = {
  weight: number;
  reps: number;
  completed: boolean;
  rpe?: number;
};

export type LeanSessionExercise = {
  exerciseId: LeanExercise | mongoose.Types.ObjectId | string | null;
  order: number;
  notes?: string;
  performedSets: LeanPerformedSet[];
};

export type PopulatedLeanWorkoutSession = {
  _id: mongoose.Types.ObjectId | string;
  userId: mongoose.Types.ObjectId | string;
  workoutId: LeanWorkout | mongoose.Types.ObjectId | string | null;
  startedAt: Date | string;
  finishedAt?: Date | string | null;
  status: string;
  exercises: LeanSessionExercise[];
};

export function serializeWorkoutSession(rawSession: PopulatedLeanWorkoutSession): WorkoutSessionDTO {
  let workoutDto: PopulatedWorkoutDTO | null = null;
  
  if (rawSession.workoutId && typeof rawSession.workoutId === "object" && "name" in rawSession.workoutId) {
    const workout = rawSession.workoutId as LeanWorkout;
    workoutDto = {
      _id: workout._id.toString(),
      name: workout.name,
      exercises: workout.exercises.map((ex) => {
        const exIdStr = ex.exerciseId && typeof ex.exerciseId === "object" && "name" in ex.exerciseId
            ? (ex.exerciseId as LeanExercise)._id.toString()
            : ex.exerciseId?.toString() || "";

        return {
          exerciseId: exIdStr,
          order: ex.order,
          sets: ex.sets ?? 0,
          repRange: {
            min: ex.repRange?.min ?? 0,
            max: ex.repRange?.max ?? 0,
          },
          rest: ex.rest ?? 0,
        };
      }),
    };
  }

  return {
    _id: rawSession._id.toString(),
    userId: rawSession.userId.toString(),
    workoutId: workoutDto,
    startedAt: rawSession.startedAt instanceof Date ? rawSession.startedAt.toISOString() : new Date(rawSession.startedAt).toISOString(),
    finishedAt: rawSession.finishedAt ? (rawSession.finishedAt instanceof Date ? rawSession.finishedAt.toISOString() : new Date(rawSession.finishedAt).toISOString()) : undefined,
    status: rawSession.status,
    exercises: rawSession.exercises.map((exercise) => {
      let exerciseSummary: ExerciseSummaryDTO | null = null;

      if (exercise.exerciseId && typeof exercise.exerciseId === "object" && "name" in exercise.exerciseId) {
        const exSummary = exercise.exerciseId as LeanExercise;
        exerciseSummary = {
          _id: exSummary._id.toString(),
          name: exSummary.name,
          equipment: exSummary.equipment,
          primaryMuscle: exSummary.primaryMuscle,
          weightInputType: exSummary.weightInputType,
        };
      }

      return {
        exerciseId: exerciseSummary,
        order: exercise.order,
        notes: exercise.notes,
        performedSets: exercise.performedSets.map((set) => ({
          weight: set.weight,
          reps: set.reps,
          completed: set.completed,
          rpe: set.rpe,
        })),
      };
    }),
  };
}
