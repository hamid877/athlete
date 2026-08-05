"use client";
import type { RecordsAPIResponse } from "@/lib/types/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Flame,
  Dumbbell,
  ChevronRight,
  Plus,
  TrendingUp,
  Target,
  Play,
  ArrowRight,
  Activity
} from "lucide-react";
import { MuscleStimulusCard } from "./MuscleStimulusCard";
import { RecentPRsCard } from "./RecentPRsCard";
import { GrowthIntelligenceCard } from "./GrowthIntelligenceCard";
import type { StimulusAPIResponse } from "@/lib/types/api";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
/* ── helpers ── */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getFirstName(name: string): string {
  return name.split(" ")[0];
}

/* ── sub-components ── */
function StatPill({
  label,
  value,
  unit,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
          {label}
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary-subtle)]">
          <Icon className="h-3.5 w-3.5 text-[var(--primary)]" aria-hidden="true" />
        </div>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold text-[var(--text-primary)] leading-none">
          {value}
        </span>
        {unit && (
          <span className="text-sm font-medium text-[var(--text-muted)] mb-0.5">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  description,
  accent = false,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 rounded-2xl p-4 transition-all active:scale-[0.98] ${
        accent
          ? "bg-[var(--primary)] text-white"
          : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--border-hover)]"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          accent ? "bg-white/20" : "bg-[var(--primary-subtle)]"
        }`}
      >
        <Icon
          className={`h-5 w-5 ${accent ? "text-white" : "text-[var(--primary)]"}`}
          aria-hidden="true"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold leading-tight ${
            accent ? "text-white" : "text-[var(--text-primary)]"
          }`}
        >
          {label}
        </p>
        <p
          className={`mt-0.5 text-xs leading-tight ${
            accent ? "text-white/70" : "text-[var(--text-muted)]"
          }`}
        >
          {description}
        </p>
      </div>
      <ChevronRight
        className={`h-4 w-4 shrink-0 ${accent ? "text-white/60" : "text-[var(--text-muted)]"}`}
        aria-hidden="true"
      />
    </Link>
  );
}

/* ════════════════════════════════════════════════════════════════
   Client Component
════════════════════════════════════════════════════════════════ */

interface DashboardStats {
  totalPrograms: number;
  completedSessions: number;
  totalExercisesLogged: number;
  currentStreak: number;
  weeklyWorkouts: number;
  weeklyGoal: number;
}

interface ActiveSession {
  _id: string;
  workoutId: string;
  workoutName: string;
  startedAt: string;
  status: "in_progress";
}

interface LastWorkout {
  name: string;
  duration?: number;
  finishedAt?: string;
}

interface TodayWorkout {
  _id: string;
  name: string;
  isRestDay: boolean;
  exercises: {
    exerciseId: string;
  }[];
}

interface DashboardData {
  user: {
    name: string;
    email?: string | null;
    image?: string | null;
  };
  stats: DashboardStats;
  activeSession: ActiveSession | null;
  lastWorkout: LastWorkout | null;
  todayWorkout: TodayWorkout | null;
  isTodayWorkoutCompleted: boolean;
}

interface RecoveryMuscleFatigue {
  muscle: string;
  recovery: number;
  status: "Recovered" | "Recovering" | "fully_recovered";
  hoursRemaining: number;
  fatigue: number;
}

interface WorkoutRecommendation {
  workout: string;
  reason: string;
}

interface RecoveryAPIResponse {
  muscles: RecoveryMuscleFatigue[];
  recommendation: WorkoutRecommendation;
  generatedAt: string;
}

interface VolumeAPIResponse {
  muscles: {
    muscle: string;
    weeklySets: number;
    targetMin: number;
    targetMax: number;
    status: string;
    recommendation: string;
  }[];
  generatedAt: string;
}


