import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db, firestorePersistenceReady } from "../firebase/firebase";
import {
  leesTrainingHistorie,
  normaliseerHistorieItem,
  normaliseerTrainingHistorie,
  schrijfTrainingHistorie,
} from "../utils/trainingHistorie";
import {
  bewaarActieveTraining,
  bewaarUidCache,
  leesActieveTraining,
  leesInstellingen,
  meldCloudDataToegepast,
  verwijderActieveTraining,
} from "./localCache";
import {
  CLOUD_MIGRATION_VERSION,
  CLOUD_SCHEMA_VERSION,
  dedupliceerGewichtHistorie,
  entityTimestamp,
  isRecenteSessie,
  kiesNieuwsteGeldige,
  mergeHistorieOpId,
  mergeProfielen,
  rijkdomScore,
  timestampMillis,
} from "./syncModel";
import { isZelfdeOperation, logCloudOperatie, maakCloudOperatie } from "./syncIdentity";
import { moetCloudActieveTrainingToepassen } from "./activeTrainingConflict";

const DOELGEWICHT = 80;

const refsVoor = (uid) => ({
  profile: doc(db, "users", uid, "profile", "data"),
  settings: doc(db, "users", uid, "settings", "app"),
  active: doc(db, "users", uid, "activeTraining", "current"),
  history: collection(db, "users", uid, "trainingHistory"),
  tombstones: collection(db, "users", uid, "tombstones"),
});

function geldigObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function isoVanTimestamp(value) {
  const millis = timestampMillis(value);
  return millis > 0 ? new Date(millis).toISOString() : null;
}

function lokaalProfiel() {
  let gewichtHistorie = [];
  try {
    const parsed = JSON.parse(localStorage.getItem("gewichtHistorie") || "[]");
    if (Array.isArray(parsed)) gewichtHistorie = parsed;
  } catch {
    gewichtHistorie = [];
  }
  const weightHistory = dedupliceerGewichtHistorie(gewichtHistorie);
  const currentWeight = Number(localStorage.getItem("huidigGewicht")) || weightHistory.at(-1)?.value || 0;
  return {
    currentWeight,
    targetWeight: DOELGEWICHT,
    weightHistory,
    updatedAtLocal: weightHistory.at(-1)?.date || null,
    schemaVersion: CLOUD_SCHEMA_VERSION,
  };
}

function cloudProfiel(data) {
  if (!geldigObject(data)) return {};
  return {
    ...data,
    updatedAtLocal: isoVanTimestamp(data.updatedAt),
    weightHistory: dedupliceerGewichtHistorie(data.weightHistory || []),
  };
}

function schrijfProfielLokaal(profile) {
  if (Number(profile?.currentWeight) > 0) localStorage.setItem("huidigGewicht", String(profile.currentWeight));
  if (profile?.weightHistory?.length > 0) {
    localStorage.setItem("gewichtHistorie", JSON.stringify(profile.weightHistory.map(({ value, date }) => ({ gewicht: value, datum: date }))));
  }
}

function profileDocument(profile, operation) {
  return {
    currentWeight: Number(profile.currentWeight) || 0,
    targetWeight: Number(profile.targetWeight) || DOELGEWICHT,
    weightHistory: dedupliceerGewichtHistorie(profile.weightHistory || []),
    updatedAt: serverTimestamp(),
    schemaVersion: CLOUD_SCHEMA_VERSION,
    deviceId: operation.deviceId,
    operationId: operation.operationId,
  };
}

function profileInhoudGelijk(cloudData, lokaal) {
  if (!cloudData) return false;
  const cloud = cloudProfiel(cloudData);
  return Number(cloud.currentWeight || 0) === Number(lokaal.currentWeight || 0)
    && Number(cloud.targetWeight || DOELGEWICHT) === Number(lokaal.targetWeight || DOELGEWICHT)
    && JSON.stringify(cloud.weightHistory || []) === JSON.stringify(dedupliceerGewichtHistorie(lokaal.weightHistory || []));
}

