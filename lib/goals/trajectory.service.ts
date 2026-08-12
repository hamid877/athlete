import { linearRegressionSlope } from "../growth-intelligence/helpers";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export interface TrajectoryData {
  velocityPerWeek: number;
  velocityPerDay: number;
  estimatedDate: Date | null;
  onTrack: boolean | null;
  isHeadingInRightDirection: boolean;
}

/**
 * Calculates velocity (change per day) using linear regression.
 */
export function calculateVelocity(points: { date: Date; value: number }[]): number {
  if (points.length < 2) return 0;

  const sorted = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
  const baselineTime = sorted[0].date.getTime();

  const formattedPoints = sorted.map((p) => ({
    x: (p.date.getTime() - baselineTime) / MS_PER_DAY,
    y: p.value,
  }));

  // Prevent massive rates if points are all on same day
  const uniqueDays = new Set(formattedPoints.map((p) => Math.round(p.x)));
  if (uniqueDays.size < 2) {
    return 0;
  }

  return linearRegressionSlope(formattedPoints);
}

/**
 * Calculates whether the current value is meeting or exceeding the expected
 * linear trajectory between initialValue and targetValue.
 */
export function calculateIsOnTrack(
  initial: number,
  current: number,
  target: number,
  startDate: Date,
  targetDate?: Date
): boolean | null {
  if (!targetDate) return null;

  const now = new Date();
  
  // If we've already passed the target date, are we at the goal?
  if (now > targetDate) {
    if (initial < target) {
      return current >= target;
    } else {
      return current <= target;
    }
  }

  const totalDuration = targetDate.getTime() - startDate.getTime();
  if (totalDuration <= 0) return null;

  const elapsedDuration = now.getTime() - startDate.getTime();
  const progressRatio = Math.max(0, Math.min(1, elapsedDuration / totalDuration));

  const expectedValue = initial + (target - initial) * progressRatio;

  if (initial < target) {
    return current >= expectedValue;
  } else {
    // Weight loss etc.
    return current <= expectedValue;
  }
}

/**
 * Determines if velocity is moving toward the target.
 */
export function isHeadingInRightDirection(
  initial: number,
  target: number,
  velocityPerDay: number
): boolean {
  if (velocityPerDay === 0) return false;
  if (initial < target && velocityPerDay > 0) return true;
  if (initial > target && velocityPerDay < 0) return true;
  return false;
}

/**
 * Estimates achievement date if moving in the right direction.
 */
export function estimateAchievementDate(
  initial: number,
  current: number,
  target: number,
  velocityPerDay: number
): Date | null {
  if (!isHeadingInRightDirection(initial, target, velocityPerDay)) {
    return null;
  }

  const distanceLeft = target - current;
  const daysToTarget = distanceLeft / velocityPerDay;

  // If distanceLeft is 0 or we overshot, it's achieved today
  if (
    (initial < target && distanceLeft <= 0) ||
    (initial > target && distanceLeft >= 0)
  ) {
    return new Date();
  }

  // Safety against absurdly long projections (e.g., > 10 years)
  if (daysToTarget > 3650) {
    return null;
  }

  const estDate = new Date();
  estDate.setTime(estDate.getTime() + daysToTarget * MS_PER_DAY);
  return estDate;
}

export function generateTrajectory(
  initial: number,
  current: number,
  target: number,
  startDate: Date,
  points: { date: Date; value: number }[],
  targetDate?: Date
): TrajectoryData {
  const velocityPerDay = calculateVelocity(points);
  const velocityPerWeek = velocityPerDay * 7;
  
  const estimatedDate = estimateAchievementDate(initial, current, target, velocityPerDay);
  const onTrack = calculateIsOnTrack(initial, current, target, startDate, targetDate);
  const rightDirection = isHeadingInRightDirection(initial, target, velocityPerDay);

  return {
    velocityPerDay,
    velocityPerWeek,
    estimatedDate,
    onTrack,
    isHeadingInRightDirection: rightDirection,
  };
}
