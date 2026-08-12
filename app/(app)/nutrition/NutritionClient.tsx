"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import type { NutritionTargets, DailyNutritionDocument } from "@/types";

export default function NutritionClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [dailyRecord, setDailyRecord] = useState<DailyNutritionDocument | null>(null);
  
  // Date state
  const [dateString] = useState(() => format(new Date(), "yyyy-MM-dd"));

  // Form states for Tracking
  const [consumed, setConsumed] = useState({ calories: "", protein: "", carbs: "", fat: "" });
  const [isSaving, setIsSaving] = useState(false);

  // Form states for Setup
  const [setupTargets, setSetupTargets] = useState({ calories: "", protein: "", carbs: "", fat: "" });
  const [isSavingTargets, setIsSavingTargets] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/nutrition?date=${dateString}`);
        if (!res.ok) throw new Error("Failed to fetch nutrition data");
        const data = await res.json();
        setTargets(data.targets);
        setDailyRecord(data.dailyRecord);
        
        if (data.dailyRecord) {
          setConsumed({
            calories: data.dailyRecord.calories.toString(),
            protein: data.dailyRecord.protein.toString(),
            carbs: data.dailyRecord.carbs.toString(),
            fat: data.dailyRecord.fat.toString(),
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateString]);

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

  const handleSaveConsumption = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const payload = {
        dateString,
        calories: parseInt(consumed.calories) || 0,
        protein: parseInt(consumed.protein) || 0,
        carbs: parseInt(consumed.carbs) || 0,
        fat: parseInt(consumed.fat) || 0,
      };

      const res = await fetch("/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to log nutrition");
      }

      const updatedRecord = await res.json();
      setDailyRecord(updatedRecord);
      toast.success("Daily nutrition updated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log nutrition");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} retry={() => window.location.reload()} />;
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
  const todayCalories = dailyRecord?.calories || 0;
  const todayProtein = dailyRecord?.protein || 0;
  const todayCarbs = dailyRecord?.carbs || 0;
  const todayFat = dailyRecord?.fat || 0;

  const calProgress = Math.min((todayCalories / targets.calories) * 100, 100) || 0;
  const proProgress = Math.min((todayProtein / targets.protein) * 100, 100) || 0;
  const carbProgress = Math.min((todayCarbs / targets.carbs) * 100, 100) || 0;
  const fatProgress = Math.min((todayFat / targets.fat) * 100, 100) || 0;

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
                {todayCalories} / {targets.calories} kcal
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
                {todayProtein} <span className="text-xs font-normal text-[var(--text-muted)]">/ {targets.protein}g</span>
              </div>
              <Progress value={proProgress} className="h-1.5 [&>div]:bg-blue-500" />
            </CardContent>
          </Card>
          
          <Card className="border-[var(--border)] bg-[var(--background-secondary)]">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-[var(--text-secondary)] mb-1">Carbs</div>
              <div className="font-semibold mb-2">
                {todayCarbs} <span className="text-xs font-normal text-[var(--text-muted)]">/ {targets.carbs}g</span>
              </div>
              <Progress value={carbProgress} className="h-1.5 [&>div]:bg-green-500" />
            </CardContent>
          </Card>

          <Card className="border-[var(--border)] bg-[var(--background-secondary)]">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-[var(--text-secondary)] mb-1">Fat</div>
              <div className="font-semibold mb-2">
                {todayFat} <span className="text-xs font-normal text-[var(--text-muted)]">/ {targets.fat}g</span>
              </div>
              <Progress value={fatProgress} className="h-1.5 [&>div]:bg-amber-500" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Log Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Update Consumption</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveConsumption} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="log-calories">Calories</Label>
              <Input
                id="log-calories"
                type="number"
                min="0"
                value={consumed.calories}
                onChange={(e) => setConsumed({ ...consumed, calories: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="log-protein" className="text-xs">Protein (g)</Label>
                <Input
                  id="log-protein"
                  type="number"
                  min="0"
                  value={consumed.protein}
                  onChange={(e) => setConsumed({ ...consumed, protein: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="log-carbs" className="text-xs">Carbs (g)</Label>
                <Input
                  id="log-carbs"
                  type="number"
                  min="0"
                  value={consumed.carbs}
                  onChange={(e) => setConsumed({ ...consumed, carbs: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="log-fat" className="text-xs">Fat (g)</Label>
                <Input
                  id="log-fat"
                  type="number"
                  min="0"
                  value={consumed.fat}
                  onChange={(e) => setConsumed({ ...consumed, fat: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" className="w-full mt-4" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Entry
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