function cloudTrainingNaarLokaal(snapshot) {
  const data = snapshot.data();
  return normaliseerHistorieItem({
    ...data,
    trainingId: snapshot.id,
    training: data.trainingNaam || data.training,
    updatedAtLocal: isoVanTimestamp(data.updatedAt),
    createdAtLocal: isoVanTimestamp(data.createdAt),
  });
}

function trainingDocument(training, operation) {
  const item = normaliseerHistorieItem(training);
  const createdMillis = timestampMillis(item.createdAtLocal || item.createdAt || item.datum || item.startTijd) || Date.now();
  const veilig = JSON.parse(JSON.stringify(item));
  return {
    ...veilig,
    id: item.trainingId,
    trainingSchemaId: item.trainingSchemaId || null,
    trainingNaam: item.training,
    datum: item.datum || null,
    startTijd: item.startTijd ?? null,
    eindTijd: item.eindTijd ?? null,
    duur: item.duur ?? null,
    oefeningen: item.oefeningen || {},
    cardio: item.cardio || {},
    voltooidAantal: item.voltooidAantal,
    totaalOefeningen: item.totaalOefeningen,
    isVolledig: item.isVolledig,
    status: item.status,
    createdAt: Timestamp.fromMillis(createdMillis),
    updatedAt: serverTimestamp(),
    schemaVersion: CLOUD_SCHEMA_VERSION,
    deviceId: operation.deviceId,
    operationId: operation.operationId,
  };
}

function activeDocument(sessie, operation) {
  const veilig = JSON.parse(JSON.stringify(sessie));
  return {
    ...veilig,
    sessionId: String(sessie.sessionId || sessie.trainingId),
    trainingSchemaId: sessie.trainingSchemaId || null,
    trainingNaam: sessie.trainingNaam || sessie.training,
    startedAt: Timestamp.fromMillis(Number(sessie.startTijd) || Date.now()),
    updatedAt: serverTimestamp(),
    oefeningen: sessie.gegevens || sessie.oefeningen || {},
    exerciseStatuses: sessie.statussen || sessie.exerciseStatuses || {},
    completedSets: sessie.voltooideSets || sessie.completedSets || [],
    restTimer: Number(sessie.timer ?? sessie.restTimer) || 0,
    status: sessie.status || "Actief",
    schemaVersion: CLOUD_SCHEMA_VERSION,
    deviceId: operation.deviceId,
    operationId: operation.operationId,
  };
}

function settingsDocument(instellingen, operation) {
  return {
    ...JSON.parse(JSON.stringify(instellingen)),
    updatedAt: serverTimestamp(),
    schemaVersion: CLOUD_SCHEMA_VERSION,
    deviceId: operation.deviceId,
    operationId: operation.operationId,
  };
}

function cloudActiveNaarLokaal(data) {
  if (!geldigObject(data)) return null;
  return {
    ...data,
    trainingId: data.trainingId || data.sessionId,
    sessionId: data.sessionId || data.trainingId,
    training: data.trainingNaam || data.training,
    startTijd: Number(data.startTijd) || timestampMillis(data.startedAt),
    gegevens: data.gegevens || data.oefeningen || {},
    statussen: data.statussen || data.exerciseStatuses || {},
    voltooideSets: data.voltooideSets || data.completedSets || [],
    timer: Number(data.timer ?? data.restTimer) || 0,
    updatedAtLocal: isoVanTimestamp(data.updatedAt),
  };
}

function tombstoneRef(uid, entityType, entityId) {
  return doc(db, "users", uid, "tombstones", `${entityType}-${entityId}`);
}

