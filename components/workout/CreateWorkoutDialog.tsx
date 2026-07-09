"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { WorkoutItem } from "./WorkoutCard";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface CreateWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate?: (workout: WorkoutItem) => void;
}

export default function CreateWorkoutDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateWorkoutDialogProps) {
  const [name, setName] = useState("");
  const [day, setDay] = useState("Monday");
  const [isRestDay, setIsRestDay] = useState(false);
  const [duration, setDuration] = useState("60");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset form when the dialog opens
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName("");
      setDay("Monday");
      setIsRestDay(false);
      setDuration("60");
      setSubmitError(null);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const workoutData = {
      name: name.trim(),
      day,
      isRestDay,
      estimatedDuration: isRestDay ? undefined : parseInt(duration, 10) || 60,
    };

    try {
      const response = await fetch("/api/workouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workoutData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create workout. Please try again.");
      }

      const newWorkout = await response.json();

      if (onCreate) {
        onCreate(newWorkout);
      }

      onOpenChange(false);
    } catch (err) {
      console.error("Error creating workout:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[425px] rounded-2xl gap-5 p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle>Create Workout</DialogTitle>
          <DialogDescription>
            Add a new workout routine or rest day to your weekly schedule.
          </DialogDescription>
        </DialogHeader>

        <form 
          onSubmit={handleSubmit} 
          className="space-y-5 py-1"
          aria-busy={isSubmitting}
        >
          {submitError && (
            <div 
              role="alert" 
              aria-live="assertive" 
              className="flex items-center gap-2 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 p-3 text-sm text-[var(--danger)] animate-fade-in-up"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="font-medium">{submitError}</p>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="workout-name" className="text-sm font-medium text-[var(--text-primary)]">Workout Name</Label>
            <Input
              id="workout-name"
              placeholder="e.g., Upper Body Push"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
              className="h-10"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="training-day" className="text-sm font-medium text-[var(--text-primary)]">Training Day</Label>
            <Select value={day} onValueChange={setDay} disabled={isSubmitting}>
              <SelectTrigger id="training-day" className="w-full h-10">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div 
            onClick={() => !isSubmitting && setIsRestDay(!isRestDay)}
            className="flex items-center justify-between rounded-xl border border-[var(--border)] p-4 bg-[var(--background-subtle)] cursor-pointer select-none hover:bg-[var(--border)]/10 active:scale-[0.99] transition-all"
          >
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Rest Day
              </span>
              <p className="text-xs text-[var(--text-muted)]">
                Designate this day for active or passive recovery
              </p>
            </div>
            <Switch
              id="rest-day"
              checked={isRestDay}
              onCheckedChange={setIsRestDay}
              onClick={(e) => e.stopPropagation()}
              disabled={isSubmitting}
              aria-label="Rest Day"
            />
          </div>

          <div className="grid gap-2">
            <Label
              htmlFor="duration"
              className={`text-sm font-medium text-[var(--text-primary)] transition-opacity ${isRestDay ? "opacity-50" : ""}`}
            >
              Estimated Duration (minutes)
            </Label>
            <Input
              id="duration"
              type="number"
              min={1}
              placeholder="e.g., 60"
              value={isRestDay ? "" : duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={isRestDay || isSubmitting}
              required={!isRestDay}
              className="h-10"
            />
          </div>

          <DialogFooter className="pt-3 gap-3 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 sm:h-10 w-full sm:w-auto active:scale-[0.98] transition-transform"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="h-11 sm:h-10 w-full sm:w-auto active:scale-[0.98] transition-transform"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Workout"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
