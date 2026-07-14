import assert from "node:assert/strict";
import {
  dedupliceerGewichtHistorie,
  kiesNieuwsteGeldige,
  mergeHistorieOpId,
  mergeProfielen,
  entityTimestamp,
  normaliseerSyncObjectArray,
} from "../src/sync/syncModel.js";

assert.equal(entityTimestamp(null), 0, "null-entiteit mag updatedAt niet derefereren");
assert.equal(entityTimestamp(undefined), 0, "undefined-entiteit moet een veilige timestamp krijgen");
assert.equal(entityTimestamp({ updatedAt: null }), 0, "ontbrekende/null Firestore-updatedAt moet veilig zijn");
assert.equal(entityTimestamp({ updatedAt: "geen-datum" }), 0, "ongeldige updatedAt moet terugvallen op nul");
assert.deepEqual(normaliseerSyncObjectArray([null, undefined, { trainingId: "geldig" }]).map((item) => item.trainingId), ["geldig"]);

const training = (id, updatedAtLocal, extra = {}) => ({
  trainingId: id,
  training: "Training A",
  datum: updatedAtLocal,
  updatedAtLocal,
  oefeningen: { "Chest Press": { 1: { gewicht: "50", reps: "10" } } },
  ...extra,
});

const lokaal = [training("lokaal-1", "2026-07-10T10:00:00.000Z")];
assert.deepEqual(mergeHistorieOpId(lokaal, []).map((item) => item.trainingId), ["lokaal-1"], "lege cloud mag lokale historie niet wissen");

const cloud = [training("cloud-1", "2026-07-11T10:00:00.000Z")];
assert.deepEqual(mergeHistorieOpId([], cloud).map((item) => item.trainingId), ["cloud-1"], "nieuw apparaat moet cloudhistorie herstellen");

const lokaalOud = training("zelfde", "2026-07-10T10:00:00.000Z", { status: "Gedeeltelijk" });
const cloudNieuw = training("zelfde", "2026-07-12T10:00:00.000Z", { status: "Voltooid", cardio: { tijd: "15" } });
assert.equal(mergeHistorieOpId([lokaalOud], [cloudNieuw])[0].status, "Voltooid", "nieuwste geldige training moet winnen");

const eenKeer = mergeHistorieOpId(lokaal, cloud);
const tweeKeer = mergeHistorieOpId(eenKeer, cloud);
assert.equal(tweeKeer.length, 2, "herhaalde migratie mag geen duplicaten maken");
assert.deepEqual(mergeHistorieOpId([null, ...lokaal, undefined], [...cloud, null]).map((item) => item.trainingId), ["lokaal-1", "cloud-1"], "corrupte items mogen geldige lokale en cloudhistorie niet verwijderen");

const tombstones = new Set(["cloud-1"]);
assert.deepEqual(mergeHistorieOpId(lokaal, cloud, tombstones).map((item) => item.trainingId), ["lokaal-1"], "tombstone moet stale herintroductie blokkeren");

const metingen = dedupliceerGewichtHistorie(
  [{ gewicht: 82, datum: "2026-07-10T10:00:00.000Z" }],
  [{ value: 82, date: "2026-07-10T10:00:00.000Z" }, { value: 81.5, date: "2026-07-12T10:00:00.000Z" }],
);
assert.equal(metingen.length, 2, "gewichtshistorie moet worden samengevoegd en gededupliceerd");
assert.equal(mergeProfielen(
  { currentWeight: 82, weightHistory: metingen.slice(0, 1), updatedAtLocal: "2026-07-10T10:00:00.000Z" },
  { currentWeight: 81.5, weightHistory: metingen, updatedAtLocal: "2026-07-12T10:00:00.000Z" },
).currentWeight, 81.5, "nieuwste profielgewicht moet winnen");

