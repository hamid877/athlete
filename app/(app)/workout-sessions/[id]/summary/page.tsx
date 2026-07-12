"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, ArrowLeft, Calendar, Clock, Dumbbell, 
  Trophy, Flame, Zap, Activity, BatteryMedium, Target,
  TrendingUp, TrendingDown, Minus
} from "lucide-react";
import { format } from "date-fns";
import {
  calculateTrainingDensity,
  calculateSessionIntensity,
  calculateWorkoutQuality,
  aggregateSessionStimulus,
  calculateCalories,
  getProgressionRecommendation,
  ProgressionResult
} from "@/lib/performance";
import type { ProgressionExercise } from "@/lib/performance/progression";
interface PerformedSet {
  weight: number;
  reps: number;
  completed: boolean;
}

interface Exercise {
  exerciseId: { 
    _id: string; 
    name: string;
    isCompound?: boolean;
    primaryMuscle?: string;
    muscleGroup?: string;
  } | null;
  order: number;
  performedSets: PerformedSet[];
  notes?: string;
  plannedRepRange?: { min: number; max: number };
  previousExercise?: ProgressionExercise | null;}

interface WorkoutSession {
  _id: string;
  workoutId: { _id: string; name: string } | null;
  startedAt: string;
  finishedAt?: string;
  duration?: number; // duration in seconds
  status: string;
  exercises: Exercise[];
}

