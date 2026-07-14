export const TRAINING_A = "Training A – Bovenlichaam & buik";
export const TRAINING_B = "Training B – Benen, rug & core";
export const VRIJE_TRAINING = "Vrije training";

export const OUDE_TRAININGEN = {
  [TRAINING_A]: ["Cardio", "Chest Press", "Lat Pull", "Shoulder Press", "Triceps Extension", "Abdominal Crunch"],
  [TRAINING_B]: ["Cardio", "Leg Press", "Calf Press", "Back Extension", "Rotary Torso", "Abdominal"],
};

export const OEFENING_IDS = {
  Cardio: "cardio", "Chest Press": "chest-press", "Lat Pull": "lat-pull",
  "Shoulder Press": "shoulder-press", "Triceps Extension": "triceps-extension",
  "Abdominal Crunch": "abdominal-crunch", "Leg Press": "leg-press", "Calf Press": "calf-press",
  "Back Extension": "back-extension", "Rotary Torso": "rotary-torso", Abdominal: "abdominal",
};

export const VRIJE_OEFENINGEN = [
  ...OUDE_TRAININGEN[TRAINING_A],
  ...OUDE_TRAININGEN[TRAINING_B].filter((oefening) => !OUDE_TRAININGEN[TRAINING_A].includes(oefening)),
];

// Alleen dit schema kan nieuw worden gestart. De oude schema's hieronder blijven
// beschikbaar voor bestaande historie.
export const trainingen = { [VRIJE_TRAINING]: VRIJE_OEFENINGEN };

export const TRAINING_SCHEMA_IDS = {
  [TRAINING_A]: "training-a", [TRAINING_B]: "training-b", [VRIJE_TRAINING]: "vrije-training",
};

export const trainingSchemas = {
  "training-a": { id: "training-a", naam: TRAINING_A, oefeningen: OUDE_TRAININGEN[TRAINING_A] },
  "training-b": { id: "training-b", naam: TRAINING_B, oefeningen: OUDE_TRAININGEN[TRAINING_B] },
  "vrije-training": { id: "vrije-training", naam: VRIJE_TRAINING, oefeningen: VRIJE_OEFENINGEN },
};

export function migreerActieveSessieNaarVrijeTraining(sessie) {
  if (!sessie || typeof sessie !== "object") return sessie;
  const naam = sessie.trainingNaam || sessie.training;
  const isOud = naam === TRAINING_A || naam === TRAINING_B
    || sessie.trainingSchemaId === "training-a" || sessie.trainingSchemaId === "training-b";
  if (!isOud && naam !== VRIJE_TRAINING) return sessie;
  return {
    ...sessie,
    training: VRIJE_TRAINING,
    trainingNaam: VRIJE_TRAINING,
    trainingSchemaId: "vrije-training",
    oefeningIds: { ...Object.fromEntries(VRIJE_OEFENINGEN.map((oefening) => [oefening, OEFENING_IDS[oefening]])), ...(sessie.oefeningIds || {}) },
    ...(isOud ? { gemigreerdVanTraining: naam } : {}),
  };
}

export const volgendeTraining = () => VRIJE_TRAINING;
