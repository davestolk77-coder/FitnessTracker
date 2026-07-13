import assert from "node:assert/strict";
import { trainingen } from "../src/data/trainingen.js";
import * as historieApi from "../src/utils/trainingHistorie.js";

class MemoryStorage {
  constructor(initieel = {}) {
    this.data = new Map(Object.entries(initieel).map(([sleutel, waarde]) => [sleutel, String(waarde)]));
    this.foutSleutel = null;
    this.foutGebruikt = false;
  }

  getItem(sleutel) { return this.data.has(sleutel) ? this.data.get(sleutel) : null; }
  removeItem(sleutel) { this.data.delete(sleutel); }
  setItem(sleutel, waarde) {
    if (sleutel === this.foutSleutel && !this.foutGebruikt) {
      this.foutGebruikt = true;
      throw new Error("gesimuleerde schrijffout");
    }
    this.data.set(sleutel, String(waarde));
  }
}

const trainingsnaam = Object.keys(trainingen)[0];
const maakItem = (id, datum, gewicht = "50") => ({
  trainingId: id,
  training: trainingsnaam,
  datum,
  startTijd: new Date(datum).getTime() - 1800000,
  eindTijd: new Date(datum).getTime(),
  duur: 1800,
  oefeningen: { "Chest Press": { 1: { gewicht, reps: "8" } } },
  cardio: {},
  totaalOefeningen: 6,
});

const bestaandEen = maakItem("bestaand-1", "2026-01-01T10:00:00.000Z", "50");
const bestaandTwee = maakItem("bestaand-2", "2026-02-01T10:00:00.000Z", "60");
const basisOpslag = () => new MemoryStorage({
  trainingHistorie: JSON.stringify([bestaandEen, bestaandTwee]),
  huidigGewicht: "82.5",
  gewichtHistorie: JSON.stringify([{ datum: "2026-01-01", gewicht: 82.5 }]),
  actieveTraining: JSON.stringify({ training: trainingsnaam, statussen: { Cardio: "Bezig" } }),
});

globalThis.localStorage = basisOpslag();
historieApi.initialiseerVeiligeHistorieOpslag();
assert.equal(historieApi.leesTrainingHistorie().length, 2, "appstart moet twee historie-items behouden");
for (let herlading = 0; herlading < 5; herlading += 1) historieApi.initialiseerVeiligeHistorieOpslag();
assert.equal(historieApi.leesTrainingHistorie().length, 2, "vijf herladingen mogen niets verwijderen");

globalThis.localStorage = new MemoryStorage({
  trainingHistorie: JSON.stringify([{ onbekendOudVeld: "blijft behouden", datum: "2025-12-01T10:00:00.000Z" }]),
});
historieApi.initialiseerVeiligeHistorieOpslag();
assert.equal(historieApi.leesTrainingHistorie()[0].onbekendOudVeld, "blijft behouden", "onbekende velden uit oude items mogen niet verdwijnen");

const legacyBronnen = {
  trainingHistorie: [bestaandEen],
  trainingHistory: [bestaandEen],
  trainingsHistorie: [bestaandEen],
  workoutHistory: [bestaandEen],
  historie: [bestaandEen],
  workouts: [bestaandEen],
  trainingen: [bestaandEen],
  fitnessTrackerData: { trainingHistorie: [bestaandEen] },
  fitnessTrackerBackup: { historie: [bestaandEen] },
  trainingHistorieBackup: [bestaandEen],
  trainingHistorieBackupPrevious: [bestaandEen],
  trainingHistoriePending: [bestaandEen],
  fitnessTrackerFullBackup: { trainingHistorie: [bestaandEen] },
};

for (const [sleutel, waarde] of Object.entries(legacyBronnen)) {
  globalThis.localStorage = new MemoryStorage({ [sleutel]: JSON.stringify(waarde) });
  historieApi.initialiseerVeiligeHistorieOpslag();
  assert.equal(historieApi.leesTrainingHistorie().length, 1, `legacy-bron ${sleutel} moet herstellen`);
}

const volledigeStatussen = Object.fromEntries(trainingen[trainingsnaam].map((oefening) => [oefening, "Voltooid"]));
globalThis.localStorage = new MemoryStorage({
  actieveTraining: JSON.stringify({ trainingId: "actief-afgerond", training: trainingsnaam, startTijd: 1760000000000, statussen: volledigeStatussen, gegevens: { "Chest Press": { 1: { gewicht: "55", reps: "8" } } }, cardio: { type: "Fiets", tijd: "10" } }),
});
historieApi.initialiseerVeiligeHistorieOpslag();
assert.equal(historieApi.leesTrainingHistorie().length, 1, "volledig afgeronde actieve training moet herstelbaar zijn");

