import { OEFENING_IDS, TRAINING_SCHEMA_IDS, VRIJE_TRAINING, trainingen } from "../data/trainingen.js";
import { TRAINING_WEIGHT_UNIT_VERSION } from "./trainingWeightMigration.js";

const SETS = [1, 2, 3];

export function maakTrainingResultaat(sessie, eindTijd = Date.now()) {
  const onderdelen = sessie.oefeningen || trainingen[sessie.training] || trainingen[VRIJE_TRAINING];
  const voltooideOnderdelen = onderdelen.filter((oefening) => sessie.statussen?.[oefening] === "Voltooid");
  if (voltooideOnderdelen.length === 0) throw new Error("Sla minimaal één oefening op.");
  const voltooideKrachtoefeningen = voltooideOnderdelen.filter((oefening) => oefening !== "Cardio");
  const oefeningen = Object.fromEntries(voltooideKrachtoefeningen.map((oefening) => [oefening, sessie.gegevens?.[oefening] || {}]));
  const voltooideSets = voltooideKrachtoefeningen.reduce((totaal, oefening) => totaal
    + SETS.filter((setNummer) => sessie.voltooideSets?.includes(`${oefening}-${setNummer}`)).length, 0);
  const duur = Math.max(1, Math.round((eindTijd - sessie.startTijd) / 1000));
  return {
    trainingId: sessie.trainingId,
    trainingSchemaId: sessie.trainingSchemaId || TRAINING_SCHEMA_IDS[VRIJE_TRAINING],
    datum: new Date(eindTijd).toISOString(), training: VRIJE_TRAINING,
    startTijd: sessie.startTijd, eindTijd, oefeningen,
    oefeningIds: Object.fromEntries(voltooideKrachtoefeningen.map((naam) => [naam, sessie.oefeningIds?.[naam] || OEFENING_IDS[naam]])),
    oefeningDefinities: (sessie.oefeningDefinities || []).filter(({ naam }) => voltooideKrachtoefeningen.includes(naam)),
    cardio: voltooideOnderdelen.includes("Cardio") ? sessie.cardio : {},
    duur, voltooideSets, voltooidAantal: voltooideOnderdelen.length,
    voltooideOefeningen: voltooideOnderdelen.length, totaalOefeningen: onderdelen.length,
    isVolledig: voltooideOnderdelen.length === onderdelen.length,
    status: voltooideOnderdelen.length === onderdelen.length ? "Voltooid" : "Gedeeltelijk",
    weightUnit: "lb", weightUnitVersion: TRAINING_WEIGHT_UNIT_VERSION,
  };
}
