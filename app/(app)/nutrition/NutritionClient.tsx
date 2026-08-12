"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { NutritionTargets, MealDocument } from "@/types";

export default function NutritionClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [meals, setMeals] = useState<MealDocument[]>([]);

  // Date state
  const [dateString] = useState(() => format(new Date(), "yyyy-MM-dd"));

  // Form states for Setup
  const [setupTargets, setSetupTargets] = useState({ calories: "", protein: "", carbs: "", fat: "" });
  const [isSavingTargets, setIsSavingTargets] = useState(false);

  // Meal Dialog State
  const [isMealDialogOpen, setIsMealDialogOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealDocument | null>(null);
  const [mealForm, setMealForm] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "" });
  const [isSavingMeal, setIsSavingMeal] = useState(false);
  const [isDeletingMeal, setIsDeletingMeal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/nutrition?date=${dateString}`);
      if (!res.ok) throw new Error("Failed to fetch nutrition data");
      const data = await res.json();
      setTargets(data.targets);
      setMeals(data.meals);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [dateString]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handleSaveTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingTargets(true);
      const payload = {
        calories: parseInt(setupTargets.calories) || 0,
        protein: parseInt(setupTargets.protein) || 0,
        carbs: parseInt(setupTargets.carbs) || 0,
        fat: parseInt(setupTargets.fat) || 0,
      };

      const res = await fetch("/api/nutrition/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save targets");
      }

      const updatedTargets = await res.json();
      setTargets(updatedTargets);
      toast.success("Nutrition targets saved!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save targets");
    } finally {
      setIsSavingTargets(false);
    }
  };

  const openMealDialog = (meal?: MealDocument) => {
    if (meal) {
      setEditingMeal(meal);
      setMealForm({
        name: meal.name,
        calories: meal.calories.toString(),
        protein: meal.protein.toString(),
        carbs: meal.carbs.toString(),
        fat: meal.fat.toString(),
      });
    } else {
      setEditingMeal(null);
      setMealForm({ name: "", calories: "", protein: "", carbs: "", fat: "" });
    }
    setIsMealDialogOpen(true);
  };

  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealForm.name.trim()) return;

    try {
      setIsSavingMeal(true);
      const payload = {
        dateString,
        name: mealForm.name.trim(),
        calories: parseInt(mealForm.calories) || 0,
        protein: parseInt(mealForm.protein) || 0,
        carbs: parseInt(mealForm.carbs) || 0,
        fat: parseInt(mealForm.fat) || 0,
      };

      const url = editingMeal ? `/api/nutrition/meals/${editingMeal._id}` : `/api/nutrition/meals`;
      const method = editingMeal ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save meal");
      }

      const savedMeal = await res.json();
      
      if (editingMeal) {
        setMeals((prev) => prev.map((m) => (m._id === savedMeal._id ? savedMeal : m)));
        toast.success("Meal updated!");
      } else {
        setMeals((prev) => [...prev, savedMeal]);
        toast.success("Meal added!");
      }
      
      setIsMealDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save meal");
    } finally {
      setIsSavingMeal(false);
    }
  };

  const handleDeleteMeal = async () => {
    if (!editingMeal) return;
    try {
      setIsDeletingMeal(true);
      const res = await fetch(`/api/nutrition/meals/${editingMeal._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to delete meal");
      }

      setMeals((prev) => prev.filter((m) => m._id !== editingMeal._id));
      toast.success("Meal deleted!");
      setIsMealDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete meal");
    } finally {
      setIsDeletingMeal(false);
    }
  };

  const totals = useMemo(() => {
    return meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fat: acc.fat + meal.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [meals]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  // State 1: Setup Mode
  if (!targets) {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Set Your Targets</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Configure your daily calorie and macro goals to get started.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSaveTargets} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="setup-calories">Daily Calories</Label>
                <Input
                  id="setup-calories"
                  type="number"
                  min="0"
                  required
                  value={setupTargets.calories}
                  onChange={(e) => setSetupTargets({ ...setupTargets, calories: e.target.value })}
                  placeholder="e.g. 2500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-protein">Protein (g)</Label>
                <Input
                  id="setup-protein"
                  type="number"
                  min="0"
                  required
                  value={setupTargets.protein}
                  onChange={(e) => setSetupTargets({ ...setupTargets, protein: e.target.value })}
                  placeholder="e.g. 150"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-carbs">Carbs (g)</Label>
                <Input
                  id="setup-carbs"
                  type="number"
                  min="0"
                  required
                  value={setupTargets.carbs}
                  onChange={(e) => setSetupTargets({ ...setupTargets, carbs: e.target.value })}
                  placeholder="e.g. 300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-fat">Fat (g)</Label>
                <Input
                  id="setup-fat"
                  type="number"
                  min="0"
                  required
                  value={setupTargets.fat}
                  onChange={(e) => setSetupTargets({ ...setupTargets, fat: e.target.value })}
                  placeholder="e.g. 70"
                />
              </div>
              <Button type="submit" className="w-full mt-4" disabled={isSavingTargets}>
                {isSavingTargets && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Targets
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // State 2: Tracking Mode
  const calProgress = Math.min((totals.calories / targets.calories) * 100, 100) || 0;
  const proProgress = Math.min((totals.protein / targets.protein) * 100, 100) || 0;
  const carbProgress = Math.min((totals.carbs / targets.carbs) * 100, 100) || 0;
  const fatProgress = Math.min((totals.fat / targets.fat) * 100, 100) || 0;

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 mb-20">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Today&apos;s Nutrition</h1>
        <p className="text-[var(--text-secondary)] mt-1">{format(new Date(), "EEEE, MMMM d")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Calories Progress */}
        <Card className="border-[var(--border)] bg-[var(--background-secondary)]">
          <CardContent className="pt-6">
            <div className="flex justify-between mb-2">
              <span className="font-semibold">Calories</span>
              <span className="text-sm text-[var(--text-secondary)]">
                {totals.calories} / {targets.calories} kcal
              </span>
            </div>
            <Progress value={calProgress} className="h-2" />
          </CardContent>
        </Card>

        {/* Macros Progress */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-[var(--border)] bg-[var(--background-secondary)]">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-[var(--text-secondary)] mb-1">Protein</div>
              <div className="font-semibold mb-2">
                {totals.protein} <span className="text-xs font-normal text-[var(--text-muted)]">/ {targets.protein}g</span>
              </div>
              <Progress value={proProgress} className="h-1.5 [&>div]:bg-blue-500" />
            </CardContent>
          </Card>
          
          <Card className="border-[var(--border)] bg-[var(--background-secondary)]">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-[var(--text-secondary)] mb-1">Carbs</div>
              <div className="font-semibold mb-2">
                {totals.carbs} <span className="text-xs font-normal text-[var(--text-muted)]">/ {targets.carbs}g</span>
              </div>
              <Progress value={carbProgress} className="h-1.5 [&>div]:bg-green-500" />
            </CardContent>
          </Card>

          <Card className="border-[var(--border)] bg-[var(--background-secondary)]">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-[var(--text-secondary)] mb-1">Fat</div>
              <div className="font-semibold mb-2">
                {totals.fat} <span className="text-xs font-normal text-[var(--text-muted)]">/ {targets.fat}g</span>
              </div>
              <Progress value={fatProgress} className="h-1.5 [&>div]:bg-amber-500" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Meals List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Meals</h2>
          <Button variant="outline" size="sm" onClick={() => openMealDialog()}>
            <Plus className="h-4 w-4 mr-1" /> Add Meal
          </Button>
        </div>

        {meals.length === 0 ? (
          <div className="text-center p-6 border rounded-xl border-dashed border-[var(--border)] text-[var(--text-muted)]">
            No meals logged today yet.
          </div>
        ) : (
          <div className="space-y-3">
            {meals.map((meal) => (
              <Card 
                key={meal._id.toString()} 
                className="cursor-pointer hover:border-[var(--primary)] transition-colors"
                onClick={() => openMealDialog(meal)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{meal.name}</h3>
                    <div className="text-xs text-[var(--text-secondary)] mt-1 flex gap-2">
                      <span>{meal.calories} kcal</span>
                      <span>•</span>
                      <span>{meal.protein}g P</span>
                      <span>•</span>
                      <span>{meal.carbs}g C</span>
                      <span>•</span>
                      <span>{meal.fat}g F</span>
                    </div>
                  </div>
                  <Edit2 className="h-4 w-4 text-[var(--text-muted)]" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Meal Dialog */}
      <Dialog open={isMealDialogOpen} onOpenChange={setIsMealDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[425px] rounded-2xl gap-5 p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle>{editingMeal ? "Edit Meal" : "Add Meal"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveMeal} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="meal-name">Meal Name</Label>
              <Input
                id="meal-name"
                placeholder="e.g. Breakfast, Lunch, Post-workout Shake"
                value={mealForm.name}
                onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })}
                required
                disabled={isSavingMeal}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="meal-calories">Calories (kcal)</Label>
              <Input
                id="meal-calories"
                type="number"
                min="0"
                value={mealForm.calories}
                onChange={(e) => setMealForm({ ...mealForm, calories: e.target.value })}
                disabled={isSavingMeal}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="meal-protein" className="text-xs">Protein (g)</Label>
                <Input
                  id="meal-protein"
                  type="number"
                  min="0"
                  value={mealForm.protein}
                  onChange={(e) => setMealForm({ ...mealForm, protein: e.target.value })}
                  disabled={isSavingMeal}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meal-carbs" className="text-xs">Carbs (g)</Label>
                <Input
                  id="meal-carbs"
                  type="number"
                  min="0"
                  value={mealForm.carbs}
                  onChange={(e) => setMealForm({ ...mealForm, carbs: e.target.value })}
                  disabled={isSavingMeal}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meal-fat" className="text-xs">Fat (g)</Label>
                <Input
                  id="meal-fat"
                  type="number"
                  min="0"
                  value={mealForm.fat}
                  onChange={(e) => setMealForm({ ...mealForm, fat: e.target.value })}
                  disabled={isSavingMeal}
                />
              </div>
            </div>

            <DialogFooter className="pt-4 flex sm:justify-between items-center flex-row gap-2">
              {editingMeal ? (
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="icon"
                  onClick={handleDeleteMeal}
                  disabled={isDeletingMeal || isSavingMeal}
                >
                  {isDeletingMeal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              ) : (
                <div></div> // Empty div for flex spacing
              )}
              
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={() => setIsMealDialogOpen(false)}
                  disabled={isSavingMeal || isDeletingMeal}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 sm:flex-none"
                  disabled={isSavingMeal || isDeletingMeal}
                >
                  {isSavingMeal ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {editingMeal ? "Save" : "Add"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