async function schrijfHistorieBatch(uid, historie, bestaandeCloudHistorie = new Map()) {
  const refs = refsVoor(uid);
  const teUploaden = historie.filter((training) => {
    const bestaand = bestaandeCloudHistorie.get(training.trainingId);
    if (!bestaand || !bestaand.operationId || !bestaand.deviceId) return true;
    const lokaalTijdstip = entityTimestamp(training);
    const cloudTijdstip = entityTimestamp(bestaand);
    return lokaalTijdstip > cloudTijdstip || (lokaalTijdstip === cloudTijdstip && rijkdomScore(training) > rijkdomScore(bestaand));
  });
  for (let index = 0; index < teUploaden.length; index += 400) {
    const batch = writeBatch(db);
    teUploaden.slice(index, index + 400).forEach((training) => {
      const operation = maakCloudOperatie(`trainingHistory/${training.trainingId}`, "migreren");
      logCloudOperatie(operation);
      batch.set(doc(refs.history, training.trainingId), trainingDocument(training, operation));
    });
    await batch.commit();
  }
  return teUploaden.length;
}

export async function syncProfiel(uid, bestaandeOperation = null) {
  await firestorePersistenceReady;
  const profile = lokaalProfiel();
  if (profile.currentWeight <= 0 && profile.weightHistory.length === 0) return "geen-profieldata";
  const referentie = refsVoor(uid).profile;
  const snapshot = await getDoc(referentie);
  const operation = bestaandeOperation || maakCloudOperatie("profile/data", "bijwerken");
  if (snapshot.exists() && isZelfdeOperation(snapshot.data(), operation)) return "operation-al-verwerkt";
  if (snapshot.exists() && snapshot.data().operationId && snapshot.data().deviceId && profileInhoudGelijk(snapshot.data(), profile)) return "profile-ongewijzigd";
  logCloudOperatie(operation);
  await setDoc(referentie, profileDocument(profile, operation));
  return "profile-synced";
}

export async function syncInstellingen(uid, instellingen = leesInstellingen(), bestaandeOperation = null) {
  if (!instellingen || Object.keys(instellingen).length === 0) return "geen-instellingen";
  await firestorePersistenceReady;
  const referentie = refsVoor(uid).settings;
  const snapshot = await getDoc(referentie);
  const operation = bestaandeOperation || maakCloudOperatie("settings/app", "bijwerken");
  if (snapshot.exists() && isZelfdeOperation(snapshot.data(), operation)) return "operation-al-verwerkt";
  if (snapshot.exists() && snapshot.data().operationId && snapshot.data().deviceId
      && timestampMillis(snapshot.data().updatedAt) >= timestampMillis(instellingen.updatedAtLocal)) return "settings-ongewijzigd";
  logCloudOperatie(operation);
  await setDoc(referentie, settingsDocument(instellingen, operation));
  return "settings-synced";
}

export async function syncActieveTraining(uid, sessie = leesActieveTraining(), bestaandeOperation = null) {
  if (!sessie) return "geen-actieve-training";
  await firestorePersistenceReady;
  const sessionId = String(sessie.sessionId || sessie.trainingId);
  if ((await getDoc(tombstoneRef(uid, "activeTraining", sessionId))).exists()) return "stale-active-geblokkeerd";
  const referentie = refsVoor(uid).active;
  const cloudSnapshot = await getDoc(referentie);
  const operation = bestaandeOperation || maakCloudOperatie(`activeTraining/${sessionId}`, "bijwerken");
  if (cloudSnapshot.exists()) {
    const cloud = cloudSnapshot.data();
    if (isZelfdeOperation(cloud, operation)) return "operation-al-verwerkt";
    const zelfdeSessie = String(cloud.sessionId || cloud.trainingId) === sessionId;
    if (zelfdeSessie && Number(cloud.syncGeneration || 0) > Number(sessie.syncGeneration || 0)) return "stale-active-geblokkeerd";
    if (zelfdeSessie && Number(cloud.syncGeneration || 0) === Number(sessie.syncGeneration || 0)
        && cloud.operationId && cloud.deviceId) return "active-ongewijzigd";
  }
  logCloudOperatie(operation);
  await setDoc(referentie, activeDocument(sessie, operation));
  return "active-synced";
}

