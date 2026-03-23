export type SleepLog = {
  id: number;
  patient_id: string;
  date: string;
  hours_slept: number;
  quality: number;
  stress_level: number;
  notes: string;
  woke_during_night: boolean;
  trouble_falling_asleep: boolean;
  woke_too_early: boolean;
  created_at: string;
};

export type Medication = {
  name?: string;
  medication?: string;
  dosage?: string;
  status?: string;
  [key: string]: unknown;
};
