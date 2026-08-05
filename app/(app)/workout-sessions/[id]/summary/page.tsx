import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import WorkoutSession from "@/models/WorkoutSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, Zap, Activity, BatteryMedium,
  TrendingUp, TrendingDown, Minus, Target,
  Dumbbell, Clock, Flame, CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { calculateSetVolume } from "@/lib/performance/volume";
import { calculateCalories } from "@/lib/performance/calories";
import { calculatePersonalRecords, calculateEpley1RM, type PersonalRecord } from "@/lib/performance/records";
import { getGrowthSnapshotHistory } from "@/lib/growth-intelligence/snapshot.service";
import type { MuscleGrowthDetail } from "@/lib/growth-intelligence/types";
import { AchievementsSection } from "@/components/workout/AchievementsSection";
import { serializeWorkoutSession, type PopulatedLeanWorkoutSession } from "@/lib/serializers/workoutSession";
import { AnimatedStatCard } from "@/components/workout/summary/AnimatedStatCard";
import { CelebrationHero, type HighlightType } from "@/components/workout/summary/CelebrationHero";
import "@/models/Workout";
import "@/models/exercise.model";

interface SessionExercise {
  exerciseId?: {
    _id?: { toString: () => string };
    name?: string;
    weightInputType?: string;
    isCompound?: boolean;
    equipment?: string;
  };
  performedSets: {
    completed: boolean;
    weight: number;
    reps: number;
  }[];
}

const formatDuration = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

const getQualityColor = (score: number) => {
  if (score >= 90) return "text-purple-500";
  if (score >= 75) return "text-blue-500";
  if (score >= 50) return "text-green-500";
  if (score >= 30) return "text-yellow-500";
  return "text-red-500";
};

