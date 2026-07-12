export const DATA_VERSION_KEY = "fitnessTrackerDataVersion";
export const DATA_VERSION = 2;

const TRAINING_KEYS = [
  "trainingHistorie",
  "persoonlijkeRecords",
  "personalRecords",
  "actieveTraining",
  "activeTraining",
  "activeWorkout",
  "onafgerondeTraining",
  "rusttimerStatus",
  "restTimer",
  "trainingTimer",
  "tijdelijkeTraining",
];

export function leesJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function migreerTrainingsdata() {
  const huidigeVersie = Number(localStorage.getItem(DATA_VERSION_KEY) || 0);
  if (huidigeVersie >= DATA_VERSION) return false;
  TRAINING_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.setItem(DATA_VERSION_KEY, String(DATA_VERSION));
  return true;
}
