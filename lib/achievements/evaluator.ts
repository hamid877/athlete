import { achievements } from './definitions';
import { IWorkoutSession } from '@/models/WorkoutSession';
import { LockedAchievement, UnlockedAchievement } from './types';

// Simple in-memory cache to prevent re-evaluating unchanged workout histories
const evaluatorCache = new Map<
  string,
  {
    unlocked: UnlockedAchievement[];
    locked: LockedAchievement[];
    metrics: {
      workouts: number;
      days: number;
      kg: number;
      minutes: number;
    };
  }
>();

export function evaluateAchievements(sessions: IWorkoutSession[]) {
  // Only consider completed sessions for most achievements
  const completedSessions = sessions.filter(s => s.status === 'completed' && s.finishedAt);
  
  // Sort sessions by date ascending for streak calculation
  completedSessions.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  // Check cache based on the number of completed sessions and the timestamp of the last session
  const latestSession = completedSessions[completedSessions.length - 1];
  const cacheKey = `${completedSessions.length}-${latestSession ? latestSession.startedAt : 'empty'}`;

  if (evaluatorCache.has(cacheKey)) {
    return evaluatorCache.get(cacheKey);
  }

  // Metrics
  const totalWorkouts = completedSessions.length;
  let totalWeightLifted = 0;
  let maxDurationMinutes = 0;
  
  // Calculate total weight and max duration
  completedSessions.forEach(session => {
    // Weight calculation
    session.exercises.forEach(exercise => {
      exercise.performedSets.forEach(set => {
        if (set.completed && set.weight && set.reps) {
          totalWeightLifted += (set.weight * set.reps);
        }
      });
    });

    // Duration calculation
    if (session.duration) {
      const durationMinutes = session.duration / 60;
      if (durationMinutes > maxDurationMinutes) {
        maxDurationMinutes = durationMinutes;
      }
    } else if (session.finishedAt && session.startedAt) {
      const durationMs = new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime();
      const durationMinutes = durationMs / (1000 * 60);
      if (durationMinutes > maxDurationMinutes) {
        maxDurationMinutes = durationMinutes;
      }
    }
  });

  // Calculate maximum streak
  let maxStreak = 0;
  let currentStreak = 0;
  let lastDateStr = '';

  completedSessions.forEach(session => {
    const dateStr = new Date(session.startedAt).toISOString().split('T')[0];
    if (dateStr === lastDateStr) {
      // Same day, do nothing to streak
    } else if (lastDateStr === '') {
      currentStreak = 1;
      lastDateStr = dateStr;
    } else {
      const lastDate = new Date(lastDateStr);
      const currDate = new Date(dateStr);
      const diffTime = Math.abs(currDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays === 1) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
      lastDateStr = dateStr;
    }
    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
    }
  });

  const metrics = {
    workouts: totalWorkouts,
    days: maxStreak,
    kg: totalWeightLifted,
    minutes: maxDurationMinutes,
  };

  const unlocked: UnlockedAchievement[] = [];
  const locked: LockedAchievement[] = [];

  achievements.forEach(achievement => {
    const metricValue = metrics[achievement.unit as keyof typeof metrics] || 0;
    
    if (metricValue >= achievement.target) {
      unlocked.push({
        ...achievement,
        // Since we don't store exactly when an achievement was unlocked in the DB in this dynamic approach,
        // we'll just set it to the last session date if available, or current date.
        // A more accurate approach would find the exact session that pushed it over the edge, but this is a good approximation.
        unlockedAt: completedSessions.length > 0 ? new Date(completedSessions[completedSessions.length - 1].startedAt) : new Date(),
      });
    } else {
      let progressPercentage = (metricValue / achievement.target) * 100;
      if (progressPercentage > 100) progressPercentage = 100;
      if (progressPercentage < 0) progressPercentage = 0;
      
      locked.push({
        ...achievement,
        currentValue: metricValue,
        progressPercentage,
      });
    }
  });

  const result = { unlocked, locked, metrics };
  evaluatorCache.set(cacheKey, result);
  
  return result;
}