export default async function WorkoutSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const session = await auth();
  if (!session?.user?.id) {
    return notFound();
  }

  const { id } = await params;
  const userId = session.user.id;

  // 1. Fetch Current Session
  const currentSessionDoc = await WorkoutSession.findOne({
    _id: id,
    userId,
  })
    .populate("workoutId")
    .populate("exercises.exerciseId")
    .lean();

  if (!currentSessionDoc) return notFound();

  const currentSession = serializeWorkoutSession(currentSessionDoc as unknown as PopulatedLeanWorkoutSession);
  const durationSecs = currentSessionDoc.duration || 0;
  const durationMins = durationSecs / 60;

  let volume = 0;
  let totalSets = 0;
  let completedExercises = 0;
  const totalPlannedExercises = currentSessionDoc.exercises.length;

  const calorieExercises = (currentSessionDoc.exercises as unknown as SessionExercise[]).map((exercise) => {
    let exCompletedSets = 0;
    exercise.performedSets.forEach((set) => {
      if (set.completed) {
        exCompletedSets++;
        totalSets++;
        volume += calculateSetVolume(set.weight, set.reps, exercise.exerciseId?.weightInputType);
      }
    });
    if (exCompletedSets > 0) completedExercises++;

    return {
      isCompound: exercise.exerciseId?.isCompound ?? false,
      isMachine: exercise.exerciseId?.equipment?.toLowerCase() === "machine",
      isBodyweight: exercise.exerciseId?.equipment?.toLowerCase() === "bodyweight",
      sets: exercise.performedSets.map((s) => ({ weight: s.weight, reps: s.reps })),
    };
  });

  const calories = calculateCalories({
    bodyweightKg: 75, // Ideally fetched from User profile
    durationMinutes: durationMins,
    exercises: calorieExercises,
  });

  // 2. Fetch Previous Session Comparison
  const prevSessionDoc = await WorkoutSession.findOne({
    userId,
    workoutId: currentSession.workoutId?._id,
    status: "completed",
    startedAt: { $lt: new Date(currentSession.startedAt) },
  })
    .populate("exercises.exerciseId")
    .sort({ startedAt: -1 })
    .lean();

  let prevVolume = 0;
  let prevCalories = 0;
  let prevDurationSecs = 0;
  if (prevSessionDoc) {
    prevDurationSecs = prevSessionDoc.duration || 0;
    const prevCalorieExercises = (prevSessionDoc.exercises as unknown as SessionExercise[]).map((exercise) => {
      exercise.performedSets.forEach((set) => {
        if (set.completed) {
          prevVolume += calculateSetVolume(set.weight, set.reps, exercise.exerciseId?.weightInputType);
        }
      });
      return {
        isCompound: exercise.exerciseId?.isCompound ?? false,
        isMachine: exercise.exerciseId?.equipment?.toLowerCase() === "machine",
        isBodyweight: exercise.exerciseId?.equipment?.toLowerCase() === "bodyweight",
        sets: exercise.performedSets.map((s) => ({ weight: s.weight, reps: s.reps })),
      };
    });
    prevCalories = calculateCalories({
      bodyweightKg: 75,
      durationMinutes: prevDurationSecs / 60,
      exercises: prevCalorieExercises,
    });
  }

  // 3. Fetch PRs for current session's exercises
  const exerciseIds = (currentSessionDoc.exercises as unknown as SessionExercise[])
    .map((e) => e.exerciseId?._id?.toString())
    .filter((eId: string | undefined): eId is string => !!eId);
  
  let sessionPrs: PersonalRecord[] = [];
  
  if (exerciseIds.length > 0) {
    const historicalSessionsDoc = await WorkoutSession.find({
      userId,
      status: "completed",
      "exercises.exerciseId": { $in: exerciseIds },
    })
      .populate("exercises.exerciseId")
      .sort({ startedAt: 1 })
      .lean();

    const historicalSessions = historicalSessionsDoc.map((doc) => serializeWorkoutSession(doc as unknown as PopulatedLeanWorkoutSession));
    const allPrs = calculatePersonalRecords(historicalSessions);
    sessionPrs = allPrs.filter((pr) => pr.sessionId.toString() === id.toString());
  }

  // 4. Find Biggest Lift
  interface BiggestLift {
    name: string;
    weight: number;
    reps: number;
    e1rm: number;
    isPr: boolean;
  }
  let biggestLift: BiggestLift | null = null;
  const sessionExercises = currentSessionDoc.exercises as unknown as SessionExercise[];
  
  for (const exercise of sessionExercises) {
    if (!exercise.exerciseId) continue;
    const exIdStr = exercise.exerciseId._id?.toString() || "";
    const name = exercise.exerciseId.name || "Unknown Exercise";
    const isPr = sessionPrs.some(pr => pr.exerciseId.toString() === exIdStr);

    for (const set of exercise.performedSets) {
      if (set.completed && set.weight > 0) {
        const e1rm = calculateEpley1RM(set.weight, set.reps);
        const candidate: BiggestLift = { name, weight: set.weight, reps: set.reps, e1rm, isPr };

        if (!biggestLift) {
          biggestLift = candidate;
        } else {
          // Preference: 1. PR, 2. e1RM, 3. absolute weight
          if (candidate.isPr && !biggestLift.isPr) {
            biggestLift = candidate;
          } else if (!candidate.isPr && biggestLift.isPr) {
            // keep biggestLift
          } else {
            // Tie on PR status, compare e1RM
            if (candidate.e1rm > biggestLift.e1rm) {
              biggestLift = candidate;
            } else if (Math.abs(candidate.e1rm - biggestLift.e1rm) < 1) { 
              if (candidate.weight > biggestLift.weight) {
                biggestLift = candidate;
              }
            }
          }
        }
      }
    }
  }

  // 5. Growth Intelligence
  const snapshots = await getGrowthSnapshotHistory(userId, { limit: 2 });
  const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;
  const prevSnapshot = snapshots.length > 1 ? snapshots[1] : null;

  let giDelta = 0;
  if (latestSnapshot && prevSnapshot) {
    giDelta = Math.round(latestSnapshot.overallScore.value - prevSnapshot.overallScore.value);
  }

  const primaryMuscle = (latestSnapshot?.muscleDetails?.[0] as MuscleGrowthDetail) || null;
  const insight = latestSnapshot?.insights?.[0] || "Consistency is key. Keep up the good work!";

  // 6. Session Score (Grade)
  const completionRate = totalPlannedExercises > 0 ? completedExercises / totalPlannedExercises : 0;
  const baseScore = completionRate * 60; 
  let volumeBonus = 0;
  if (prevVolume > 0 && volume > prevVolume) {
    volumeBonus = Math.min(20, ((volume - prevVolume) / prevVolume) * 100); 
  }
  const prBonus = Math.min(20, sessionPrs.length * 10);
  const sessionScoreNum = baseScore + volumeBonus + prBonus;

  let sessionGrade = "C";
  let sessionGradeExplanation = "";
  if (sessionScoreNum >= 95) {
    sessionGrade = "A+";
    sessionGradeExplanation = "Flawless execution! Excellent volume and PRs.";
  } else if (sessionScoreNum >= 85) {
    sessionGrade = "A";
    sessionGradeExplanation = "Great consistency and solid push.";
  } else if (sessionScoreNum >= 75) {
    sessionGrade = "B";
    sessionGradeExplanation = "Good effort. Keep aiming for progress.";
  } else if (sessionScoreNum >= 65) {
    sessionGrade = "C";
    sessionGradeExplanation = "You showed up, which is what matters. Rest and rebuild.";
  } else {
    sessionGrade = "D";
    sessionGradeExplanation = "A tough day. Any workout is better than none.";
  }

  // 7. Dynamic Hero Message
  let heroMessage = "Solid session! Consistency is the key to progress.";
  let highlightType: HighlightType = "none";
  let heroTitle = "Workout Complete!";

  if (sessionPrs.length > 0) {
    heroTitle = "Incredible Work!";
    heroMessage = `You crushed ${sessionPrs.length} personal record${sessionPrs.length > 1 ? 's' : ''}.`;
    highlightType = "pr";
  } else if (giDelta > 0) {
    heroTitle = "Level Up!";
    heroMessage = "Fantastic! Your Growth Index is trending up.";
    highlightType = "growth";
  } else if (prevVolume > 0 && volume > prevVolume) {
    const pct = Math.round(((volume - prevVolume) / prevVolume) * 100);
    heroTitle = "Pushing Limits!";
    heroMessage = `Great work pushing your limits! Volume increased by ${pct}%.`;
    highlightType = "volume";
  } else if (totalPlannedExercises > 0 && completedExercises === totalPlannedExercises) {
    heroTitle = "Perfect Execution!";
    heroMessage = "You completed every single planned exercise.";
    highlightType = "perfect";
  }

  return (
    <div className="flex flex-col min-h-[100dvh] w-full max-w-4xl mx-auto px-4 py-6 sm:py-10">
      
      {/* HERO SECTION */}
      <CelebrationHero 
        workoutName={currentSession.workoutId ? currentSession.workoutId.name : "Workout Session"}
        dateStr={currentSession.finishedAt
          ? format(new Date(currentSession.finishedAt), "EEEE, MMMM d, yyyy 'at' h:mm a")
          : format(new Date(currentSession.startedAt), "EEEE, MMMM d, yyyy")}
        durationStr={durationSecs ? formatDuration(durationSecs) : "--"}
        heroTitle={heroTitle}
        message={heroMessage}
        highlightType={highlightType}
      />

      {/* ACHIEVEMENTS */}
      <AchievementsSection />

      {/* EXERCISE PROGRESS & SCORE */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-2">
          <h2 className="text-xl font-bold tracking-tight flex items-center">
            <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" /> Session Score
          </h2>
          <span className="text-sm font-semibold text-muted-foreground">{completedExercises} of {totalPlannedExercises} Exercises</span>
        </div>
        <Progress value={totalPlannedExercises > 0 ? (completedExercises / totalPlannedExercises) * 100 : 0} className="h-2" />
        
        <div className="mt-4 p-4 bg-gradient-to-r from-muted/30 to-muted/10 border rounded-lg flex items-center justify-between">
          <div>
            <h3 className="font-bold text-foreground">Grade: {sessionGrade}</h3>
            <p className="text-sm text-muted-foreground">{sessionGradeExplanation}</p>
          </div>
          <div className={`h-12 w-12 rounded-full flex items-center justify-center font-black text-xl border-4 flex-shrink-0 ml-4 ${
            sessionGrade.includes('A') ? 'border-purple-500 text-purple-500 bg-purple-500/10' :
            sessionGrade.includes('B') ? 'border-blue-500 text-blue-500 bg-blue-500/10' :
            sessionGrade.includes('C') ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' :
            'border-gray-500 text-gray-500 bg-gray-500/10'
          }`}>
            {sessionGrade}
          </div>
        </div>
      </div>

      {/* SESSION STATS */}
      <div className="mb-8">
        <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center">
          <Activity className="mr-2 h-5 w-5 text-primary" /> Session Stats
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AnimatedStatCard
            icon={<Dumbbell className="h-4 w-4" />}
            title="Total Volume"
            value={volume}
            unit="kg"
          />
          <AnimatedStatCard
            icon={<Clock className="h-4 w-4" />}
            title="Duration"
            value={Math.round(durationMins)}
            unit="min"
          />
          <AnimatedStatCard
            icon={<Activity className="h-4 w-4" />}
            title="Sets / Ex"
            value={totalSets}
            suffix={` / ${completedExercises}`}
          />
          <AnimatedStatCard
            icon={<Flame className="h-4 w-4 text-orange-500" />}
            title="Est. Calories"
            value={Math.round(calories)}
            unit="kcal"
          />
        </div>
      </div>

      {/* BIGGEST LIFT */}
      {biggestLift && (
        <div className="mb-8">
          <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center">
            <Dumbbell className="mr-2 h-5 w-5 text-blue-500" /> Biggest Lift
          </h2>
          <Card className="border-muted bg-gradient-to-r from-blue-500/5 to-transparent relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
            <CardContent className="p-4 flex items-center space-x-4">
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-600 flex-shrink-0">
                <Dumbbell className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-foreground">{biggestLift.name}</h4>
                <p className="text-sm font-semibold text-muted-foreground">
                  {biggestLift.weight}kg x {biggestLift.reps} reps <span className="opacity-60 font-normal ml-1">(Est. 1RM: {Math.round(biggestLift.e1rm)}kg)</span>
                </p>
              </div>
              {biggestLift.isPr && (
                <div className="ml-auto flex items-center text-xs font-bold text-yellow-600 bg-yellow-500/20 px-2 py-1 rounded-full border border-yellow-500/30">
                  <Trophy className="h-3 w-3 mr-1" /> PR
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* COMPARED TO LAST SIMILAR WORKOUT */}
      {prevSessionDoc && (
        <div className="mb-8">
          <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-green-500" /> Compared to Last Workout
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ComparisonCard title="Volume" current={volume} prev={prevVolume} unit="kg" />
            <ComparisonCard title="Duration" current={durationMins} prev={prevDurationSecs / 60} unit="min" />
            <ComparisonCard title="Calories" current={calories} prev={prevCalories} unit="kcal" />
          </div>
        </div>
      )}

      {/* PERSONAL RECORDS */}
      {sessionPrs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center">
            <Trophy className="mr-2 h-5 w-5 text-yellow-500" /> Personal Records
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessionPrs.map((pr, idx) => (
              <Card key={idx} className="bg-yellow-500/10 border-yellow-500/20 shadow-sm">
                <CardContent className="p-4 flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-600 flex-shrink-0">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{pr.exerciseName}</h4>
                    <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-500">
                      New {pr.type.replace(/_/g, " ")}: {pr.value}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* GROWTH INTELLIGENCE & RECOVERY */}
      {latestSnapshot && (
        <div className="mb-8">
          <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center">
            <Target className="mr-2 h-5 w-5 text-purple-500" /> Growth Intelligence
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Growth Index */}
            <Card className="md:col-span-1 border-primary/20 shadow-sm relative overflow-hidden bg-gradient-to-br from-primary/5 to-transparent">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm text-muted-foreground font-medium flex items-center">
                    Growth Index
                  </p>
                  <div className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getQualityColor(latestSnapshot.overallScore.value)} border-current/20 bg-current/10`}>
                    {latestSnapshot.overallScore.status}
                  </div>
                </div>
                <div className="flex items-end space-x-2 mt-2">
                  <h3 className={`text-5xl font-black tracking-tighter ${getQualityColor(latestSnapshot.overallScore.value)}`}>
                    {Math.round(latestSnapshot.overallScore.value)}
                  </h3>
                  {giDelta !== 0 && (
                    <div className={`flex items-center text-sm font-bold mb-1 ${giDelta > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {giDelta > 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                      {Math.abs(giDelta)}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-auto pt-4">{latestSnapshot.overallScore.explanation}</p>
              </CardContent>
            </Card>

            {/* Most Stimulated Muscle */}
            {primaryMuscle && (
              <Card className="md:col-span-1 border-muted flex flex-col">
                <CardContent className="p-6 flex flex-col h-full">
                  <p className="text-sm text-muted-foreground font-medium flex items-center mb-1">
                    <Zap className="w-4 h-4 mr-1.5 text-yellow-500" /> Primary Focus
                  </p>
                  <h3 className="text-2xl font-bold capitalize mt-2 mb-1">{primaryMuscle.muscle}</h3>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Stimulus Score</span>
                      <span className="font-medium">{Math.round(primaryMuscle.stimulusScore)}/100</span>
                    </div>
                    <Progress value={primaryMuscle.stimulusScore} className="h-1.5 bg-muted" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-auto pt-4">{primaryMuscle.recommendation}</p>
                </CardContent>
              </Card>
            )}

            {/* Recovery Estimate */}
            {primaryMuscle && (
              <Card className="md:col-span-1 border-muted bg-gradient-to-br from-card to-muted/20">
                <CardContent className="p-6 flex flex-col h-full justify-center text-center">
                  <BatteryMedium className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-medium mb-1">Recovery Estimate</p>
                  <div className="text-3xl font-black text-foreground mb-2">
                    {Math.round((100 - primaryMuscle.recoveryPercent) * 0.48)} <span className="text-lg font-medium text-muted-foreground">hrs</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-auto">
                    Suggested rest for {primaryMuscle.muscle}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Session Insight */}
          <Card className="border-muted bg-primary/5">
            <CardContent className="p-4 flex items-start space-x-3">
              <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Session Insight</h4>
                <p className="text-sm text-muted-foreground mt-1">{insight}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ACTIONS */}
      <div className="flex flex-col sm:flex-row gap-4 mt-4">
        <Button size="lg" className="flex-1 font-bold" asChild>
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
        <Button size="lg" variant="outline" className="flex-1 font-bold" asChild>
          <Link href="/workouts/history">View Workout History</Link>
        </Button>
      </div>

    </div>
  );
}

function ComparisonCard({ title, current, prev, unit }: { title: string, current: number, prev: number, unit: string }) {
  const diff = prev > 0 ? current - prev : 0;
  const pct = prev > 0 ? Math.round((diff / prev) * 100) : 0;
  
  return (
    <Card className="border-muted bg-muted/10 shadow-sm">
      <CardContent className="p-4 flex flex-col justify-center">
        <div className="text-xs uppercase font-semibold tracking-wider text-muted-foreground mb-1">{title}</div>
        <div className="flex items-end justify-between">
          <div className="text-lg font-bold">
            {Math.round(current).toLocaleString()} <span className="text-sm font-medium text-muted-foreground ml-0.5">{unit}</span>
          </div>
          {pct !== 0 ? (
            <div className={`flex items-center text-sm font-bold ${pct > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {pct > 0 ? <TrendingUp className="h-4 w-4 mr-0.5" /> : <TrendingDown className="h-4 w-4 mr-0.5" />}
              {Math.abs(pct)}%
            </div>
          ) : (
            <div className="flex items-center text-sm font-bold text-muted-foreground">
              <Minus className="h-4 w-4 mr-0.5" /> 0%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