export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [recoveryData, setRecoveryData] = useState<RecoveryAPIResponse | null>(null);
  const [volumeData, setVolumeData] = useState<VolumeAPIResponse | null>(null);
  const [stimulusData, setStimulusData] = useState<StimulusAPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryError, setRecoveryError] = useState(false);
  const [volumeError, setVolumeError] = useState(false);
  const [stimulusError, setStimulusError] = useState(false);
  const [recordsData, setRecordsData] =
  useState<RecordsAPIResponse | null>(null);
  const [recordsError, setRecordsError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, recRes, volRes, stimRes, recordsRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/recovery"),
          fetch("/api/volume"),
          fetch("/api/stimulus"),
          fetch("/api/records"),
        ]);
        if (dashRes.ok) {
          setData(await dashRes.json());
        }
        if (recRes.ok) {
          setRecoveryData(await recRes.json());
        } else {
          setRecoveryError(true);
        }
        if (volRes.ok) {
          setVolumeData(await volRes.json());
        } else {
          setVolumeError(true);
        }
        if (stimRes.ok) {
          setStimulusData(await stimRes.json());
        } else {
          setStimulusError(true);
        }
        if (recordsRes.ok) {
          setRecordsData(await recordsRes.json());
        } else {
          setRecordsError(true);
        }
      } catch (err) {
        console.error("Error fetching data", err);
        setRecoveryError(true);
        setVolumeError(true);
        setStimulusError(true);
        setRecordsError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    // Skeleton loader
    return (
      <div className="flex flex-col gap-5 p-4">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-48 w-full rounded-2xl mb-6" />
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl mb-6" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">Failed to load dashboard.</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const { user, stats, lastWorkout, activeSession, todayWorkout } = data;
  const firstName = getFirstName(user?.name || "Athlete");
  const greeting = getGreeting();

  const workoutGoal = stats.weeklyGoal || 5;
  const weekProgress = stats.weeklyWorkouts || 0;
  const progressPct = Math.min((weekProgress / workoutGoal) * 100, 100);

  // Derive today's day logic for WeekDayBar
  const today = new Date().getDay(); // 0 = Sunday
  const completedDays: number[] = [];
  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Sort muscles by lowest recovery first
  const sortedMuscles = recoveryData?.muscles
    ? [...recoveryData.muscles].sort((a, b) => a.recovery - b.recovery)
    : [];

  return (
    <div className="flex flex-col gap-5">
      {/* ── Greeting ── */}
      <section aria-label="Greeting">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-widest mb-0.5">
          {greeting}
        </p>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] leading-tight">
          {firstName} 👋
        </h1>
      </section>

      {/* ── Growth Intelligence ── */}
      <section aria-label="Growth Intelligence">
        <GrowthIntelligenceCard />
      </section>

      {/* ── Today's Recommendation Card ── */}
      <section aria-label="Today's Recommendation">
        <div className="rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] p-5 text-white shadow-lg shadow-[var(--primary)]/20 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-white/80" />
                <h2 className="text-sm font-medium text-white/90">Today&apos;s Recommendation</h2>
              </div>
              {activeSession && (
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                  In Progress
                </span>
              )}
            </div>

            {activeSession ? (
              // State 2: Active workout exists
              <div>
                <h3 className="text-xl font-bold mb-1">{activeSession.workoutName}</h3>
                <p className="text-sm text-white/80 mb-4">You have a workout in progress.</p>
                <Link
                  href={`/workout-sessions/${activeSession._id}`}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[var(--primary)] transition-all hover:bg-white/90 active:scale-[0.98]"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Resume Workout
                </Link>
              </div>
            ) : data?.isTodayWorkoutCompleted && todayWorkout ? (
              // State 3: Today's planned workout completed
              <div>
                <h3 className="text-xl font-bold mb-1">Workout Completed</h3>
                <p className="text-sm text-white/80 mb-4">
                  Great job! Focus on recovery for the remainder of the day.
                </p>
                <Link
                  href="/programs"
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white/20 px-5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/30 active:scale-[0.98]"
                >
                  View Programs
                </Link>
              </div>
            ) : recoveryError || !recoveryData ? (
              // Fallback: Error state
              <div>
                <h3 className="text-xl font-bold mb-1">Recommendation Unavailable</h3>
                <p className="text-sm text-white/80 mb-4">Unable to load recovery data.</p>
                <Link
                  href="/programs"
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[var(--primary)] transition-all hover:bg-white/90 active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" />
                  View Programs
                </Link>
              </div>
            ) : (
              // State 1: No workout started today
              <div>
                <h3 className="text-xl font-bold mb-1">{recoveryData.recommendation.workout}</h3>
                <p className="text-sm text-white/80 mb-4">
                  {recoveryData.recommendation.reason}
                </p>
                {todayWorkout ? (
                  <Link
                    href={`/workouts/${todayWorkout._id}`}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[var(--primary)] transition-all hover:bg-white/90 active:scale-[0.98]"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Start Workout
                  </Link>
                ) : (
                  <Link
                    href="/programs"
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[var(--primary)] transition-all hover:bg-white/90 active:scale-[0.98]"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Start Workout
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Weekly progress ring ── */}
      <section
        aria-label="Weekly progress"
        className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              This Week
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {weekProgress} of {workoutGoal} workouts
            </p>
          </div>
          <div className="relative flex h-12 w-12 items-center justify-center">
            {/* SVG ring */}
            <svg
              className="absolute inset-0 -rotate-90"
              viewBox="0 0 48 48"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="24" cy="24" r="20" stroke="var(--background-subtle)" strokeWidth="4" />
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="var(--primary)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - progressPct / 100)}`}
                style={{ transition: "stroke-dashoffset 0.8s ease" }}
              />
            </svg>
            <span className="relative text-xs font-bold text-[var(--text-primary)]">
              {weekProgress}/{workoutGoal}
            </span>
          </div>
        </div>

        <div className="flex items-end justify-between gap-1 mt-6">
          {days.map((day, i) => {
            const isToday = i === today;
            const isDone = completedDays.includes(i);
            return (
              <div key={day} className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={`w-full rounded-lg transition-all ${
                    isDone
                      ? "bg-[var(--primary)] h-8"
                      : isToday
                      ? "bg-[var(--primary-subtle)] border border-[var(--primary)]/40 h-5"
                      : "bg-[var(--background-subtle)] h-5"
                  }`}
                  aria-label={`${day}: ${isDone ? "completed" : isToday ? "today" : "rest"}`}
                />
                <span
                  className={`text-[10px] font-medium ${
                    isToday
                      ? "text-[var(--primary)]"
                      : isDone
                      ? "text-[var(--text-secondary)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Stats row ── */}
      <section aria-label="Key stats" className="grid grid-cols-3 gap-3">
        <StatPill
          label="Sessions"
          value={stats.completedSessions}
          icon={Dumbbell}
        />
        <StatPill
          label="Streak"
          value={stats.currentStreak}
          unit="d"
          icon={Flame}
        />
        <StatPill
          label="Exercises"
          value={stats.totalExercisesLogged}
          icon={TrendingUp}
        />
      </section>

      {/* ── Last Workout ── */}
      {lastWorkout && (
        <section aria-label="Last Workout">
           <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">
              Last Workout
            </h2>
            <Link
              href="/workouts/history"
              className="text-xs font-medium text-[var(--primary)] hover:underline flex items-center gap-1"
            >
              History <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--background-subtle)]">
                <Dumbbell className="h-5 w-5 text-[var(--text-secondary)]" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {lastWorkout.name}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {lastWorkout.finishedAt && (
                    <span>
                      {new Date(lastWorkout.finishedAt).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </p>
              </div>
            </div>
            {lastWorkout.duration && (
              <div className="text-right">
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {Math.floor(lastWorkout.duration / 60)}<span className="text-xs font-normal text-[var(--text-muted)]">m</span> {lastWorkout.duration % 60}<span className="text-xs font-normal text-[var(--text-muted)]">s</span>
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Recovery ── */}
      <section aria-label="Recovery">
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
          Recovery
        </h2>
        
        {recoveryError ? (
          <div className="rounded-2xl bg-[var(--surface)] border border-red-500/20 p-5 text-center">
            <p className="text-sm text-red-500">Unable to load recovery data.</p>
          </div>
        ) : !recoveryData || sortedMuscles.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-4 w-4" />}
            title="No recovery data"
            description="No recovery data available yet."
            className="p-4 py-8"
          />
        ) : (
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 flex flex-col gap-4">
            {sortedMuscles.map((muscle) => {
              // Determine progress bar color
              let barColor = "bg-green-500";
              if (muscle.recovery < 40) barColor = "bg-red-500";
              else if (muscle.recovery < 70) barColor = "bg-amber-500";

              return (
                <div key={muscle.muscle} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-[var(--text-primary)] capitalize">
                      {muscle.muscle}
                    </span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {Math.round(muscle.recovery)}%
                    </span>
                  </div>
                  
                  <div className="h-2 w-full rounded-full bg-[var(--background-subtle)] overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${barColor} transition-all duration-1000 ease-out`}
                      style={{ width: `${Math.max(0, Math.min(100, muscle.recovery))}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span className="capitalize">{muscle.status.replace("_", " ")}</span>
                    {muscle.hoursRemaining > 0 && (
                      <span>{Math.round(muscle.hoursRemaining)}h remaining</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Weekly Volume ── */}
      <section aria-label="Weekly Volume">
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
          Weekly Volume
        </h2>
        
        {volumeError ? (
          <div className="rounded-2xl bg-[var(--surface)] border border-red-500/20 p-5 text-center">
            <p className="text-sm text-red-500">Unable to load volume data.</p>
          </div>
        ) : !volumeData || volumeData.muscles.length === 0 ? (
          <EmptyState
            icon={<Target className="h-4 w-4" />}
            title="No volume data"
            description="Complete workouts to see analysis."
            className="p-4 py-8"
          />
        ) : (
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 flex flex-col gap-4">
            {volumeData.muscles.map((muscle) => {
              // Determine progress bar color based on status
              let barColor = "bg-amber-500"; // Low/Very Low
              if (muscle.status === "Optimal") barColor = "bg-green-500";
              else if (muscle.status === "High") barColor = "bg-orange-500";
              else if (muscle.status === "Excessive") barColor = "bg-red-500";

              const percentage = Math.min(100, Math.max(0, (muscle.weeklySets / muscle.targetMax) * 100));

              return (
                <div key={muscle.muscle} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-[var(--text-primary)] capitalize">
                      {muscle.muscle}
                    </span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {muscle.weeklySets} / {muscle.targetMax} sets
                    </span>
                  </div>
                  
                  <div className="h-2 w-full rounded-full bg-[var(--background-subtle)] overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${barColor} transition-all duration-1000 ease-out`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1 mt-1 text-xs text-[var(--text-muted)]">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--text-secondary)]">{muscle.status}</span>
                      <span>Target: {muscle.targetMin}-{muscle.targetMax}</span>
                    </div>
                    <p className="opacity-80 leading-tight text-[10px]">{muscle.recommendation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Recent Stimulus ── */}
      <MuscleStimulusCard data={stimulusData} error={stimulusError} />

      {/* ── Recent PRs ── */}
      <RecentPRsCard prs={recordsData?.recent ?? null} error={recordsError} />

      {/* ── Quick actions ── */}
      <section aria-label="Quick actions">
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
          Quick Actions
        </h2>
        <div className="flex flex-col gap-3">
          <QuickAction
            href="/programs"
            icon={Target}
            label="Training Programs"
            description="Manage your splits and routines"
          />
          <QuickAction
            href="/exercises"
            icon={Activity}
            label="Exercise Library"
            description="Browse and add custom exercises"
          />
        </div>
      </section>

      {/* ─── Bottom spacer (extra breathing room above nav) ─── */}
      <div className="h-2" aria-hidden="true" />
    </div>
  );
}
