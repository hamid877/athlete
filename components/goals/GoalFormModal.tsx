"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createGoalSchema, updateGoalSchema } from "@/validators/goal.schema";
import { GoalDocument } from "@/types";
import { GoalIntelligence } from "./GoalIntelligence";
import { SUPPORTED_MUSCLES } from "@/lib/growth-intelligence/muscle-analysis.service";

interface GoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal?: GoalDocument;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

const unitMapping = {
  weight: ["kg", "lbs"],
  bodyFat: ["%"],
  strength: ["kg", "lbs"],
  nutrition: ["kcal", "g"],
  habit: ["days/week", "times/week"],
  muscle_growth: ["cm", "in"],
  consistency: ["workouts/week", "days/week"],
};

const goalTypeLabels: Record<string, string> = {
  weight: "Bodyweight",
  bodyFat: "Body Fat",
  strength: "Strength / Lift",
  nutrition: "Nutrition",
  habit: "Consistency",
  muscle_growth: "Muscle Growth",
  consistency: "Consistency",
};

export function GoalFormModal({ isOpen, onClose, goal, onSave }: GoalFormModalProps) {
  const isEditing = !!goal;

  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(isEditing ? updateGoalSchema : createGoalSchema),
    defaultValues: {
      type: goal?.type || "weight",
      title: goal?.title || "",
      targetValue: goal?.targetValue || 0,
      currentValue: goal?.currentValue || 0,
      unit: goal?.unit || "kg",
      status: goal?.status || "active",
      startDate: goal?.startDate ? new Date(goal.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      targetDate: goal?.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : "",
      exerciseId: goal?.exerciseId || "",
      muscle: goal?.muscle || "",
    },
  });

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = form;
  const currentType = useWatch({ control: form.control, name: "type" }) as keyof typeof unitMapping;

  useEffect(() => {
    if (isOpen) {
      reset({
        type: goal?.type || "weight",
        title: goal?.title || "",
        targetValue: goal?.targetValue || 0,
        currentValue: goal?.currentValue || 0,
        unit: goal?.unit || "kg",
        status: goal?.status || "active",
        startDate: goal?.startDate ? new Date(goal.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        targetDate: goal?.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : "",
        exerciseId: goal?.exerciseId || "",
        muscle: goal?.muscle || "",
      });
    }
  }, [isOpen, goal, reset]);

  const currentUnit = useWatch({ control: form.control, name: "unit" }) as string;
  const currentStatus = useWatch({ control: form.control, name: "status" }) as string;
  const currentMuscle = useWatch({ control: form.control, name: "muscle" }) as string;
  const currentExerciseId = useWatch({ control: form.control, name: "exerciseId" }) as string;
  
  const [exercises, setExercises] = useState<{ _id: string; name: string }[]>([]);

  useEffect(() => {
    if (currentType === 'strength' && isOpen && exercises.length === 0) {
      fetch('/api/exercises')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setExercises(data);
          }
        })
        .catch(err => console.error("Failed to load exercises:", err));
    }
  }, [currentType, isOpen, exercises.length]);

  useEffect(() => {
    if (!isOpen) return;
    const allowedUnits = unitMapping[currentType];
    if (allowedUnits && !allowedUnits.includes(currentUnit)) {
      setValue("unit", allowedUnits[0]);
    }
  }, [currentType, isOpen, setValue, currentUnit]);

  const onSubmit = async (data: Record<string, unknown>) => {
    // Convert string dates to Date objects if needed, though zod coercion handles it
    if (!data.targetDate) {
      delete data.targetDate;
    }
    await onSave(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-[var(--bg-primary)] text-[var(--text-primary)] border-[var(--border)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Goal" : "Create Goal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          
          {isEditing && goal && <GoalIntelligence goalId={goal._id.toString()} />}

          <div className="space-y-2">
            <Label htmlFor="type">Goal Type</Label>
            <Select 
              value={currentType} 
              onValueChange={(val) => setValue("type", val)}
              disabled={isEditing}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(goalTypeLabels).map((key) => (
                  <SelectItem key={key} value={key}>
                    {goalTypeLabels[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-red-500">{errors.type.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} placeholder="e.g. Bench Press 100kg" />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message as string}</p>}
          </div>

          {currentType === 'strength' && (
            <div className="space-y-2">
              <Label htmlFor="exerciseId">Exercise</Label>
              <Select 
                value={currentExerciseId} 
                onValueChange={(val) => setValue("exerciseId", val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an exercise" />
                </SelectTrigger>
                <SelectContent>
                  {exercises.map((ex) => (
                    <SelectItem key={ex._id} value={ex._id}>
                      {ex.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.exerciseId && <p className="text-sm text-red-500">{errors.exerciseId.message as string}</p>}
            </div>
          )}

          {currentType === 'muscle_growth' && (
            <div className="space-y-2">
              <Label htmlFor="muscle">Muscle</Label>
              <Select 
                value={currentMuscle} 
                onValueChange={(val) => setValue("muscle", val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select muscle" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_MUSCLES.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.muscle && <p className="text-sm text-red-500">{errors.muscle.message as string}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetValue">Target Value</Label>
              <Input id="targetValue" type="number" step="0.1" {...register("targetValue", { valueAsNumber: true })} />
              {errors.targetValue && <p className="text-sm text-red-500">{errors.targetValue.message as string}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select 
                value={currentUnit} 
                onValueChange={(val) => setValue("unit", val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {unitMapping[currentType]?.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.unit && <p className="text-sm text-red-500">{errors.unit.message as string}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentValue">Current Value</Label>
            <Input id="currentValue" type="number" step="0.1" {...register("currentValue", { valueAsNumber: true })} />
            {errors.currentValue && <p className="text-sm text-red-500">{errors.currentValue.message as string}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
              {errors.startDate && <p className="text-sm text-red-500">{errors.startDate.message as string}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="targetDate">Target Date (Optional)</Label>
              <Input id="targetDate" type="date" {...register("targetDate")} />
              {errors.targetDate && <p className="text-sm text-red-500">{errors.targetDate.message as string}</p>}
            </div>
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={currentStatus} 
                onValueChange={(val) => setValue("status", val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="achieved">Achieved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Goal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
