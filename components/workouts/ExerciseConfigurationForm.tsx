"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  updateExerciseConfigSchema,
  type UpdateExerciseConfigInput,
} from "@/validators/workout.schema";

/* ─── Props ─────────────────────────────────────────────────────── */

interface ExerciseConfigurationFormProps {
  workoutId: string;
  exerciseId: string;
  exerciseName: string;
  defaultValues: UpdateExerciseConfigInput;
}

/* ─── Component ─────────────────────────────────────────────────── */

export function ExerciseConfigurationForm({
  workoutId,
  exerciseId,
  exerciseName,
  defaultValues,
}: ExerciseConfigurationFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateExerciseConfigInput>({
    resolver: zodResolver(updateExerciseConfigSchema),
    defaultValues,
  });

  async function onSubmit(data: UpdateExerciseConfigInput) {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/workouts/${workoutId}/exercise/${exerciseId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to save");
      }

      toast.success("Exercise updated!");
      router.push(`/workouts/${workoutId}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Exercise name ─── */}
      <p className="text-base font-semibold text-[var(--text-primary)]">
        {exerciseName}
      </p>

      {/* ─── Form ─── */}
      <form
        id="configure-exercise-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        {/* Sets */}
        <div className="space-y-1.5">
          <Label htmlFor="cfg-sets">Sets</Label>
          <Input
            id="cfg-sets"
            type="number"
            min={1}
            max={10}
            {...register("sets", { valueAsNumber: true })}
          />
          {errors.sets && (
            <p className="text-xs text-[var(--danger)]">
              {errors.sets.message}
            </p>
          )}
        </div>

        {/* Rep Range */}
        <div className="space-y-1.5">
          <Label>Rep Range</Label>
          <div className="flex items-center gap-2">
            <Input
              id="cfg-rep-min"
              type="number"
              min={1}
              max={50}
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
              {errors.repRange?.min?.message ?? errors.repRange?.max?.message}
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

      {/* ─── Actions ─── */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          type="button"
          className="flex-1"
          onClick={() => router.push(`/workouts/${workoutId}`)}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="configure-exercise-form"
          className="flex-1"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