export async function verwijderCloudActieveTraining(uid, sessie, bestaandeOperation = null) {
  if (!sessie) return "geen-actieve-training";
  await firestorePersistenceReady;
  const sessionId = String(sessie.sessionId || sessie.trainingId);
  const operation = bestaandeOperation || maakCloudOperatie(`activeTraining/${sessionId}`, "verwijderen");
  const tombstone = tombstoneRef(uid, "activeTraining", sessionId);
  const activeRef = refsVoor(uid).active;
  const [tombstoneSnapshot, activeSnapshot] = await Promise.all([getDoc(tombstone), getDoc(activeRef)]);
  if (tombstoneSnapshot.exists() && isZelfdeOperation(tombstoneSnapshot.data(), operation)) return "operation-al-verwerkt";
  if (tombstoneSnapshot.exists() && !activeSnapshot.exists()) return "active-al-verwijderd";
  const batch = writeBatch(db);
  batch.set(tombstone, {
    entityType: "activeTraining",
    entityId: sessionId,
    operationId: operation.operationId,
    deviceId: operation.deviceId,
    deletedAt: serverTimestamp(),
    schemaVersion: CLOUD_SCHEMA_VERSION,
  });
  batch.delete(activeRef);
  logCloudOperatie(operation);
  await batch.commit();
  return "active-deleted";
}

export async function syncHistorieTraining(uid, training, bestaandeOperation = null) {
  await firestorePersistenceReady;
  const item = normaliseerHistorieItem(training);
  if ((await getDoc(tombstoneRef(uid, "trainingHistory", item.trainingId))).exists()) return "stale-history-geblokkeerd";
  const referentie = doc(refsVoor(uid).history, item.trainingId);
  const cloudSnapshot = await getDoc(referentie);
  const operation = bestaandeOperation || maakCloudOperatie(`trainingHistory/${item.trainingId}`, "bijwerken");
  if (cloudSnapshot.exists() && isZelfdeOperation(cloudSnapshot.data(), operation)) return "operation-al-verwerkt";
  if (cloudSnapshot.exists() && cloudSnapshot.data().operationId && cloudSnapshot.data().deviceId
      && timestampMillis(cloudSnapshot.data().updatedAt) >= entityTimestamp(item)) return "history-ongewijzigd";
  logCloudOperatie(operation);
  await setDoc(referentie, trainingDocument(item, operation));
  return "history-synced";
}

export async function verwijderCloudHistorieTraining(uid, trainingId, bestaandeOperation = null) {
  await firestorePersistenceReady;
  const operation = bestaandeOperation || maakCloudOperatie(`trainingHistory/${trainingId}`, "verwijderen");
  const tombstone = tombstoneRef(uid, "trainingHistory", trainingId);
  const historyRef = doc(refsVoor(uid).history, trainingId);
  const [tombstoneSnapshot, historySnapshot] = await Promise.all([getDoc(tombstone), getDoc(historyRef)]);
  if (tombstoneSnapshot.exists() && isZelfdeOperation(tombstoneSnapshot.data(), operation)) return "operation-al-verwerkt";
  if (tombstoneSnapshot.exists() && !historySnapshot.exists()) return "history-al-verwijderd";
  const batch = writeBatch(db);
  batch.set(tombstone, {
    entityType: "trainingHistory",
    entityId: trainingId,
    operationId: operation.operationId,
    deviceId: operation.deviceId,
    deletedAt: serverTimestamp(),
    schemaVersion: CLOUD_SCHEMA_VERSION,
  });
  batch.delete(historyRef);
  logCloudOperatie(operation);
  await batch.commit();
  return "history-deleted";
}

