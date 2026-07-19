import assert from "node:assert/strict";
import { OEFENING_IDS, TRAINING_A, TRAINING_B, VRIJE_TRAINING } from "../src/data/trainingen.js";
import { berekenPersoonlijkeRecords, vindLaatsteCardioWaarden, vindLaatsteOefeningWaarden } from "../src/utils/trainingHistorie.js";
import { TRAINING_WEIGHT_UNIT_VERSION } from "../src/utils/trainingWeightMigration.js";

const kracht = (trainingId, training, trainingSchemaId, datum, naam, gewicht, extra = {}) => ({
  trainingId, training, trainingSchemaId, datum,
  oefeningen: { [naam]: gewicht === null ? {} : { 1: { gewicht, reps: "8" } } },
  oefeningIds: { [naam]: OEFENING_IDS[naam] }, cardio: {}, ...extra,
  weightUnit: "lb", weightUnitVersion: TRAINING_WEIGHT_UNIT_VERSION,
});

const historie = [
  kracht("b-oud", TRAINING_B, "training-b", "2026-01-02T10:00:00Z", "Leg Press", "110"),
  kracht("a-nieuw", TRAINING_A, "training-a", "2026-01-04T10:00:00Z", "Chest Press", "80"),
  kracht("a-oud", TRAINING_A, "training-a", "2026-01-01T10:00:00Z", "Chest Press", "70"),
  kracht("vrij-nieuwst", VRIJE_TRAINING, "vrije-training", "2026-01-05T10:00:00Z", "Chest Press", "85"),
  kracht("niet-opgeslagen", VRIJE_TRAINING, "vrije-training", "2026-01-06T10:00:00Z", "Leg Press", null),
  { trainingId: "cardio-a", training: TRAINING_A, trainingSchemaId: "training-a", datum: "2026-01-03T10:00:00Z", oefeningen: {}, cardio: { type: "Fiets", tijd: "20" } },
  { trainingId: "cardio-b", training: TRAINING_B, trainingSchemaId: "training-b", datum: "2026-01-07T10:00:00Z", oefeningen: {}, cardio: { type: "Loopband", tijd: "30" } },
  { trainingId: "cardio-leeg", training: VRIJE_TRAINING, trainingSchemaId: "vrije-training", datum: "2026-01-08T10:00:00Z", oefeningen: {}, cardio: {} },
];

assert.equal(vindLaatsteOefeningWaarden(historie, OEFENING_IDS["Chest Press"])[1].gewicht, "85", "A-oefening moet historiebreed gevonden worden en nieuwste waarde moet winnen");
assert.equal(vindLaatsteOefeningWaarden(historie, OEFENING_IDS["Leg Press"])[1].gewicht, "110", "B-oefening moet in Vrije training beschikbaar blijven");
assert.equal(vindLaatsteCardioWaarden(historie).tijd, "30", "nieuwste geldige Cardio moet winnen");
assert.equal(berekenPersoonlijkeRecords(historie)["Chest Press"], 85, "records moeten schema-overstijgend blijven werken");
assert.equal(berekenPersoonlijkeRecords(historie)["Leg Press"], 110, "lege niet-opgeslagen data mag records niet beïnvloeden");
console.log("Alle regressietests voor laatste oefeningwaarden zijn geslaagd.");
