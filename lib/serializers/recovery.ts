/**
 * @file lib/serializers/recovery.ts
 * @description Serializer — Sprint 7.1 (Phase B)
 *
 * Converts populated lean WorkoutSession Mongoose documents into
 * `CompletedWorkout[]` DTOs that the Recovery Engine can consume.
 *
 * Responsibilities:
 *  - Strip Mongoose internals (ObjectId, Buffers, etc.)
 *  - Map exercise `primaryMuscle` slugs → canonical Recovery Engine names
 *  - Filter to completed sessions only
 *  - Return plain TypeScript objects (no Mongoose, no React)
 *
 * The Recovery Engine (`lib/performance/recovery.ts`) is NOT imported here;
 * this serializer only produces the input shape it expects.
 */

import type { CompletedWorkout, CompletedExercise, CompletedSet } from "@/lib/performance/types";

// ---------------------------------------------------------------------------
// Muscle-name mapping
// ---------------------------------------------------------------------------

/**
 * Maps the `primaryMuscle` enum values stored in the Exercise collection
 * to the canonical muscle names used by DEFAULT_RECOVERY_TIMES_HOURS.
 *
 * Keys  : PrimaryMuscle slug (as stored in MongoDB)
 * Values: Canonical name recognised by the Recovery Engine
 *
 * Muscles not present in this map are passed through unchanged so they
 * still contribute to fatigue even if no default recovery window exists
 * (the engine falls back to 48 h for unknown names).
 */
const PRIMARY_MUSCLE_TO_CANONICAL: Record<string, string> = {
  pectorals:          "Chest",
  upper_chest:        "Upper Chest",
  lower_chest:        "Chest",
  latissimus_dorsi:   "Lats",
  rhomboids:          "Back",
  trapezius:          "Back",
  rear_deltoids:      "Rear Delts",
  front_deltoids:     "Front Delts",
  lateral_deltoids:   "Side Delts",
  biceps:             "Biceps",
  triceps:            "Triceps",
  forearms:           "Forearms",
  abs:                "Core",
  obliques:           "Core",
  lower_back:         "Back",
  hip_flexors:        "Core",
  quadriceps:         "Quads",
  hamstrings:         "Hamstrings",
  glutes:             "Glutes",
  adductors:          "Quads",
  abductors:          "Glutes",
  calves:             "Calves",
  tibialis_anterior:  "Calves",
  full_body:          "Core",
};

/**
 * Converts a raw `primaryMuscle` slug into the canonical muscle name
 * expected by the Recovery Engine.
 *
 * Falls back to a title-cased version of the slug when no mapping exists,
 * ensuring the value is always a non-empty string.
 */
export function toCanonicalMuscle(slug: string): string {
  return (
    PRIMARY_MUSCLE_TO_CANONICAL[slug] ??
    slug
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

// ---------------------------------------------------------------------------
// Lean document shapes (minimal — only fields used by this serializer)
// ---------------------------------------------------------------------------

/**
 * Minimal populated Exercise shape coming out of `.lean()` + `.populate()`.
 * Only the fields the Recovery Engine cares about are required.
 */
export interface LeanPopulatedExercise {
  _id: { toString(): string };
  name: string;
  primaryMuscle: string;
  secondaryMuscles?: string[];
}

/**
 * A session exercise after `exercises.exerciseId` has been populated.
 */
export interface LeanRecoverySessionExercise {
  /** Populated exercise document (or null/ObjectId if populate failed) */
  exerciseId: LeanPopulatedExercise | { toString(): string } | null;
  performedSets: Array<{
    weight: number;
    reps: number;
    completed: boolean;
  }>;
}

/**
 * Minimal lean WorkoutSession shape needed for recovery serialization.
 */
export interface LeanRecoverySession {
  status: string;
  finishedAt?: Date | string | null;
  exercises: LeanRecoverySessionExercise[];
}

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

/**
 * Converts a single lean WorkoutSession document into a `CompletedWorkout` DTO.
 *
 * Only call this on sessions whose `status === "completed"` and that have
 * a valid `finishedAt` timestamp — the caller (`serializeSessionsForRecovery`)
 * guarantees both.
 */
function serializeSessionForRecovery(
  session: LeanRecoverySession & { finishedAt: Date | string },
): CompletedWorkout {
  const exercises: CompletedExercise[] = session.exercises.flatMap((ex) => {
    // If populate failed or exerciseId is bare ObjectId, skip this entry —
    // we cannot derive target muscles without the exercise document.
    if (
      ex.exerciseId === null ||
      ex.exerciseId === undefined ||
      !("name" in ex.exerciseId)
    ) {
      return [];
    }

    const populated = ex.exerciseId as LeanPopulatedExercise;

    // Build the canonical muscle list.
    // Primary muscle is always present; secondary muscles are optional.
    const targetMuscles: string[] = [
      toCanonicalMuscle(populated.primaryMuscle),
      ...(populated.secondaryMuscles ?? []).map(toCanonicalMuscle),
    ];

    const performedSets: CompletedSet[] = ex.performedSets.map((s) => ({
      weight: s.weight,
      reps: s.reps,
      completed: s.completed,
    }));

    return [
      {
        name: populated.name,
        targetMuscles,
        performedSets,
      } satisfies CompletedExercise,
    ];
  });

  return {
    completedAt: session.finishedAt instanceof Date
      ? session.finishedAt
      : new Date(session.finishedAt),
    exercises,
  } satisfies CompletedWorkout;
}

/**
 * Converts an array of lean WorkoutSession documents into `CompletedWorkout[]`
 * DTOs ready for the Recovery Engine.
 *
 * Only sessions with `status === "completed"` and a valid `finishedAt` date
 * are included; all others are silently dropped.
 *
 * @param sessions - Lean, populated WorkoutSession documents from MongoDB.
 * @returns Plain `CompletedWorkout[]` for `calculateAllRecovery()`.
 */
export function serializeSessionsForRecovery(
  sessions: LeanRecoverySession[],
): CompletedWorkout[] {
  return sessions.flatMap((session) => {
    if (session.status !== "completed" || !session.finishedAt) return [];
    return [serializeSessionForRecovery(session as LeanRecoverySession & { finishedAt: Date | string })];
  });
}
