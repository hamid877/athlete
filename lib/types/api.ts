export interface MuscleStimulus {
  muscle: string;
  stimulusScore: number;
  quality: string;
  recommendation: string;
}

export interface StimulusAPIResponse {
  stimulus: MuscleStimulus[];
  generatedAt: string;
}
export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  type: string;
  value: string;
  numericValue: number;
  achievedAt: string;
  sessionId: string;
}

export interface RecordsAPIResponse {
  recent: PersonalRecord[];
  generatedAt: string;
}