export async function voltooiTrainingMetCloudVerificatie(uid, training, actieveSessie) {
  await syncHistorieTraining(uid, training);
  const snapshot = await getDoc(doc(refsVoor(uid).history, training.trainingId));
  if (!snapshot.exists() || snapshot.id !== training.trainingId) throw new Error("Cloudverificatie van de afgeronde training is mislukt.");
  verwijderActieveTraining({ sessie: actieveSessie, notify: false });
  await verwijderCloudActieveTraining(uid, actieveSessie);
  return true;
}

export async function syncAlleLokaleData(uid) {
  const historie = leesTrainingHistorie();
  await Promise.all([syncProfiel(uid), syncInstellingen(uid), syncActieveTraining(uid)]);
  for (const training of historie) await syncHistorieTraining(uid, training);
}

export async function voerVeiligeCloudMigratieUit(uid, { onConflict } = {}) {
  await firestorePersistenceReady;
  const refs = refsVoor(uid);
  const [profileSnap, settingsSnap, activeSnap, historySnap, tombstoneSnap] = await Promise.all([
    getDoc(refs.profile),
    getDoc(refs.settings),
    getDoc(refs.active),
    getDocs(refs.history),
    getDocs(refs.tombstones),
  ]);

  const verwijderdeHistorieIds = new Set(tombstoneSnap.docs
    .map((snapshot) => snapshot.data())
    .filter((item) => item.entityType === "trainingHistory")
    .map((item) => String(item.entityId)));
  const lokaleHistorie = leesTrainingHistorie();
  const cloudHistorie = historySnap.docs.map(cloudTrainingNaarLokaal);
  const cloudHistoriePerId = new Map(cloudHistorie.map((training) => [training.trainingId, training]));
  const samengevoegdeHistorie = normaliseerTrainingHistorie(mergeHistorieOpId(lokaleHistorie, cloudHistorie, verwijderdeHistorieIds));
  const profile = mergeProfielen(lokaalProfiel(), profileSnap.exists() ? cloudProfiel(profileSnap.data()) : {});

  const lokaalActief = leesActieveTraining();
  const cloudActief = activeSnap.exists() ? cloudActiveNaarLokaal(activeSnap.data()) : null;
  let actief = kiesNieuwsteGeldige(lokaalActief, cloudActief);
  if (lokaalActief && cloudActief && String(lokaalActief.sessionId || lokaalActief.trainingId) !== String(cloudActief.sessionId || cloudActief.trainingId)
      && isRecenteSessie(lokaalActief) && isRecenteSessie(cloudActief)) {
    localStorage.setItem(`fitness:${uid}:activeTrainingConflicts`, JSON.stringify([lokaalActief, cloudActief]));
    onConflict?.("Er zijn twee recente actieve trainingen gevonden. Beide sessies zijn veilig bewaard; de nieuwste is geopend.");
  }

  if (samengevoegdeHistorie.length > 0 && JSON.stringify(samengevoegdeHistorie) !== JSON.stringify(lokaleHistorie)) {
    schrijfTrainingHistorie(samengevoegdeHistorie, {
      explicieteVerwijdering: samengevoegdeHistorie.length < lokaleHistorie.length,
      reden: "veilige cloudmigratie",
      meldSync: false,
    });
  }
  schrijfProfielLokaal(profile);
  if (actief) actief = bewaarActieveTraining(actief, { notify: false, verhoogGeneratie: false });

  if (!profileSnap.exists() || !profileSnap.data().operationId || !profileSnap.data().deviceId || !profileInhoudGelijk(profileSnap.data(), profile)) {
    const profileOperation = maakCloudOperatie("profile/data", "migreren");
    logCloudOperatie(profileOperation);
    await setDoc(refs.profile, profileDocument(profile, profileOperation));
  }
  if (settingsSnap.exists() && !leesInstellingen()) {
    localStorage.setItem("appInstellingen", JSON.stringify({ ...settingsSnap.data(), updatedAtLocal: isoVanTimestamp(settingsSnap.data().updatedAt) }));
  }
  if (leesInstellingen() && (!settingsSnap.exists() || !settingsSnap.data().operationId || !settingsSnap.data().deviceId
      || timestampMillis(leesInstellingen().updatedAtLocal) > timestampMillis(settingsSnap.data().updatedAt))) {
    await syncInstellingen(uid);
  }
  await schrijfHistorieBatch(uid, samengevoegdeHistorie, cloudHistoriePerId);
  if (actief) await syncActieveTraining(uid, actief);

  const controleHistorie = await getDocs(refs.history);
  const cloudIds = new Set(controleHistorie.docs.map((snapshot) => snapshot.id));
  const ontbrekendeIds = samengevoegdeHistorie.map((item) => item.trainingId).filter((id) => !cloudIds.has(id));
  if (ontbrekendeIds.length > 0) throw new Error(`Cloudmigratie niet geverifieerd; ${ontbrekendeIds.length} training(en) ontbreken.`);

  localStorage.setItem(`fitnessCloudMigrationVersion:${uid}`, String(CLOUD_MIGRATION_VERSION));
  bewaarUidCache(uid);
  meldCloudDataToegepast();
  return {
    trainingen: samengevoegdeHistorie.length,
    gewichtsmetingen: profile.weightHistory.length,
    actieveTraining: Boolean(actief),
  };
}

