import assert from "node:assert/strict";
import { OEFENING_IDS, VRIJE_TRAINING } from "../src/data/trainingen.js";

const opslag = new Map();
globalThis.localStorage = {
  get length() { return opslag.size; },
  getItem: (key) => opslag.has(key) ? opslag.get(key) : null,
  setItem: (key, value) => opslag.set(key, String(value)),
  removeItem: (key) => opslag.delete(key),
  key: (index) => [...opslag.keys()][index] ?? null,
};

const { normaliseerTrainingSessie } = await import("../src/utils/trainingSessionNormalization.js");
const { leesActieveTraining, ACTIEVE_TRAINING_HERSTELKOPIE_KEY } = await import("../src/sync/localCache.js");

const legacyBasis = {
  trainingId: "legacy-actief",
  training: VRIJE_TRAINING,
  startTijd: 1000,
  weightUnit: "lb",
  weightUnitVersion: 1,
  gegevens: { "Chest Press": { 1: { gewicht: "80", reps: "9" } } },
};

const zonderIds = normaliseerTrainingSessie(legacyBasis);
assert.ok(Array.isArray(zonderIds.oefeningen));
assert.equal(zonderIds.oefeningIds["Chest Press"], OEFENING_IDS["Chest Press"]);
assert.equal(zonderIds.gegevens["Chest Press"][1].gewicht, "80");

const idsAlsLegacyArray = normaliseerTrainingSessie({
  ...legacyBasis,
  oefeningIds: [{ naam: "Eigen Row", id: "custom-11111111-1111-4111-8111-111111111111" }],
  oefeningDefinities: [{ naam: "Eigen Row", id: "custom-11111111-1111-4111-8111-111111111111" }],
});
assert.equal(idsAlsLegacyArray.oefeningIds["Eigen Row"], "custom-11111111-1111-4111-8111-111111111111");

const ontbrekendeOefeningen = normaliseerTrainingSessie({ ...legacyBasis, oefeningen: undefined });
assert.ok(ontbrekendeOefeningen.oefeningen.includes("Chest Press"));
const alleenOudOefeningenObject = normaliseerTrainingSessie({
  ...legacyBasis,
  gegevens: undefined,
  oefeningen: { "Chest Press": { 1: { gewicht: "80", reps: "9" } } },
});
assert.equal(alleenOudOefeningenObject.gegevens["Chest Press"][1].gewicht, "80");
assert.deepEqual(normaliseerTrainingSessie({ ...legacyBasis, statussen: undefined }).statussen, {});
assert.deepEqual(normaliseerTrainingSessie({ ...legacyBasis, gegevens: undefined }).gegevens, {});
assert.deepEqual(normaliseerTrainingSessie({ ...legacyBasis, voltooideSets: undefined }).voltooideSets, []);

const customId = "custom-22222222-2222-4222-8222-222222222222";
const metCustom = normaliseerTrainingSessie({
  ...legacyBasis,
  oefeningen: ["Chest Press", "Cable Fly"],
  oefeningIds: { "Chest Press": OEFENING_IDS["Chest Press"], "Cable Fly": customId },
  oefeningDefinities: [{ naam: "Cable Fly", id: customId }],
});
assert.equal(metCustom.oefeningIds["Cable Fly"], customId);

localStorage.setItem("aangepasteOefeningen", JSON.stringify({
  schemaVersion: 2, schemas: { "vrije-training": [] }, verwijderdeIds: [customId],
}));
const metTombstone = normaliseerTrainingSessie(metCustom);
assert.equal(metTombstone.oefeningen.includes("Cable Fly"), false);
assert.equal(metTombstone.oefeningIds["Cable Fly"], undefined);

const vreemdeOefeningen = normaliseerTrainingSessie({
  ...legacyBasis,
  oefeningen: { schemaVersion: 2, schemas: { "vrije-training": [] }, verwijderdeIds: [] },
  statussen: null,
  voltooideSets: { "Chest Press-1": true, "Chest Press-2": false },
});
assert.ok(Array.isArray(vreemdeOefeningen.oefeningen), "schema-2-object moet vóór .filter() naar een array worden hersteld");
assert.deepEqual(vreemdeOefeningen.voltooideSets, ["Chest Press-1"]);
assert.doesNotThrow(() => vreemdeOefeningen.oefeningen.filter(Boolean));

const eenmaal = normaliseerTrainingSessie(vreemdeOefeningen);
const tweemaal = normaliseerTrainingSessie(eenmaal);
assert.deepEqual(tweemaal, eenmaal, "normalisatie moet idempotent zijn");

localStorage.removeItem("aangepasteOefeningen");
localStorage.setItem("actieveTraining", JSON.stringify({ ...legacyBasis, oefeningen: { "Chest Press": legacyBasis.gegevens["Chest Press"] } }));
const uitOpslag = leesActieveTraining();
assert.ok(Array.isArray(uitOpslag.oefeningen));
assert.equal(JSON.parse(localStorage.getItem("actieveTraining")).gegevens["Chest Press"][1].reps, "9");

localStorage.setItem("actieveTraining", JSON.stringify("onherstelbaar"));
assert.equal(leesActieveTraining(), null);
assert.equal(localStorage.getItem(ACTIEVE_TRAINING_HERSTELKOPIE_KEY), JSON.stringify("onherstelbaar"));

console.log("Alle legacy-sessienormalisatie- en productiecrashregressietests zijn geslaagd.");
