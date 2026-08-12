import { Types } from "mongoose";
import Goal from "@/models/goal.model";
import WorkoutSession from "@/models/WorkoutSession";
import WeightLog from "@/models/weight-log.model";
import { calculatePersonalRecords } from "@/lib/performance/records";
import { getLatestGrowthSnapshot } from "@/lib/growth-intelligence/snapshot.service";
import type { GoalDocument, GoalType } from "@/types";
import { MuscleGrowthDetail } from "@/lib/growth-intelligence/types";
import type { WorkoutSessionDTO } from "@/lib/serializers/workoutSession";

export type SyncTrigger =
  | "workout_completed"
  | "weight_logged"
  | "growth_analyzed"
  | "goal_created";

/**
 * Recalculates and updates the currentValue for a specific goal.
 */
export async function syncGoal(goal: GoalDocument): Promise<void> {
  const userId = goal.userId;
  let newValue = goal.currentValue;

  try {
    switch (goal.type) {
      case "strength": {
        if (!goal.exerciseId) break;
        
        // Find all completed sessions with this exercise
        const sessions = await WorkoutSession.find({
          userId,
          status: "completed",
          "exercises.exerciseId": goal.exerciseId,
        })
          .populate("exercises.exerciseId")
          .lean();

        // calculatePersonalRecords expects WorkoutSessionDTO[] 
        // We'll coerce types to match what's needed for the calculation
        const prs = calculatePersonalRecords(sessions as unknown as WorkoutSessionDTO[]);
        
        // Filter PRs for this exact exercise
        const exPrs = prs.filter(pr => pr.exerciseId.toString() === goal.exerciseId!.toString());
        
        if (goal.unit === "kg" || goal.unit === "lbs") {
          const hw = exPrs.find(pr => pr.type === "heaviest_weight");
          
          if (hw) {
            newValue = hw.numericValue;
          }
        }
        break;
      }

      case "weight": {
        const latestWeight = await WeightLog.findOne({ userId })
          .sort({ date: -1 })
          .lean();

        if (latestWeight) {
          newValue = latestWeight.weightKg;
          // If unit is lbs, convert
          if (goal.unit === "lbs") {
            newValue = Math.round(newValue * 2.20462 * 10) / 10;
          }
        }
        break;
      }

      case "muscle_growth": {
        if (!goal.muscle) break;

        const snapshot = await getLatestGrowthSnapshot(userId.toString());
        if (snapshot && snapshot.muscleDetails) {
          const details = snapshot.muscleDetails as MuscleGrowthDetail[];
          const muscleData = details.find(m => m.muscle === goal.muscle);
          
          if (muscleData) {
            newValue = muscleData.growthPotentialScore;
          }
        }
        break;
      }

      case "consistency": {
        const query: {
          userId: string | Types.ObjectId;
          status: "in_progress" | "completed" | "cancelled";
          startedAt?: { $gte?: Date; $lte?: Date };
        } = {
          userId,
          status: "completed",
        };
        
        if (goal.startDate || goal.targetDate) {
          query.startedAt = {};
          if (goal.startDate) query.startedAt.$gte = goal.startDate;
          if (goal.targetDate) query.startedAt.$lte = goal.targetDate;
        }

        const count = await WorkoutSession.countDocuments(query);
        newValue = count;
        break;
      }
      
      // Other types (bodyFat, nutrition, habit) are outside milestone 2 scope, leave unchanged
      default:
        break;
    }

    const updatePayload: Record<string, unknown> = {};
    let needsUpdate = false;

    if (newValue !== goal.currentValue) {
      updatePayload.currentValue = newValue;
      needsUpdate = true;
    }

    if (goal.initialValue === undefined) {
      updatePayload.initialValue = newValue;
      needsUpdate = true;
    }

    let isAchieved = false;
    const initial = goal.initialValue !== undefined ? goal.initialValue : goal.currentValue;

    if (initial < goal.targetValue) {
      isAchieved = newValue >= goal.targetValue;
    } else if (initial > goal.targetValue) {
      isAchieved = newValue <= goal.targetValue;
    } else {
      isAchieved = newValue === goal.targetValue;
    }

    if (isAchieved && goal.status !== "achieved") {
      updatePayload.status = "achieved";
      needsUpdate = true;
    }

    if (needsUpdate) {
      await Goal.updateOne(
        { _id: goal._id },
        { $set: updatePayload }
      );
    }
  } catch (error) {
    console.error(`Failed to sync goal ${goal._id}:`, error);
  }
}

/**
 * Triggers synchronization for all relevant active goals for a user based on an event.
 */
export async function syncGoalsForUser(
  userId: string | Types.ObjectId,
  trigger: SyncTrigger
): Promise<void> {
  let typesToSync: GoalType[] = [];

  switch (trigger) {
    case "workout_completed":
      typesToSync = ["strength", "consistency"];
      break;
    case "weight_logged":
      typesToSync = ["weight", "bodyFat"];
      break;
    case "growth_analyzed":
      typesToSync = ["muscle_growth"];
      break;
    default:
      return;
  }

  const activeGoals = await Goal.find({
    userId,
    status: "active",
    type: { $in: typesToSync },
  });

  await Promise.all(activeGoals.map(syncGoal));
}