export function startCloudListeners(uid, { onData, onError } = {}) {
  const refs = refsVoor(uid);
  const unsubscribers = [];

  unsubscribers.push(onSnapshot(refs.profile, { includeMetadataChanges: true }, (snapshot) => {
    if (!snapshot.exists() || snapshot.metadata.hasPendingWrites) return;
    const merged = mergeProfielen(lokaalProfiel(), cloudProfiel(snapshot.data()));
    schrijfProfielLokaal(merged);
    bewaarUidCache(uid);
    meldCloudDataToegepast();
    onData?.();
  }, onError));

  unsubscribers.push(onSnapshot(refs.active, { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.hasPendingWrites) return;
    if (!snapshot.exists()) return;
    const cloud = cloudActiveNaarLokaal(snapshot.data());
    const lokaal = leesActieveTraining();
    if (moetCloudActieveTrainingToepassen(lokaal, cloud, {
      cloudIsNieuwer: entityTimestamp(cloud) > entityTimestamp(lokaal),
    })) {
      bewaarActieveTraining(cloud, { notify: false, verhoogGeneratie: false });
      bewaarUidCache(uid);
      meldCloudDataToegepast();
      onData?.();
    }
  }, onError));

  unsubscribers.push(onSnapshot(refs.history, { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.hasPendingWrites) return;
    const cloud = snapshot.docs.map(cloudTrainingNaarLokaal);
    const lokaal = leesTrainingHistorie();
    const merged = normaliseerTrainingHistorie(mergeHistorieOpId(lokaal, cloud));
    if (JSON.stringify(merged) !== JSON.stringify(lokaal)) {
      schrijfTrainingHistorie(merged, { reden: "cloudhistorie bijwerken", meldSync: false });
      bewaarUidCache(uid);
      meldCloudDataToegepast();
      onData?.();
    }
  }, onError));

  unsubscribers.push(onSnapshot(refs.tombstones, (snapshot) => {
    const verwijderdeIds = new Set(snapshot.docs.map((item) => item.data())
      .filter((item) => item.entityType === "trainingHistory")
      .map((item) => String(item.entityId)));
    if (verwijderdeIds.size === 0) return;
    const lokaal = leesTrainingHistorie();
    const behouden = lokaal.filter((item) => !verwijderdeIds.has(item.trainingId));
    if (behouden.length < lokaal.length) {
      schrijfTrainingHistorie(behouden, { explicieteVerwijdering: true, reden: "cloudverwijdering toepassen", meldSync: false });
      bewaarUidCache(uid);
      meldCloudDataToegepast();
      onData?.();
    }
  }, onError));

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
