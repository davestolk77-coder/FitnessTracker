export const TRAINING_A = "Training A – Bovenlichaam & buik";
export const TRAINING_B = "Training B – Benen, rug & core";

export const trainingen = {
  [TRAINING_A]: [
    "Cardio",
    "Chest Press",
    "Lat Pull",
    "Shoulder Press",
    "Triceps Extension",
    "Abdominal Crunch",
  ],
  [TRAINING_B]: [
    "Cardio",
    "Leg Press",
    "Calf Press",
    "Back Extension",
    "Rotary Torso",
    "Abdominal",
  ],
};

export const TRAINING_SCHEMA_IDS = {
  [TRAINING_A]: "training-a",
  [TRAINING_B]: "training-b",
};

export const trainingSchemas = Object.fromEntries(
  Object.entries(trainingen).map(([naam, oefeningen]) => [TRAINING_SCHEMA_IDS[naam], { id: TRAINING_SCHEMA_IDS[naam], naam, oefeningen }]),
);

export const volgendeTraining = (laatsteTraining) =>
  laatsteTraining === TRAINING_A ? TRAINING_B : TRAINING_A;
