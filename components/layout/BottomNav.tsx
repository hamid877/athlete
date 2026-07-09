"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Dumbbell, TrendingUp, Apple, Target } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/workouts", label: "Workout", icon: Dumbbell },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/goals", label: "Goals", icon: Target },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`flex flex-col items-center gap-0.5 min-w-[56px] py-1.5 px-2 rounded-xl transition-colors duration-150 ${
                isActive
                  ? "text-[var(--primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              <Icon
                className={`h-5 w-5 transition-transform duration-150 ${isActive ? "scale-110" : ""}`}
                strokeWidth={isActive ? 2.5 : 1.8}
                aria-hidden="true"
              />
              <span
                className={`text-[10px] font-medium leading-none ${
                  isActive ? "text-[var(--primary)]" : ""
                }`}
              >
                {label}
              </span>
              {isActive && (
                <span className="mt-0.5 h-1 w-1 rounded-full bg-[var(--primary)]" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
