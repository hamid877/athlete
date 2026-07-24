"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Filter, Dumbbell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExerciseDocument } from "@/types";

const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "core",
  "legs",
  "glutes",
  "calves",
  "full_body",
  "cardio",
];

const EQUIPMENT = [
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "bodyweight",
  "kettlebell",
  "resistance_band",
  "smith_machine",
  "trap_bar",
  "ez_bar",
  "pull_up_bar",
  "dip_bars",
  "rings",
  "medicine_ball",
  "foam_roller",
  "suspension",
  "cardio_machine",
  "other",
];

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<ExerciseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<string>("all");
  const [equipment, setEquipment] = useState<string>("all");

  useEffect(() => {
    const fetchExercises = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (search) queryParams.append("search", search);
        if (muscleGroup && muscleGroup !== "all") queryParams.append("muscleGroup", muscleGroup);
        if (equipment && equipment !== "all") queryParams.append("equipment", equipment);

        const res = await fetch(`/api/exercises?${queryParams.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch exercises");
        const data = await res.json();
        setExercises(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search slightly
    const timer = setTimeout(() => {
      fetchExercises();
    }, 300);

    return () => clearTimeout(timer);
  }, [search, muscleGroup, equipment]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Exercise Library</h1>
          <p className="text-[var(--text-muted)] mt-1">Browse and search all available exercises.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <Input 
            placeholder="Search exercises..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-[var(--text-muted)] hidden sm:block" />
          <Select value={muscleGroup} onValueChange={setMuscleGroup}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Muscle Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Muscles</SelectItem>
              {MUSCLE_GROUPS.map((mg) => (
                <SelectItem key={mg} value={mg}>
                  {mg.charAt(0).toUpperCase() + mg.slice(1).replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={equipment} onValueChange={setEquipment}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Equipment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Equipment</SelectItem>
              {EQUIPMENT.map((eq) => (
                <SelectItem key={eq} value={eq}>
                  {eq.charAt(0).toUpperCase() + eq.slice(1).replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] animate-pulse" />
          ))}
        </div>
      ) : exercises.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)]">
          <Dumbbell className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-[var(--text-primary)]">No exercises found</h3>
          <p className="text-[var(--text-muted)]">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {exercises.map((exercise) => (
            <Link key={exercise._id} href={`/exercises/${exercise._id}`}>
              <Card className="h-full hover:border-[var(--border-hover)] transition-colors cursor-pointer group bg-[var(--surface)]">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg group-hover:text-[var(--brand)] transition-colors line-clamp-1" title={exercise.name}>
                      {exercise.name}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-[var(--radius-sm)] text-xs font-medium bg-[var(--background-subtle)] text-[var(--text-secondary)]">
                      {exercise.muscleGroup.replace("_", " ")}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-[var(--radius-sm)] text-xs font-medium bg-[var(--background-subtle)] text-[var(--text-secondary)]">
                      {exercise.equipment.replace("_", " ")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
