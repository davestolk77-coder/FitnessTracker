import assert from "node:assert/strict";

const opslag = new Map();
globalThis.localStorage = {
  get length() { return opslag.size; },
  getItem: (key) => opslag.has(key) ? opslag.get(key) : null,
  setItem: (key, value) => opslag.set(key, String(value)),
  removeItem: (key) => opslag.delete(key),
  key: (index) => [...opslag.keys()][index] ?? null,
};

const catalogusApi = await import("../src/utils/customExercises.js");
const { maakTrainingResultaat } = await import("../src/utils/trainingSession.js");
const historieApi = await import("../src/utils/trainingHistorie.js");
const { kilogramNaarPondStap, TRAINING_WEIGHT_UNIT_VERSION } = await import("../src/utils/trainingWeightMigration.js");

const basis = ["Cardio", "Chest Press"];
const toegevoegd = catalogusApi.voegAangepasteOefeningToe("vrije-training", "  Cable Fly  ", basis);
assert.equal(toegevoegd.naam, "Cable Fly");
assert.match(toegevoegd.id, /^custom-[0-9a-f-]{36}$/i);
assert.equal(catalogusApi.leesSchemaOefeningen("vrije-training", basis).at(-1).id, toegevoegd.id);
assert.throws(() => catalogusApi.voegAangepasteOefeningToe("vrije-training", "cable fly", basis), /al in dit trainingsschema/);
assert.throws(() => catalogusApi.voegAangepasteOefeningToe("vrije-training", "   ", basis), /naam/);

const legeSets = Object.fromEntries([1, 2, 3].map((nummer) => [nummer, { gewicht: "", reps: "" }]));
const sessie = {
  trainingId: "custom-sessie", sessionId: "custom-sessie", training: "Vrije training",
  trainingSchemaId: "vrije-training", startTijd: 1000, oefeningen: [...basis, toegevoegd.naam],
  oefeningDefinities: [toegevoegd],
  oefeningIds: { Cardio: "cardio", "Chest Press": "chest-press", [toegevoegd.naam]: toegevoegd.id },
  gegevens: { "Chest Press": { 1: { gewicht: "80", reps: "8" } }, [toegevoegd.naam]: { ...legeSets, 1: { gewicht: "40", reps: "10" } } },
  cardio: {}, statussen: { "Chest Press": "Bezig", [toegevoegd.naam]: "Voltooid" },
  voltooideSets: [`${toegevoegd.naam}-1`], weightUnit: "lb", weightUnitVersion: TRAINING_WEIGHT_UNIT_VERSION,
};
assert.equal(Object.keys(sessie.gegevens[toegevoegd.naam]).length, 3);
assert.equal(sessie.gegevens["Chest Press"][1].gewicht, "80");

const resultaat = maakTrainingResultaat(sessie, 61000);
assert.deepEqual(Object.keys(resultaat.oefeningen), [toegevoegd.naam]);
assert.equal(resultaat.oefeningIds[toegevoegd.naam], toegevoegd.id);
assert.equal(resultaat.oefeningDefinities[0].id, toegevoegd.id);
assert.equal(historieApi.vindLaatsteOefeningWaarden([resultaat], toegevoegd.id)[1].gewicht, "40");
assert.equal(historieApi.berekenPersoonlijkeRecords([resultaat])[toegevoegd.naam], 40);
assert.equal(kilogramNaarPondStap(20), 40);

localStorage.setItem("trainingHistorie", JSON.stringify([resultaat]));
const backup = historieApi.maakFitnessBackupData();
assert.ok(backup.aangepasteOefeningen.schemas["vrije-training"].some(({ id }) => id === toegevoegd.id));
localStorage.setItem("appInstellingen", JSON.stringify({ aangepasteOefeningen: backup.aangepasteOefeningen }));
localStorage.removeItem("aangepasteOefeningen");
assert.equal(catalogusApi.leesSchemaOefeningen("vrije-training", basis).filter(({ id }) => id === toegevoegd.id).length, 1);
historieApi.importeerFitnessBackup(backup);
assert.equal(catalogusApi.leesSchemaOefeningen("vrije-training", basis).filter(({ id }) => id === toegevoegd.id).length, 1);
catalogusApi.herstelAangepasteOefeningenUitData(resultaat, resultaat);
assert.equal(catalogusApi.leesSchemaOefeningen("vrije-training", basis).filter(({ id }) => id === toegevoegd.id).length, 1);

