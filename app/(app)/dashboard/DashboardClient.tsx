"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Flame,
  Dumbbell,
  ChevronRight,
  Plus,
  Calendar,
  TrendingUp,
  Target,
  Play,
  ArrowRight,
  Activity
} from "lucide-react";

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
}

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Error fetching dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-[var(--text-muted)]">
          <Activity className="h-8 w-8 animate-pulse text-[var(--primary)]" />
          <p className="text-sm font-medium animate-pulse">Loading your stats...</p>
        </div>
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
  // We don't have exactly which days were completed in the stats API right now, 
  // so we'll just mock the completedDays for the visualization or leave them empty.
  const completedDays: number[] = [];

  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

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

      {/* ── Today's Workout Card ── */}
      <section aria-label="Today's Workout">
        <div className="rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] p-5 text-white shadow-lg shadow-[var(--primary)]/20 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-white/80" />
                <h2 className="text-sm font-medium text-white/90">Today&apos;s Session</h2>
              </div>
              {activeSession && (
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                  In Progress
                </span>
              )}
            </div>

            {activeSession ? (
              <div>
                <h3 className="text-xl font-bold mb-1">{activeSession.workoutName}</h3>
                <p className="text-sm text-white/80 mb-4">You have an unfinished workout session.</p>
                <Link
                  href={`/workout-sessions/${activeSession._id}`}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[var(--primary)] transition-all hover:bg-white/90 active:scale-[0.98]"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Resume Workout
                </Link>
              </div>
            ) : todayWorkout ? (
              <div>
                <h3 className="text-xl font-bold mb-1">{todayWorkout.name}</h3>
                <p className="text-sm text-white/80 mb-4">
                  {todayWorkout.exercises.length} exercises scheduled for today.
                </p>
                <Link
                  href={`/workouts/${todayWorkout._id}`}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[var(--primary)] transition-all hover:bg-white/90 active:scale-[0.98]"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Start Workout
                </Link>
              </div>
            ) : stats.totalPrograms > 0 ? (
              <div>
                <h3 className="text-xl font-bold mb-1">Rest Day</h3>
                <p className="text-sm text-white/80 mb-4">You have no workouts scheduled for today.</p>
                <Link
                  href="/programs"
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white/20 px-5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/30 active:scale-[0.98]"
                >
                  View Programs
                </Link>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold mb-1">No Active Program</h3>
                <p className="text-sm text-white/80 mb-4">Start a training program to see your daily workouts.</p>
                <Link
                  href="/programs"
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[var(--primary)] transition-all hover:bg-white/90 active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" />
                  Create Program
                </Link>
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
  <p>
    {new Date(lastWorkout.finishedAt).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })}
  </p>
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
