import { MuscleGroup, PrimaryMuscle } from "@/types";

export interface WorkoutFilterConfig {
  muscleGroups: MuscleGroup[];
  primaryMuscles: PrimaryMuscle[];
}

export function getRecommendedFilters(workoutName: string): WorkoutFilterConfig | null {
  const name = workoutName.toLowerCase();
  
  if (name.includes("full body") || name.includes("fullbody")) {
    return null;
  }
  
  if (name.includes("chest")) {
    return {
      muscleGroups: ["chest"],
      primaryMuscles: ["triceps", "front_deltoids", "pectorals", "upper_chest", "lower_chest"]
    };
  }
  
  if (name.includes("back")) {
    return {
      muscleGroups: ["back"],
      primaryMuscles: ["latissimus_dorsi", "trapezius", "rhomboids", "rear_deltoids", "biceps", "lower_back"]
    };
  }
  
  if (name.includes("leg")) {
    return {
      muscleGroups: ["legs", "glutes", "calves"],
      primaryMuscles: ["quadriceps", "hamstrings", "adductors", "abductors", "calves", "tibialis_anterior"]
    };
  }
  
  if (name.includes("push")) {
    return {
      muscleGroups: ["chest", "shoulders"],
      primaryMuscles: ["triceps", "front_deltoids", "lateral_deltoids", "pectorals", "upper_chest", "lower_chest"]
    };
  }
  
  if (name.includes("pull")) {
    return {
      muscleGroups: ["back"],
      primaryMuscles: ["biceps", "rear_deltoids", "latissimus_dorsi", "trapezius", "rhomboids", "lower_back"]
    };
  }
  
  if (name.includes("shoulder")) {
    return {
      muscleGroups: ["shoulders"],
      primaryMuscles: ["front_deltoids", "lateral_deltoids", "rear_deltoids", "trapezius"]
    };
  }
  
  if (name.includes("arm")) {
    return {
      muscleGroups: ["arms"],
      primaryMuscles: ["biceps", "triceps", "forearms"]
    };
  }
  
  if (name.includes("core") || name.includes("abs")) {
    return {
      muscleGroups: ["core"],
      primaryMuscles: ["abs", "obliques"]
    };
  }
  
  return null;
}
