import assert from "node:assert/strict";
import { OEFENING_IDS, OUDE_TRAININGEN, TRAINING_A, TRAINING_B, VRIJE_OEFENINGEN, VRIJE_TRAINING, migreerActieveSessieNaarVrijeTraining } from "../src/data/trainingen.js";
import { maakTrainingResultaat } from "../src/utils/trainingSession.js";
import { berekenPersoonlijkeRecords, normaliseerHistorieItem, vindLaatsteOefeningWaarden } from "../src/utils/trainingHistorie.js";
import { mergeHistorieOpId } from "../src/sync/syncModel.js";

assert.deepEqual(VRIJE_OEFENINGEN, [...OUDE_TRAININGEN[TRAINING_A], ...OUDE_TRAININGEN[TRAINING_B].slice(1)]);
assert.equal(new Set(VRIJE_OEFENINGEN).size, VRIJE_OEFENINGEN.length, "samengevoegd schema mag geen dubbelen bevatten");

const sessie = { trainingId: "vrij-1", training: VRIJE_TRAINING, trainingSchemaId: "vrije-training", startTijd: 1000, statussen: { "Chest Press": "Voltooid", "Leg Press": "Bezig" }, gegevens: { "Chest Press": { 1: { gewicht: "70", reps: "8" } }, "Leg Press": { 1: { gewicht: "100", reps: "10" } } }, cardio: {}, voltooideSets: ["Chest Press-1"] };
const resultaat = maakTrainingResultaat(sessie, 61000);
assert.equal(resultaat.status, "Gedeeltelijk");
assert.deepEqual(Object.keys(resultaat.oefeningen), ["Chest Press"], "niet-opgeslagen oefeningen mogen niet in historie komen");
assert.equal(resultaat.oefeningIds["Chest Press"], OEFENING_IDS["Chest Press"]);

const oudA = normaliseerHistorieItem({ trainingId: "oud-a", training: TRAINING_A, oefeningen: { "Chest Press": { 1: { gewicht: "80", reps: "6" } } } });
const oudB = normaliseerHistorieItem({ trainingId: "oud-b", training: TRAINING_B, oefeningen: { "Leg Press": { 1: { gewicht: "120", reps: "8" } } } });
assert.equal(oudA.training, TRAINING_A); assert.equal(oudA.trainingSchemaId, "training-a");
assert.equal(oudB.training, TRAINING_B); assert.equal(oudB.trainingSchemaId, "training-b");

for (const oudeNaam of [TRAINING_A, TRAINING_B]) {
  const hersteld = migreerActieveSessieNaarVrijeTraining({ trainingId: `actief-${oudeNaam}`, training: oudeNaam, gegevens: { Test: { 1: { gewicht: "1" } } }, statussen: { Test: "Bezig" } });
  assert.equal(hersteld.training, VRIJE_TRAINING); assert.equal(hersteld.trainingSchemaId, "vrije-training");
  assert.equal(hersteld.gegevens.Test[1].gewicht, "1");
}

const historie = [oudA, oudB, normaliseerHistorieItem(resultaat)];
assert.equal(berekenPersoonlijkeRecords(historie)["Chest Press"], 80);
assert.equal(vindLaatsteOefeningWaarden(historie, "Leg Press")[1].gewicht, "120");
assert.deepEqual(mergeHistorieOpId([oudA, oudB], [resultaat]).map(({ trainingId }) => trainingId).sort(), ["oud-a", "oud-b", "vrij-1"], "cloudmerge moet alle historie behouden");
console.log("Alle regressietests voor Vrije training zijn geslaagd.");
