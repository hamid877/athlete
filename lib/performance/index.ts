// Types
export * from './types';

// Constants
export * from './constants';

// Performance calculation functions
export { calculateWorkoutVolume } from './volume';
export { calculateCalories } from './calories';
export { calculateMuscleStimulus } from './stimulus';
export {
  calculateRecovery,
  calculateMuscleRecovery,
  calculateAllRecovery,
  getRecoveryPercentage,
  getRecoveredMuscles,
  getRecoveringMuscles,
  getRecommendedWorkout,
} from './recovery';
export { calculateProgressProjection } from './projections';
export {
  calculateTrainingDensity,
  calculateSessionIntensity,
  calculateWorkoutQuality,
  aggregateSessionStimulus
} from './metrics';
export * from './progression';
export * from './records';