export default function WorkoutSummaryPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/workout-sessions/${id}`);
        if (!res.ok) {
          throw new Error("Failed to fetch workout session");
        }
        const data = await res.json();
        setSession(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unexpected error occurred.");
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchSession();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-[100dvh] w-full max-w-3xl mx-auto px-4 py-6 sm:py-10 justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col min-h-[100dvh] w-full max-w-3xl mx-auto px-4 py-6 sm:py-10">
        <div className="text-center py-12 text-destructive">
          <p>{error || "Session not found."}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/workouts/history")}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const durationSecs = session.duration || 0;
  const durationMins = durationSecs / 60;

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const calculateTotalVolume = (exercises: Exercise[]) => {
    let volume = 0;
    exercises.forEach((ex) => {
      ex.performedSets.forEach((set) => {
        if (set.completed) {
          volume += set.weight * set.reps;
        }
      });
    });
    return volume;
  };

  const calculateTotalSets = (exercises: Exercise[]) => {
    let sets = 0;
    exercises.forEach((ex) => {
      ex.performedSets.forEach((set) => {
        if (set.completed) sets++;
      });
    });
    return sets;
  };

  const completedExercises = session.exercises.filter(ex => 
    ex.performedSets.some(set => set.completed)
  ).length;

  const volume = calculateTotalVolume(session.exercises);
  const totalSets = calculateTotalSets(session.exercises);
  const calories = calculateCalories(durationMins, 75, "moderate"); // Using 75kg default for now
  
  const density = calculateTrainingDensity(volume, durationMins);
  const intensity = calculateSessionIntensity(totalSets, durationMins);
  const quality = calculateWorkoutQuality(volume, durationMins, totalSets);
  
  const stimulusData = aggregateSessionStimulus(session.exercises);

  const getQualityColor = (score: number) => {
    if (score >= 90) return "text-purple-500";
    if (score >= 75) return "text-blue-500";
    if (score >= 50) return "text-green-500";
    if (score >= 30) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="flex flex-col min-h-[100dvh] w-full max-w-4xl mx-auto px-4 py-6 sm:py-10">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-4 -ml-3">
            <Link href="/workouts/history">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to History
            </Link>
          </Button>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {session.workoutId ? session.workoutId.name : "Workout Session"}
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            {session.finishedAt 
              ? format(new Date(session.finishedAt), "EEEE, MMMM d, yyyy 'at' h:mm a") 
              : format(new Date(session.startedAt), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-muted/50 px-4 py-2 rounded-full border">
          {session.status === "completed" ? (
            <>
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold text-sm">Completed</span>
            </>
          ) : (
            <span className="font-semibold text-sm capitalize">{session.status}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Core Metrics */}
        <Card className="bg-gradient-to-br from-card to-muted/20 border-muted">
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <div className="flex items-center space-x-2 mb-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-xs uppercase font-semibold tracking-wider">Workout Duration</span>
            </div>
            <span className="text-3xl font-bold mb-1">{durationSecs ? formatDuration(durationSecs) : "--"}</span>
            <p className="text-xs text-muted-foreground mt-auto">Total time from start to finish.</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-muted/20 border-muted">
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <div className="flex items-center space-x-2 mb-2 text-muted-foreground">
              <Dumbbell className="h-4 w-4" />
              <span className="text-xs uppercase font-semibold tracking-wider">Training Volume</span>
            </div>
            <span className="text-3xl font-bold mb-1">{volume.toLocaleString()} <span className="text-base font-medium text-muted-foreground">kg</span></span>
            <p className="text-xs text-muted-foreground mt-auto">Total weight lifted across all completed sets.</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-muted/20 border-muted">
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <div className="flex items-center space-x-2 mb-2 text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span className="text-xs uppercase font-semibold tracking-wider">Sets / Ex</span>
            </div>
            <span className="text-3xl font-bold mb-1">{totalSets} <span className="text-base font-medium text-muted-foreground">/ {completedExercises}</span></span>
            <p className="text-xs text-muted-foreground mt-auto">Total completed sets and exercises.</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-muted/20 border-muted">
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <div className="flex items-center space-x-2 mb-2 text-muted-foreground">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-xs uppercase font-semibold tracking-wider">Estimated Calories</span>
            </div>
            <span className="text-3xl font-bold mb-1">{calories} <span className="text-base font-medium text-muted-foreground">kcal</span></span>
            <p className="text-xs text-muted-foreground mt-auto">Based on body weight, duration and workout intensity.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Advanced Performance Engine Metrics */}
        <Card className="md:col-span-1 border-primary/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <CardContent className="p-6 flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-muted-foreground font-medium flex items-center">
                  <Target className="w-4 h-4 mr-1.5" /> Workout Quality Score
                </p>
                <h3 className={`text-4xl font-black tracking-tighter mt-1 ${getQualityColor(quality.score)}`}>
                  {quality.score}<span className="text-lg text-muted-foreground font-semibold">/100</span>
                </h3>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  quality.score >= 90 ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                  quality.score >= 75 ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                  quality.score >= 50 ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                  'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                }`}>
                {quality.rating}
              </div>
            </div>
            <Progress value={quality.score} className="h-2 mb-3" />
            <p className="text-xs text-muted-foreground mt-auto">Overall assessment of session effectiveness.</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-1 border-muted">
          <CardContent className="p-6 flex flex-col h-full">
             <p className="text-sm text-muted-foreground font-medium flex items-center mb-1">
                <Zap className="w-4 h-4 mr-1.5 text-yellow-500" /> Training Density
             </p>
             <div className="flex items-baseline space-x-1 mb-2">
               <h3 className="text-3xl font-bold">{density}</h3>
               <span className="text-muted-foreground font-medium">kg/min</span>
             </div>
             <p className="text-xs text-muted-foreground mt-auto">Rate of volume accumulation over time.</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-1 border-muted">
          <CardContent className="p-6 flex flex-col h-full">
             <p className="text-sm text-muted-foreground font-medium flex items-center mb-1">
                <Activity className="w-4 h-4 mr-1.5 text-blue-500" /> Session Intensity
             </p>
             <div className="flex items-baseline space-x-1 mb-2">
               <h3 className="text-3xl font-bold">{intensity}</h3>
               <span className="text-muted-foreground font-medium">sets/min</span>
             </div>
             <p className="text-xs text-muted-foreground mt-auto">Pace of work based on sets completed per minute.</p>
          </CardContent>
        </Card>
      </div>

      {stimulusData.top3Muscles.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center">
            <Dumbbell className="mr-2 h-5 w-5" /> Muscle Impact
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-muted-foreground font-medium uppercase tracking-wider">Muscle Stimulus</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <div className="space-y-4 mb-4">
                  {stimulusData.top3Muscles.map((muscle, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1 font-medium">
                        <span className="capitalize">{muscle.muscle}</span>
                        <span className="text-muted-foreground">{muscle.score} pts</span>
                      </div>
                      {/* Scale the max score to 100 for visual effect */}
                      <Progress 
                        value={(muscle.score / Math.max(10, stimulusData.top3Muscles[0].score)) * 100} 
                        className="h-2 bg-muted/30" 
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-auto">Top 3 muscles targeted in this session.</p>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20 flex flex-col justify-center">
              <CardContent className="p-6 text-center flex flex-col h-full justify-center">
                <BatteryMedium className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-1">Recovery Estimate</h3>
                <div className="text-4xl font-black text-primary mb-2">
                  {stimulusData.primaryRecoveryHours} <span className="text-xl">hrs</span>
                </div>
                <p className="text-sm text-muted-foreground mt-auto pt-4">
                  Suggested rest for {stimulusData.top3Muscles[0]?.muscle} before training again.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold tracking-tight mb-4">Exercise Log</h2>
      
      <div className="space-y-4">
        {session.exercises.map((exercise, index) => {
          const isCompleted = exercise.performedSets.some(set => set.completed);
          
          let progression: ProgressionResult | null = null;
          if (isCompleted && exercise.plannedRepRange) {
             const mg = exercise.exerciseId?.muscleGroup?.toLowerCase() || "";
             const isLowerBody = mg === "legs" || mg === "glutes" || mg === "calves";
             progression = getProgressionRecommendation(
                exercise.previousExercise || null,
                exercise,
                exercise.plannedRepRange,
                isLowerBody
             );
          }
          
          return (
            <Card key={index} className={!isCompleted ? "opacity-60 bg-muted/30" : "border-muted shadow-sm hover:border-primary/30 transition-colors"}>
              <CardHeader className="py-4 bg-muted/10">
                <CardTitle className="text-lg flex justify-between items-center">
                  <span>{exercise.exerciseId ? exercise.exerciseId.name : "Unknown Exercise"}</span>
                </CardTitle>
                {exercise.exerciseId && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {exercise.exerciseId.primaryMuscle && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">
                        {exercise.exerciseId.primaryMuscle}
                      </span>
                    )}
                    {exercise.exerciseId.isCompound && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-xs font-medium">
                        Compound
                      </span>
                    )}
                  </div>
                )}
                {exercise.notes && (
                  <CardDescription className="mt-2">Notes: {exercise.notes}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-4 pb-4">
                <div className="space-y-1">
                  <div className="grid grid-cols-4 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                    <div>Set</div>
                    <div className="text-center">kg</div>
                    <div className="text-center">Reps</div>
                    <div className="text-right">Status</div>
                  </div>
                  
                  {exercise.performedSets.map((set, setIndex) => (
                    <div 
                      key={setIndex} 
                      className={`grid grid-cols-4 text-sm items-center py-2 px-2 rounded-md ${
                        set.completed ? "bg-muted/30 font-medium" : "text-muted-foreground"
                      }`}
                    >
                      <div className="text-muted-foreground">{setIndex + 1}</div>
                      <div className="text-center">{set.weight > 0 ? set.weight : "-"}</div>
                      <div className="text-center">{set.reps > 0 ? set.reps : "-"}</div>
                      <div className="text-right flex justify-end">
                        {set.completed ? (
                          <div className="flex items-center text-green-500 text-xs font-bold bg-green-500/10 px-2 py-1 rounded">
                            Done
                          </div>
                        ) : (
                          <span className="text-xs">Skipped</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {progression && (
                  <div className="mt-4 pt-4 border-t border-muted/50">
                    <div className="flex items-center space-x-2 mb-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <h4 className="text-sm font-bold text-foreground">Progressive Overload</h4>
                    </div>
                    
                    <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center gap-4 ${
                      progression.recommendation === 'Increase' ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' :
                      progression.recommendation === 'Decrease' ? 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400' :
                      'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400'
                    }`}>
                      <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-background/50 shadow-sm border border-black/5 dark:border-white/5">
                        {progression.recommendation === 'Increase' && <TrendingUp className="h-6 w-6 text-green-500" />}
                        {progression.recommendation === 'Decrease' && <TrendingDown className="h-6 w-6 text-orange-500" />}
                        {progression.recommendation === 'Maintain' && <Minus className="h-6 w-6 text-blue-500" />}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-baseline space-x-2">
                          <span className="font-bold text-lg">{progression.recommendation} Weight</span>
                          <span className="text-sm opacity-80">Next Session:</span>
                          <span className="font-black text-xl">{progression.suggestedWeight} kg</span>
                        </div>
                        <p className="text-sm mt-1 opacity-90 leading-snug">{progression.reason}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        
        {session.exercises.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
            <Dumbbell className="h-8 w-8 mx-auto mb-3 opacity-20" />
            <p>No exercises recorded in this session.</p>
          </div>
        )}
      </div>
    </div>
  );
}