const historieVoorVerwijderen = localStorage.getItem("trainingHistorie");
const sessieNaVerwijderen = catalogusApi.verwijderOefeningUitSessie(sessie, toegevoegd.id);
assert.deepEqual(sessieNaVerwijderen.oefeningen, basis, "alleen de gekozen oefening moet uit de actieve sessie verdwijnen");
assert.equal(sessieNaVerwijderen.gegevens["Chest Press"][1].gewicht, "80", "gegevens van andere oefeningen moeten behouden blijven");
assert.equal(sessieNaVerwijderen.gegevens[toegevoegd.naam], undefined);
assert.equal(sessieNaVerwijderen.statussen[toegevoegd.naam], undefined);
assert.equal(sessieNaVerwijderen.oefeningIds[toegevoegd.naam], undefined);
assert.equal(sessieNaVerwijderen.oefeningDefinities.length, 0);
assert.equal(sessieNaVerwijderen.voltooideSets.some((sleutel) => sleutel.startsWith(`${toegevoegd.naam}-`)), false);

assert.throws(() => catalogusApi.verwijderAangepasteOefening("vrije-training", "chest-press"), /Alleen aangepaste/);
const voorOnbekend = localStorage.getItem("aangepasteOefeningen");
assert.throws(() => catalogusApi.verwijderAangepasteOefening("vrije-training", "custom-onbekend"), /bestaat niet/);
assert.equal(localStorage.getItem("aangepasteOefeningen"), voorOnbekend, "een onbekende ID mag de catalogus niet wijzigen");

const verwijderd = catalogusApi.verwijderAangepasteOefening("vrije-training", toegevoegd.id);
assert.equal(verwijderd.verwijderd, true);
assert.equal(catalogusApi.leesSchemaOefeningen("vrije-training", basis).some(({ id }) => id === toegevoegd.id), false);
assert.ok(catalogusApi.leesAangepasteOefeningen().verwijderdeIds.includes(toegevoegd.id));
assert.equal(catalogusApi.verwijderAangepasteOefening("vrije-training", toegevoegd.id).verwijderd, false, "herhaald verwijderen moet idempotent zijn");
assert.equal(localStorage.getItem("trainingHistorie"), historieVoorVerwijderen, "oude historie mag niet worden aangepast");

catalogusApi.herstelAangepasteOefeningenUitData(resultaat);
assert.equal(catalogusApi.leesSchemaOefeningen("vrije-training", basis).some(({ id }) => id === toegevoegd.id), false, "historie mag een tombstone niet herstellen");
localStorage.setItem("appInstellingen", JSON.stringify({ aangepasteOefeningen: backup.aangepasteOefeningen }));
assert.equal(catalogusApi.leesSchemaOefeningen("vrije-training", basis).some(({ id }) => id === toegevoegd.id), false, "oude cloudinstellingen mogen een tombstone niet herstellen");
historieApi.importeerFitnessBackup(backup);
assert.equal(catalogusApi.leesSchemaOefeningen("vrije-training", basis).some(({ id }) => id === toegevoegd.id), false, "een oude import mag een tombstone niet herstellen");
assert.deepEqual(catalogusApi.verwijderGetombstonedeOefeningenUitSessie(sessie).oefeningen, basis, "een herstelde oude actieve sessie moet tombstones respecteren");

const opnieuw = catalogusApi.voegAangepasteOefeningToe("vrije-training", toegevoegd.naam, basis);
assert.notEqual(opnieuw.id, toegevoegd.id, "dezelfde naam moet na verwijderen een nieuwe identiteit krijgen");
assert.equal(historieApi.vindLaatsteOefeningWaarden([resultaat], opnieuw.id), null, "oude historie mag niet aan de nieuwe identiteit worden gekoppeld");

console.log("Alle tests voor aangepaste oefeningen zijn geslaagd.");