const gelijkeTijdArm = training("rijk", "2026-07-12T10:00:00.000Z", { oefeningen: {} });
const gelijkeTijdRijk = training("rijk", "2026-07-12T10:00:00.000Z", { cardio: { tijd: "20" } });
assert.equal(kiesNieuwsteGeldige(gelijkeTijdArm, gelijkeTijdRijk).cardio.tijd, "20", "bij gelijke tijd moet de rijkste versie winnen");

const opslag = new Map();
globalThis.localStorage = {
  get length() { return opslag.size; },
  getItem: (key) => opslag.has(key) ? opslag.get(key) : null,
  setItem: (key, value) => opslag.set(key, String(value)),
  removeItem: (key) => opslag.delete(key),
  key: (index) => [...opslag.keys()][index] ?? null,
};
const lokaleCache = await import("../src/sync/localCache.js");
const syncIdentity = await import("../src/sync/syncIdentity.js");
lokaleCache.bindLokaleDataAanUid("uid-a");
assert.equal(localStorage.getItem("fitnessCloudDataOwnerUid"), "uid-a", "legacy-cache moet aan de eerste UID worden gebonden");
localStorage.setItem("trainingHistorie", JSON.stringify([null, training("chrome-geldig", "2026-07-13T10:00:00.000Z"), undefined]));
localStorage.setItem("actieveTraining", "null");
assert.equal(lokaleCache.normaliseerLokaleSyncDataEenmalig("uid-a"), true, "bestaande Chrome-opslag moet eenmalig worden genormaliseerd");
assert.deepEqual(JSON.parse(localStorage.getItem("trainingHistorie")).map((item) => item.trainingId), ["chrome-geldig"]);
assert.equal(localStorage.getItem("actieveTraining"), null, "null-actieve training moet als afwezig worden behandeld");
assert.equal(lokaleCache.normaliseerLokaleSyncDataEenmalig("uid-a"), false, "normalisatie moet eenmalig zijn");
assert.throws(() => lokaleCache.controleerLokaleDataEigenaar("uid-b"), /ander Google-account/, "accountwisseling mag caches niet mengen");
const sessieEen = lokaleCache.bewaarActieveTraining({ trainingId: "sessie-1", training: "Training A" }, { notify: false });
const sessieTwee = lokaleCache.bewaarActieveTraining({ ...sessieEen, timer: 1 }, { notify: false });
assert.ok(sessieTwee.syncGeneration > sessieEen.syncGeneration, "actieve writes moeten een oplopende generatie krijgen");
assert.equal(lokaleCache.bewaarActieveTraining(sessieTwee, { notify: false }).syncGeneration, sessieTwee.syncGeneration, "identieke actieve inhoud mag geen extra generatie of upload veroorzaken");

const deviceIdEen = syncIdentity.getDeviceId();
const deviceIdTwee = syncIdentity.getDeviceId();
assert.equal(deviceIdEen, deviceIdTwee, "deviceId mag na de eerste generatie nooit veranderen");
assert.match(deviceIdEen, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, "deviceId moet een UUID v4 zijn");
const operatieEen = syncIdentity.maakCloudOperatie("profile/data", "bijwerken");
const operatieTwee = syncIdentity.maakCloudOperatie("profile/data", "bijwerken");
assert.notEqual(operatieEen.operationId, operatieTwee.operationId, "iedere logische cloudmutatie moet een nieuwe operationId krijgen");
assert.match(operatieEen.operationId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, "operationId moet een UUID v4 zijn");
assert.equal(syncIdentity.isZelfdeOperation({ operationId: operatieEen.operationId }, operatieEen), true, "een reeds verwerkte operationId moet herkenbaar zijn");
assert.equal(syncIdentity.isZelfdeOperation({ operationId: operatieEen.operationId }, operatieTwee), false, "verschillende mutaties mogen niet als duplicaat gelden");

console.log("Alle geïsoleerde cloudmerge-, migratie-, deduplicatie- en stale-writetests zijn geslaagd.");
