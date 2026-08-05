import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import WorkoutSession from "@/models/WorkoutSession";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { BottomNav } from "@/components/layout/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectDB();
  const dbUser = await User.findById(session.user.id).lean();

  if (!dbUser || !dbUser.profileCompleted) {
    redirect("/about-myself");
  }

  // Resolve the active session ID so the Workout tab links directly to the
  // live session page instead of always routing through the /workouts hub.
  const activeSessionDoc = await WorkoutSession.findOne(
    { userId: session.user.id, status: "in_progress" },
    { _id: 1 },
  )
    .sort({ startedAt: -1 })
    .lean();
  const activeSessionId = activeSessionDoc ? String(activeSessionDoc._id) : null;

  const profileData = {
    name: dbUser.name,
    email: dbUser.email,
    age: dbUser.age ?? null,
    gender: dbUser.gender ?? null,
    heightCm: dbUser.heightCm ?? null,
    weightKg: dbUser.weightKg ?? null,
    fitnessGoal: dbUser.fitnessGoal ?? null,
    yearsOfLifting: dbUser.yearsOfLifting ?? null,
    workoutDaysPerWeek: dbUser.workoutDaysPerWeek ?? null,
    workoutLocation: dbUser.workoutLocation ?? null,
    injuries: dbUser.injuries ?? null,
    medicalConditions: dbUser.medicalConditions ?? null,
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      {/* ─── Top Header ─── */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md px-5 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-2">
            {/* App logo / wordmark */}
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary)]">
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M2 8h2M12 8h2M5 5l1.5 1.5M9.5 9.5L11 11M5 11l1.5-1.5M9.5 6.5L11 5"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx="8" cy="8" r="2" fill="white" />
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
              Athlete
            </span>
          </div>
          <ProfileMenu user={profileData} />
        </div>
      </header>

      {/* ─── Main content with bottom padding for nav ─── */}
      <main className="flex-1 px-4 pt-5 pb-24 max-w-2xl mx-auto w-full">
        {children}
      </main>

      {/* ─── Bottom Navigation ─── */}
      <BottomNav activeSessionId={activeSessionId} />
    </div>
  );
}