globalThis.localStorage = basisOpslag();
historieApi.initialiseerVeiligeHistorieOpslag();
const gedeeltelijk = {
  trainingId: "gedeeltelijk-1",
  training: trainingsnaam,
  datum: "2026-03-01T10:30:00.000Z",
  startTijd: new Date("2026-03-01T10:00:00.000Z").getTime(),
  eindTijd: new Date("2026-03-01T10:30:00.000Z").getTime(),
  duur: 1800,
  oefeningen: { "Chest Press": { 1: { gewicht: "70", reps: "6" } } },
  cardio: {},
  voltooidAantal: 1,
  totaalOefeningen: 6,
  isVolledig: false,
  status: "Gedeeltelijk",
};
historieApi.voegTrainingToe(gedeeltelijk);
let historie = historieApi.leesTrainingHistorie();
assert.equal(historie.length, 3, "gedeeltelijke training moet direct zichtbaar zijn");
assert.equal(historie.at(-1).status, "Gedeeltelijk");
historieApi.initialiseerVeiligeHistorieOpslag();
assert.equal(historieApi.leesTrainingHistorie().length, 3, "gedeeltelijke training moet na herladen bestaan");

const geopend = historieApi.leesTrainingHistorie().find((item) => item.trainingId === "gedeeltelijk-1");
geopend.oefeningen["Chest Press"][1] = { gewicht: "75", reps: "5" };
historieApi.werkTrainingBij(geopend.trainingId, geopend);
assert.equal(historieApi.leesTrainingHistorie().find((item) => item.trainingId === geopend.trainingId).oefeningen["Chest Press"][1].gewicht, "75");

const tweeOefeningen = historieApi.normaliseerHistorieItem({ ...geopend, cardio: { type: "Fiets", tijd: "10" } });
historieApi.werkTrainingBij(tweeOefeningen.trainingId, tweeOefeningen);
const zonderCardio = historieApi.verwijderOefeningUitTraining(tweeOefeningen, "Cardio");
historieApi.werkTrainingBij(zonderCardio.trainingId, zonderCardio);
assert.equal(historieApi.leesTrainingHistorie().find((item) => item.trainingId === zonderCardio.trainingId).voltooidAantal, 1);

historieApi.verwijderTraining("gedeeltelijk-1");
historie = historieApi.leesTrainingHistorie();
assert.deepEqual(historie.map((item) => item.trainingId), ["bestaand-1", "bestaand-2"], "andere historie-items moeten behouden blijven");
assert.equal(localStorage.getItem("huidigGewicht"), "82.5");
assert.ok(localStorage.getItem("actieveTraining"));

globalThis.localStorage = new MemoryStorage({
  trainingHistorie: "{ongeldig",
  trainingHistorieBackup: JSON.stringify([bestaandEen, bestaandTwee]),
});
historieApi.initialiseerVeiligeHistorieOpslag();
assert.equal(historieApi.leesTrainingHistorie().length, 2, "ongeldige primaire JSON moet uit back-up herstellen");

globalThis.localStorage = basisOpslag();
historieApi.initialiseerVeiligeHistorieOpslag();
const voorSchrijffout = localStorage.getItem("trainingHistorie");
localStorage.foutSleutel = "trainingHistorie";
assert.throws(() => historieApi.voegTrainingToe(gedeeltelijk), /gesimuleerde schrijffout/);
assert.equal(localStorage.getItem("trainingHistorie"), voorSchrijffout, "schrijffout moet primaire historie terugrollen");

globalThis.localStorage = basisOpslag();
localStorage.setItem("personalRecords", JSON.stringify({ oud: 42 }));
localStorage.foutSleutel = "personalRecords";
assert.throws(() => historieApi.voegTrainingToe(gedeeltelijk), /gesimuleerde schrijffout/);
assert.equal(localStorage.getItem("persoonlijkeRecords"), null, "nieuw aangemaakte records moeten bij een mislukte transactie worden teruggerold");
assert.equal(localStorage.getItem("personalRecords"), JSON.stringify({ oud: 42 }), "bestaande Engelse records moeten bij een mislukte transactie worden hersteld");

globalThis.localStorage = basisOpslag();
historieApi.initialiseerVeiligeHistorieOpslag();
assert.throws(() => historieApi.schrijfTrainingHistorie([]), /mag geen historie-items verwijderen|lege historie/);
assert.equal(historieApi.leesTrainingHistorie().length, 2, "lege array mag niet-expliciet niets overschrijven");

const exportData = historieApi.maakFitnessBackupData();
assert.equal(exportData.trainingHistorie.length, 2);
assert.equal(exportData.gewichtHistorie.length, 1);
historieApi.verwijderTraining("bestaand-2");
assert.equal(historieApi.leesTrainingHistorie().length, 1);
historieApi.importeerFitnessBackup(exportData);
historie = historieApi.leesTrainingHistorie();
assert.equal(historie.length, 2, "import moet verwijderde testdata herstellen");
historieApi.importeerFitnessBackup(exportData);
assert.equal(historieApi.leesTrainingHistorie().length, 2, "herhaalde import mag geen duplicaten maken");
assert.ok(localStorage.getItem("trainingHistorieBackup"));
assert.ok(localStorage.getItem("trainingHistorieBackupPrevious"));
assert.ok(localStorage.getItem("fitnessTrackerFullBackup"));

assert.equal(historieApi.berekenPersoonlijkeRecords(historieApi.leesTrainingHistorie())["Chest Press"], 60);
assert.equal(historieApi.vindLaatsteOefeningWaarden(historieApi.leesTrainingHistorie(), "Chest Press")[1].gewicht, "60");
assert.equal(historieApi.maakKrachtGrafiekData(historieApi.leesTrainingHistorie(), "Chest Press").length, 2);

