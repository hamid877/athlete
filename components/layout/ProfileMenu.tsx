"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { updateProfile, type UpdateProfileInput } from "@/actions/profile.actions";
import { LogOut, Settings, X, Loader2, Check, User, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";

/* ─── types ─────────────────────────────────────────────────── */
interface ProfileData {
  name: string;
  email: string;
  age?: number | null;
  gender?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  fitnessGoal?: string | null;
  yearsOfLifting?: number | null;
  workoutDaysPerWeek?: number | null;
  workoutLocation?: string | null;
  injuries?: string | null;
  medicalConditions?: string | null;
}

interface ProfileMenuProps {
  user: ProfileData;
}

/* ─── helpers ────────────────────────────────────────────────── */
function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ─── shared input class ─────────────────────────────────────── */
const inputCls =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all";

/* ─── sub-components ─────────────────────────────────────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
      {children}
    </p>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium text-[var(--text-secondary)]">
      {children}
    </label>
  );
}

/* ════════════════════════════════════════════════════════════════
   Main component
════════════════════════════════════════════════════════════════ */
export function ProfileMenu({ user }: ProfileMenuProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  /* ── close dropdown on outside click ── */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  /* ── form state (all strings — coerced on submit) ── */
  const [form, setForm] = useState({
    age: user.age?.toString() ?? "",
    gender: user.gender ?? "",
    heightCm: user.heightCm?.toString() ?? "",
    weightKg: user.weightKg?.toString() ?? "",
    fitnessGoal: user.fitnessGoal ?? "",
    yearsOfLifting: user.yearsOfLifting?.toString() ?? "",
    workoutDaysPerWeek: user.workoutDaysPerWeek?.toString() ?? "",
    workoutLocation: user.workoutLocation ?? "",
    injuries: user.injuries ?? "",
    medicalConditions: user.medicalConditions ?? "",
  });

  const bind = (name: keyof typeof form) => ({
    value: form[name],
    onChange: (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => setForm((p) => ({ ...p, [name]: e.target.value })),
  });

  /* ── submit ── */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: UpdateProfileInput = {};

    const num = (s: string) => { const n = parseFloat(s); return isNaN(n) ? undefined : n; };

    if (num(form.age) !== undefined) payload.age = num(form.age);
    if (["male","female","other","prefer-not-to-say"].includes(form.gender))
      payload.gender = form.gender as UpdateProfileInput["gender"];
    if (num(form.heightCm) !== undefined) payload.heightCm = num(form.heightCm);
    if (num(form.weightKg) !== undefined) payload.weightKg = num(form.weightKg);
    if (form.fitnessGoal.trim()) payload.fitnessGoal = form.fitnessGoal.trim();
    if (num(form.yearsOfLifting) !== undefined) payload.yearsOfLifting = num(form.yearsOfLifting);
    const wdpw = parseInt(form.workoutDaysPerWeek, 10);
    if (!isNaN(wdpw)) payload.workoutDaysPerWeek = wdpw;
    if (["gym","home"].includes(form.workoutLocation))
      payload.workoutLocation = form.workoutLocation as "gym" | "home";
    payload.injuries = form.injuries;
    payload.medicalConditions = form.medicalConditions;

    startTransition(async () => {
      const result = await updateProfile(payload);
      if (result.success) {
        toast.success("Profile saved!");
        setDrawerOpen(false);
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  const initials = getInitials(user.name);

  return (
    <>
      {/* ── Avatar button + dropdown ─────────────────────────── */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          aria-label="Profile menu"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-white text-sm font-bold ring-2 ring-transparent hover:ring-[var(--primary)]/40 transition-all duration-150 select-none"
        >
          {initials}
        </button>

        {/* dropdown */}
        {dropdownOpen && (
          <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-56 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_32px_rgba(0,0,0,0.14)]">
            {/* user info */}
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white text-xs font-bold">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* actions */}
            <div className="py-1">
              <button
                onClick={() => { setDropdownOpen(false); setDrawerOpen(true); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--background-subtle)] hover:text-[var(--text-primary)] transition-colors"
              >
                <Settings className="h-4 w-4 shrink-0" />
                Edit Profile
              </button>

              {/* ── Dark Mode toggle ── */}
              <div className="flex w-full items-center gap-2.5 px-4 py-2.5">
                {isDark ? (
                  <Moon className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                ) : (
                  <Sun className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                )}
                <span className="flex-1 text-sm text-[var(--text-secondary)]">Dark Mode</span>
                <Switch
                  id="dark-mode-toggle"
                  checked={isDark}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  aria-label="Toggle dark mode"
                />
              </div>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-red-50 hover:text-red-600 transition-colors dark:hover:bg-red-950/30"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Profile Drawer ──────────────────────────────── */}
      {drawerOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer */}
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary-subtle)]">
                  <User className="h-5 w-5 text-[var(--primary)]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">
                    Edit Profile
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{user.name}</p>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable form body */}
            <form
              onSubmit={handleSubmit}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7">

                {/* ── Basic Information ── */}
                <section>
                  <SectionTitle>Basic Information</SectionTitle>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel>Age</FieldLabel>
                      <input
                        type="number"
                        placeholder="e.g. 25"
                        className={inputCls}
                        {...bind("age")}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel>Gender</FieldLabel>
                      <select className={inputCls} {...bind("gender")}>
                        <option value="">Select…</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel>Height (cm)</FieldLabel>
                      <input
                        type="number"
                        placeholder="e.g. 175"
                        className={inputCls}
                        {...bind("heightCm")}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel>Weight (kg)</FieldLabel>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 75"
                        className={inputCls}
                        {...bind("weightKg")}
                      />
                    </div>
                  </div>
                </section>

                {/* ── Fitness Information ── */}
                <section>
                  <SectionTitle>Fitness Information</SectionTitle>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <FieldLabel>Fitness Goal</FieldLabel>
                      <input
                        type="text"
                        placeholder="e.g. Build muscle, Lose weight…"
                        className={inputCls}
                        {...bind("fitnessGoal")}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel>Years of Lifting</FieldLabel>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 2"
                        className={inputCls}
                        {...bind("yearsOfLifting")}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel>Workout Days / Week</FieldLabel>
                      <input
                        type="number"
                        min={1}
                        max={7}
                        placeholder="1–7"
                        className={inputCls}
                        {...bind("workoutDaysPerWeek")}
                      />
                    </div>
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <FieldLabel>Workout Location</FieldLabel>
                      <select className={inputCls} {...bind("workoutLocation")}>
                        <option value="">Select…</option>
                        <option value="gym">Gym</option>
                        <option value="home">Home</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* ── Optional ── */}
                <section>
                  <SectionTitle>Optional</SectionTitle>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel>Injuries</FieldLabel>
                      <textarea
                        rows={2}
                        placeholder="Any current or past injuries…"
                        className={`${inputCls} resize-none`}
                        {...bind("injuries")}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel>Medical Conditions</FieldLabel>
                      <textarea
                        rows={2}
                        placeholder="Any relevant medical conditions…"
                        className={`${inputCls} resize-none`}
                        {...bind("medicalConditions")}
                      />
                    </div>
                  </div>
                </section>
              </div>

              {/* Footer — sticky at bottom */}
              <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4 bg-[var(--surface)]">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-4 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-subtle)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {isPending ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </aside>
        </>
      )}
    </>
  );
}
