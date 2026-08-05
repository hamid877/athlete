"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getRecommendedFilters } from "@/lib/workout-filters";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  MuscleGroupFilterBar,
  type MuscleGroupFilter,
} from "@/components/workouts/MuscleGroupFilter";
import { ExerciseCard } from "@/components/workouts/ExerciseCard";
import { addExerciseSchema, type AddExerciseInput } from "@/validators/workout.schema";
import type { ExerciseDocument, MuscleGroup, PrimaryMuscle } from "@/types";

/* ─── Types ────────────────────────────────────────────────────── */

type ExerciseSummary = Pick<
  ExerciseDocument,
  "name" | "equipment" | "primaryMuscle" | "muscleGroup"
> & { _id: string };

interface ExercisePickerProps {
  workoutId: string;
  /** Current number of exercises already in the workout (used for default order) */
  exerciseCount: number;
  workoutName?: string;
}

/* ─── Default config values ─────────────────────────────────────── */

const CONFIG_DEFAULTS = {
  sets: 3,
  repRange: { min: 8, max: 12 },
  rest: 90,
};

/* ─── Component ─────────────────────────────────────────────────── */

export function ExercisePicker({ workoutId, exerciseCount, workoutName }: ExercisePickerProps) {
  const router = useRouter();

  /* Fetch state */
  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);
  const [loading, setLoading] = useState(true);

  /* Filter / search state */
  const [search, setSearch] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroupFilter>("all");

  /* Intelligent filters based on workout name */
  const recommendedFilters = useMemo(() => {
    if (!workoutName) return null;
    return getRecommendedFilters(workoutName);
  }, [workoutName]);

  const [showAll, setShowAll] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(`exercisePickerShowAll_${workoutId}`);
      if (saved !== null) {
        return saved === "true";
      }
    }
    return !recommendedFilters;
  });

  useEffect(() => {
    sessionStorage.setItem(`exercisePickerShowAll_${workoutId}`, String(showAll));
  }, [showAll, workoutId]);

  /* Config sheet state */
  const [selected, setSelected] = useState<ExerciseSummary | null>(null);
  const [saving, setSaving] = useState(false);

  /* ── form ── */
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddExerciseInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(addExerciseSchema as any),
    defaultValues: {
      exerciseId: "",
      order: exerciseCount,
      sets: CONFIG_DEFAULTS.sets,
      repRange: CONFIG_DEFAULTS.repRange,
      rest: CONFIG_DEFAULTS.rest,
    },
  });

  /* ── Fetch exercises ── */
  const fetchExercises = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (muscleGroup !== "all") params.set("muscleGroup", muscleGroup);

      const res = await fetch(`/api/exercises?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: ExerciseSummary[] = await res.json();
      setExercises(data);
    } catch {
      toast.error("Could not load exercises. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, muscleGroup]);

  /* ── Derived state ── */
  const filteredExercises = useMemo(() => {
    let result = exercises;

    // If user is actively searching, bypass the intelligent filter to show all matches
    if (!showAll && recommendedFilters && !search.trim()) {
      result = result.filter(ex => 
        recommendedFilters.muscleGroups.includes(ex.muscleGroup as MuscleGroup) ||
        recommendedFilters.primaryMuscles.includes(ex.primaryMuscle as PrimaryMuscle)
      );
    }

    return result;
  }, [exercises, showAll, recommendedFilters, search]);

  useEffect(() => {
    const timer = setTimeout(fetchExercises, 250);
    return () => clearTimeout(timer);
  }, [fetchExercises]);

  /* ── Open config sheet for an exercise ── */
  function openConfig(exercise: ExerciseSummary) {
    setSelected(exercise);
    reset({
      exerciseId: exercise._id,
      order: exerciseCount,
      sets: CONFIG_DEFAULTS.sets,
      repRange: CONFIG_DEFAULTS.repRange,
      rest: CONFIG_DEFAULTS.rest,
    });
  }

  /* ── Save ── */
  async function onSubmit(data: AddExerciseInput) {
    setSaving(true);
    try {
      const res = await fetch(`/api/workouts/${workoutId}/exercise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to save");
      }

      toast.success("Exercise added!");
      router.push(`/workouts/${workoutId}/configure-exercise/${data.exerciseId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  /* ── Render ── */
  return (
    <>
      {/* ─── Search ─────────────────────────────────────────── */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
        <Input
          id="exercise-search"
          type="search"
          placeholder="Search exercises…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Search exercises"
        />
      </div>

      {/* ─── Intelligent Filter Toggle ────────────────────── */}
      {recommendedFilters && (
        <div className="flex items-center justify-between mb-4 px-1">
          <Label htmlFor="show-all" className="text-sm font-medium text-[var(--text-secondary)]">
            Show all exercises
          </Label>
          <Switch id="show-all" checked={showAll} onCheckedChange={setShowAll} />
        </div>
      )}

      {/* ─── Muscle group chips ──────────────────────────────── */}
      <div className="mb-4">
        <MuscleGroupFilterBar selected={muscleGroup} onChange={setMuscleGroup} />
      </div>

      {/* ─── Exercise list ───────────────────────────────────── */}
      <div
        className="space-y-2 overflow-y-auto"
        style={{ maxHeight: "calc(100dvh - 260px)" }}
        aria-live="polite"
        aria-busy={loading}
      >
        {loading ? (
          /* Skeleton */
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-[var(--radius-md)] bg-[var(--background-subtle)]"
            />
          ))
        ) : filteredExercises.length === 0 ? (
          <div className="py-12 text-center text-[var(--text-secondary)]">
            No exercises found.
          </div>
        ) : (
          filteredExercises.map((exercise) => (
            <ExerciseCard
              key={exercise._id}
              exercise={exercise}
              selected={selected?._id === exercise._id}
              onClick={() => openConfig(exercise)}
            />
          ))
        )}
      </div>

      {/* ─── Config dialog ───────────────────────────────────── */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="truncate">{selected?.name}</DialogTitle>
          </DialogHeader>

          <form
            id="add-exercise-form"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onSubmit={handleSubmit(onSubmit as any)}
            className="space-y-5 pt-1"
          >
            {/* Hidden fields */}
            <input type="hidden" {...register("exerciseId")} />
            <input
              type="hidden"
              {...register("order", { valueAsNumber: true })}
            />

            {/* Sets */}
            <div className="space-y-1.5">
              <Label htmlFor="cfg-sets">Sets</Label>
              <Input
                id="cfg-sets"
                type="number"
                min={1}
                max={20}
                {...register("sets", { valueAsNumber: true })}
              />
              {errors.sets && (
                <p className="text-xs text-[var(--danger)]">
                  {errors.sets.message}
                </p>
              )}
            </div>

            {/* Rep range */}
            <div className="space-y-1.5">
              <Label>Rep Range</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="cfg-rep-min"
                  type="number"
                  min={1}
                  max={100}
                  aria-label="Minimum reps"
                  {...register("repRange.min", { valueAsNumber: true })}
                />
                <span className="shrink-0 text-sm text-[var(--text-muted)]">–</span>
                <Input
                  id="cfg-rep-max"
                  type="number"
                  min={1}
                  max={100}
                  aria-label="Maximum reps"
                  {...register("repRange.max", { valueAsNumber: true })}
                />
              </div>
              {(errors.repRange?.min || errors.repRange?.max) && (
                <p className="text-xs text-[var(--danger)]">
                  {errors.repRange?.min?.message ??
                    errors.repRange?.max?.message}
                </p>
              )}
            </div>

            {/* Rest */}
            <div className="space-y-1.5">
              <Label htmlFor="cfg-rest">Rest (seconds)</Label>
              <Input
                id="cfg-rest"
                type="number"
                min={0}
                max={600}
                {...register("rest", { valueAsNumber: true })}
              />
              {errors.rest && (
                <p className="text-xs text-[var(--danger)]">
                  {errors.rest.message}
                </p>
              )}
            </div>
          </form>

          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              form="add-exercise-form"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
