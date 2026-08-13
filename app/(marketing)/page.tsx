import Link from "next/link";
import {
  Dumbbell,
  TrendingUp,
  Target,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Dumbbell,
    title: "Log Workouts",
    description:
      "Track every set, rep, and weight with an intuitive session logger.",
  },
  {
    icon: TrendingUp,
    title: "Track Progress",
    description:
      "Monitor body composition, strength gains, and personal records over time.",
  },
  {
    icon: Target,
    title: "Set Goals",
    description:
      "Define weight, strength, and habit goals — then crush them with data-driven insights.",
  },
  {
    icon: BarChart3,
    title: "Nutrition Tracking",
    description:
      "Log meals, track macros, and stay on top of your daily calorie targets.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary)]">
              <Dumbbell className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
            <span className="text-base font-semibold text-[var(--text-primary)]">
              Repwise
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-20 pb-16 text-center">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
            Free &amp; open-source
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl">
            Your fitness journey,{" "}
            <span className="text-[var(--primary)]">tracked</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--text-secondary)]">
            Log workouts, track nutrition, monitor progress, and hit your goals
            — all in one place. Built for lifters who take their training
            seriously.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">
                Start tracking
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-[var(--border)] bg-[var(--background-subtle)]">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <h2 className="mb-2 text-center text-sm font-semibold uppercase tracking-wider text-[var(--primary)]">
              Features
            </h2>
            <p className="mb-10 text-center text-2xl font-semibold text-[var(--text-primary)]">
              Everything you need to level up
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-5 transition-shadow duration-150 hover:shadow-[var(--shadow-md)]"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary-subtle)]">
                    <feature.icon
                      className="h-4.5 w-4.5 text-[var(--primary)]"
                      strokeWidth={1.75}
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
          <p className="text-xs text-[var(--text-muted)]">
            &copy; {new Date().getFullYear()} Repwise. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <Dumbbell
              className="h-4 w-4 text-[var(--text-muted)]"
              strokeWidth={1.75}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
