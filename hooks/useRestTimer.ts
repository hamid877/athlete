"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Tick interval in ms. 250 ms is sufficient for whole-second display. */
const TICK_MS = 250;

/** sessionStorage key for persisted timer data. */
const STORAGE_KEY = "restTimer";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Identifiers stored alongside the end-timestamp so the caller can correlate
 *  a restored timer with the correct exercise/set on remount. */
export interface RestTimerContext {
  workoutSessionId: string;
  exerciseId: string;
  setIndex: number;
}

/** Shape of the data written to sessionStorage. */
interface PersistedTimer extends RestTimerContext {
  endTime: number; // epoch ms
}

export interface UseRestTimerReturn {
  /** Whether the timer is actively counting down. */
  active: boolean;
  /** Remaining whole seconds (ceiling), always >= 0. */
  remainingSeconds: number;
  /** Start (or restart) the timer. */
  start: (durationSeconds: number, context: RestTimerContext) => void;
  /** Pause the timer (saves remaining time). */
  pause: () => void;
  /** Resume a paused timer. */
  resume: () => void;
  /** Immediately end the timer without waiting for completion. */
  skip: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Wall-clock-based rest timer that survives browser backgrounding.
 *
 * @param onComplete - Called when the timer reaches zero (naturally or via skip).
 */
export function useRestTimer(onComplete?: () => void): UseRestTimerReturn {
  // ── State ──────────────────────────────────────────────────────────────────
  const [remainingMs, setRemainingMs] = useState(0);
  const [active, setActive] = useState(false);

  // ── Refs (never trigger re-renders) ────────────────────────────────────────
  /** Absolute end timestamp in epoch ms; null when timer is stopped/paused. */
  const endTimeRef = useRef<number | null>(null);
  /** Remaining ms saved when the timer is paused. */
  const pausedMsRef = useRef<number | null>(null);
  /** Mirror of active state, readable inside callbacks without stale closure. */
  const activeRef = useRef(false);
  /** setInterval handle. */
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Always holds the latest onComplete so callbacks never become stale. */
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref fresh on every render.
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  // ── Internal helpers ────────────────────────────────────────────────────────

  const clearTick = useCallback((): void => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /** Fully stop the timer, clear storage, and fire onComplete. */
  const doComplete = useCallback((): void => {
    clearTick();
    endTimeRef.current = null;
    pausedMsRef.current = null;
    activeRef.current = false;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // sessionStorage may be unavailable in some environments; ignore.
    }
    setActive(false);
    setRemainingMs(0);
    onCompleteRef.current?.();
  }, [clearTick]);

  /** Compute remaining ms from endTimeRef and update state; complete if <= 0. */
  const syncRemaining = useCallback((): void => {
    if (endTimeRef.current === null) return;
    const ms = Math.max(0, endTimeRef.current - Date.now());
    setRemainingMs(ms);
    if (ms === 0) {
      doComplete();
    }
  }, [doComplete]);

  /** Start the 250 ms polling interval. */
  const startInterval = useCallback((): void => {
    clearTick();
    intervalRef.current = setInterval(syncRemaining, TICK_MS);
  }, [clearTick, syncRemaining]);

  // ── Mount: restore persisted timer ─────────────────────────────────────────
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(STORAGE_KEY);
    } catch {
      // sessionStorage unavailable; proceed without restoring.
    }
    if (!raw) return;

    let persisted: PersistedTimer;
    try {
      persisted = JSON.parse(raw) as PersistedTimer;
    } catch {
      // Corrupt data; remove and continue.
      try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
      return;
    }

    const ms = Math.max(0, persisted.endTime - Date.now());

    if (ms === 0) {
      // Time elapsed while away — clear storage and fire completion.
      try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
      // Use Promise.resolve to fire after the current render cycle.
      void Promise.resolve().then(() => onCompleteRef.current?.());
      return;
    }

    // Restore active timer.
    // Refs are set synchronously so the interval reads the correct endTime.
    endTimeRef.current = persisted.endTime;
    activeRef.current = true;
    startInterval();
    // setState is called inside a callback (setTimeout), not synchronously in
    // the effect body, which satisfies react-hooks/set-state-in-effect.
    setTimeout(() => {
      setActive(true);
      setRemainingMs(Math.max(0, persisted.endTime - Date.now()));
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty — run once on mount only.


  // ── Visibility / focus re-sync ─────────────────────────────────────────────
  useEffect(() => {
    const onVisibilityChange = (): void => {
      if (document.visibilityState === "visible") {
        syncRemaining();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", syncRemaining);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", syncRemaining);
    };
  }, [syncRemaining]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => () => { clearTick(); }, [clearTick]);

  // ── Public API ─────────────────────────────────────────────────────────────

  const start = useCallback(
    (durationSeconds: number, context: RestTimerContext): void => {
      clearTick();
      const endTime = Date.now() + durationSeconds * 1000;
      endTimeRef.current = endTime;
      pausedMsRef.current = null;
      activeRef.current = true;

      const persisted: PersistedTimer = {
        endTime,
        workoutSessionId: context.workoutSessionId,
        exerciseId: context.exerciseId,
        setIndex: context.setIndex,
      };
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
      } catch {
        // sessionStorage unavailable; timer still works without persistence.
      }

      setActive(true);
      setRemainingMs(durationSeconds * 1000);
      startInterval();
    },
    [clearTick, startInterval],
  );

  const pause = useCallback((): void => {
    if (!activeRef.current || endTimeRef.current === null) return;
    clearTick();
    pausedMsRef.current = Math.max(0, endTimeRef.current - Date.now());
    endTimeRef.current = null;
    activeRef.current = false;
    setActive(false);
  }, [clearTick]);

  const resume = useCallback((): void => {
    if (activeRef.current || pausedMsRef.current === null) return;
    const remaining = pausedMsRef.current;
    const endTime = Date.now() + remaining;
    endTimeRef.current = endTime;
    pausedMsRef.current = null;
    activeRef.current = true;

    // Keep sessionStorage in sync with the new endTime.
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as PersistedTimer;
        p.endTime = endTime;
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(p));
      }
    } catch {
      /* noop */
    }

    setActive(true);
    setRemainingMs(remaining);
    startInterval();
  }, [startInterval]);

  const skip = useCallback((): void => {
    doComplete();
  }, [doComplete]);

  return {
    active,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    start,
    pause,
    resume,
    skip,
  };
}