const oudZonderId = {
  training: trainingsnaam,
  datum: "2026-04-01T10:30:00.000Z",
  startTijd: new Date("2026-04-01T10:00:00.000Z").getTime(),
  oefeningen: { "Chest Press": { 1: { gewicht: "65", reps: "8" } } },
  cardio: { type: "Loopband", tijd: "12" },
};
const anderOngewijzigd = maakItem("ander-ongewijzigd", "2026-05-01T10:00:00.000Z", "80");
globalThis.localStorage = new MemoryStorage({ trainingHistorie: JSON.stringify([anderOngewijzigd, oudZonderId]) });
historieApi.initialiseerVeiligeHistorieOpslag();
let oudGenormaliseerd = historieApi.leesTrainingHistorie().find((item) => item.datum === oudZonderId.datum);
assert.ok(oudGenormaliseerd.trainingId, "oude historie zonder trainingId moet een stabiele afgeleide ID krijgen");
assert.equal(oudGenormaliseerd.trainingSchemaId, "training-a", "oud Training A-item moet veilig aan het juiste schema worden gekoppeld");
assert.deepEqual(historieApi.getOntbrekendeOefeningen(oudGenormaliseerd), ["Lat Pull", "Shoulder Press", "Triceps Extension", "Abdominal Crunch"]);

for (const [index, oefening] of historieApi.getOntbrekendeOefeningen(oudGenormaliseerd).entries()) {
  const bijgewerkt = historieApi.normaliseerHistorieItem({
    ...oudGenormaliseerd,
    oefeningen: { ...oudGenormaliseerd.oefeningen, [oefening]: { 1: { gewicht: String(70 + index), reps: "8" }, 2: {}, 3: {} } },
  });
  historieApi.werkTrainingBij(oudGenormaliseerd.trainingId, bijgewerkt);
  oudGenormaliseerd = historieApi.leesTrainingHistorie().find((item) => item.trainingId === oudGenormaliseerd.trainingId);
}
assert.equal(oudGenormaliseerd.isVolledig, true, "later aanvullen van alle schema-oefeningen moet de training volledig maken");
assert.equal(oudGenormaliseerd.status, "Voltooid");
assert.equal(oudGenormaliseerd.voltooidAantal, 6);
assert.equal(historieApi.leesTrainingHistorie().find((item) => item.trainingId === "ander-ongewijzigd").oefeningen["Chest Press"][1].gewicht, "80", "ander historie-item moet ongewijzigd blijven");

const zonderLatPull = historieApi.verwijderOefeningUitTraining(oudGenormaliseerd, "Lat Pull");
historieApi.werkTrainingBij(oudGenormaliseerd.trainingId, zonderLatPull);
oudGenormaliseerd = historieApi.leesTrainingHistorie().find((item) => item.trainingId === oudGenormaliseerd.trainingId);
assert.deepEqual(historieApi.getOntbrekendeOefeningen(oudGenormaliseerd), ["Lat Pull"], "verwijderde oefening moet opnieuw als ontbrekend verschijnen");
historieApi.werkTrainingBij(oudGenormaliseerd.trainingId, historieApi.normaliseerHistorieItem({ ...oudGenormaliseerd, oefeningen: { ...oudGenormaliseerd.oefeningen, "Lat Pull": { 1: { gewicht: "90", reps: "5" }, 2: {}, 3: {} } } }));
oudGenormaliseerd = historieApi.leesTrainingHistorie().find((item) => item.trainingId === oudGenormaliseerd.trainingId);
assert.equal(oudGenormaliseerd.isVolledig, true, "opnieuw toevoegen moet de training weer volledig maken");
assert.equal(historieApi.berekenPersoonlijkeRecords(historieApi.leesTrainingHistorie())["Lat Pull"], 90);
assert.equal(historieApi.vindLaatsteOefeningWaarden(historieApi.leesTrainingHistorie(), "Lat Pull")[1].gewicht, "90");
assert.equal(historieApi.maakKrachtGrafiekData(historieApi.leesTrainingHistorie(), "Lat Pull").length, 1);

const schemaExport = historieApi.maakFitnessBackupData();
historieApi.importeerFitnessBackup(schemaExport);
assert.equal(historieApi.leesTrainingHistorie().length, 2, "export/import na schema-aanvulling mag geen duplicaten of verlies veroorzaken");
const onbekendeTraining = historieApi.normaliseerHistorieItem({ training: "Oud eigen schema", datum: "2024-01-01", oefeningen: { "Vrije oefening": { 1: { gewicht: "10", reps: "10" } } } });
assert.equal(historieApi.getTrainingSchema(onbekendeTraining), null, "onbekende oude training mag niet aan een verkeerd schema worden gekoppeld");
assert.deepEqual(historieApi.getOntbrekendeOefeningen(onbekendeTraining), []);

console.log("Alle geïsoleerde historie-, upgrade-, back-up- en rollbacktests zijn geslaagd.");
