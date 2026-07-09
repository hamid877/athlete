import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { redirect } from "next/navigation";
import {
  Flame,
  Dumbbell,
  Zap,
  ChevronRight,
  Plus,
  Calendar,
  TrendingUp,
  Target,
} from "lucide-react";
import Link from "next/link";

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

function WeekDayBar({
  days,
  completedDays,
}: {
  days: string[];
  completedDays: number[];
}) {
  const today = new Date().getDay(); // 0 = Sunday

  return (
    <div className="flex items-end justify-between gap-1">
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
  );
}

/* ════════════════════════════════════════════════════════════════
   Page
════════════════════════════════════════════════════════════════ */
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await connectDB();
  const dbUser = await User.findById(session.user.id)
    .select("name weightKg workoutDaysPerWeek fitnessGoal")
    .lean();

  if (!dbUser) redirect("/login");

  const firstName = getFirstName(dbUser.name);
  const greeting = getGreeting();
  const workoutGoal = dbUser.workoutDaysPerWeek ?? 3;
  const weightKg = dbUser.weightKg ?? null;
  const fitnessGoal = dbUser.fitnessGoal ?? null;

  // Placeholder: no workout data yet
  const totalWorkouts = 0;
  const weeklyWorkouts = 0;
  const streak = 0;
  const completedDays: number[] = []; // will be populated when workout logging is built

  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const weekProgress = weeklyWorkouts;
  const progressPct = Math.min((weekProgress / workoutGoal) * 100, 100);

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
        {fitnessGoal && (
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Goal: <span className="font-medium text-[var(--text-primary)]">{fitnessGoal}</span>
          </p>
        )}
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

        <WeekDayBar days={days} completedDays={completedDays} />
      </section>

      {/* ── Stats row ── */}
      <section aria-label="Key stats" className="grid grid-cols-3 gap-3">
        <StatPill
          label="Workouts"
          value={totalWorkouts}
          icon={Dumbbell}
        />
        <StatPill
          label="Streak"
          value={streak}
          unit="d"
          icon={Flame}
        />
        <StatPill
          label="Weight"
          value={weightKg !== null ? weightKg : "--"}
          unit={weightKg !== null ? "kg" : ""}
          icon={TrendingUp}
        />
      </section>

      {/* ── Quick actions ── */}
      <section aria-label="Quick actions">
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
          Quick Actions
        </h2>
        <div className="flex flex-col gap-3">
          <QuickAction
            href="/workouts/session"
            icon={Plus}
            label="Start Workout"
            description="Log today's training session"
            accent
          />
          <QuickAction
            href="/workouts/history"
            icon={Calendar}
            label="View History"
            description="See past workouts and records"
          />
          <QuickAction
            href="/goals"
            icon={Target}
            label="My Goals"
            description="Track your fitness milestones"
          />
          <QuickAction
            href="/progress"
            icon={Zap}
            label="Progress"
            description="Charts, metrics & personal bests"
          />
        </div>
      </section>

      {/* ── Recent activity placeholder ── */}
      <section aria-label="Recent activity">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">
            Recent Activity
          </h2>
          <Link
            href="/workouts/history"
            className="text-xs font-medium text-[var(--primary)] hover:underline"
          >
            See all
          </Link>
        </div>

        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-8 flex flex-col items-center text-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-subtle)]">
            <Dumbbell className="h-5 w-5 text-[var(--primary)]" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              No workouts yet
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)] max-w-[200px] mx-auto">
              Start logging your sessions to see your activity here.
            </p>
          </div>
          <Link
            href="/workouts/session"
            className="mt-1 inline-flex h-9 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] active:scale-95"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Log First Workout
          </Link>
        </div>
      </section>

      {/* ─── Bottom spacer (extra breathing room above nav) ─── */}
      <div className="h-2" aria-hidden="true" />
    </div>
  );
}
