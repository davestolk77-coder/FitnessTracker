import { leesJson } from "../utils/storage.js";
import { maakFitnessBackupData } from "../utils/trainingHistorie.js";
import { CLOUD_OWNER_KEY } from "./syncModel.js";
import { meldLokaleWijziging } from "./localChanges.js";

export const ACTIEVE_TRAINING_KEY = "actieveTraining";
export const INSTELLINGEN_KEY = "appInstellingen";
export const DATA_GESYNCHRONISEERD_EVENT = "fitnessTracker:data-gesynchroniseerd";

export function bindLokaleDataAanUid(uid) {
  const eigenaar = localStorage.getItem(CLOUD_OWNER_KEY);
  if (eigenaar && eigenaar !== uid) {
    const error = new Error("De lokale gegevens op dit apparaat horen bij een ander Google-account.");
    error.code = "sync/account-conflict";
    throw error;
  }
  if (!eigenaar) localStorage.setItem(CLOUD_OWNER_KEY, uid);
}

export function controleerLokaleDataEigenaar(uid) {
  const eigenaar = localStorage.getItem(CLOUD_OWNER_KEY);
  if (eigenaar && eigenaar !== uid) {
    const error = new Error("De lokale gegevens op dit apparaat horen bij een ander Google-account.");
    error.code = "sync/account-conflict";
    throw error;
  }
}

export function maakCloudMigratieBackup(uid) {
  const sleutel = `fitnessCloudMigrationBackup:${uid}`;
  if (localStorage.getItem(sleutel) !== null) return sleutel;
  const rawLocalStorage = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key !== null) rawLocalStorage[key] = localStorage.getItem(key);
  }
  localStorage.setItem(sleutel, JSON.stringify({
    gemaaktOp: new Date().toISOString(),
    uid,
    export: maakFitnessBackupData(),
    rawLocalStorage,
  }));
  return sleutel;
}

export function leesActieveTraining() {
  return leesJson(ACTIEVE_TRAINING_KEY, null);
}

function actieveInhoudFingerprint(sessie) {
  if (!sessie || typeof sessie !== "object") return "";
  const kopie = { ...sessie };
  delete kopie.updatedAtLocal;
  delete kopie.syncGeneration;
  delete kopie.schemaVersion;
  delete kopie.deviceId;
  delete kopie.operationId;
  return JSON.stringify(kopie);
}

export function bewaarActieveTraining(sessie, { urgent = false, notify = true, verhoogGeneratie = true } = {}) {
  if (!sessie || typeof sessie !== "object") throw new Error("De actieve training heeft een ongeldig formaat.");
  const nu = new Date().toISOString();
  const bestaand = leesActieveTraining();
  if (bestaand && actieveInhoudFingerprint(bestaand) === actieveInhoudFingerprint(sessie)) return bestaand;
  const bestaandeGeneratie = Number(bestaand?.syncGeneration || 0);
  const opgeslagen = {
    ...sessie,
    sessionId: String(sessie.sessionId || sessie.trainingId),
    updatedAtLocal: nu,
    syncGeneration: Math.max(Number(sessie.syncGeneration || 0), bestaandeGeneratie) + (verhoogGeneratie ? 1 : 0),
    schemaVersion: 1,
  };
  localStorage.setItem(ACTIEVE_TRAINING_KEY, JSON.stringify(opgeslagen));
  if (notify) meldLokaleWijziging({ type: "active-upsert", data: opgeslagen, urgent });
  return opgeslagen;
}

export function verwijderActieveTraining({ sessie, notify = true } = {}) {
  const actief = sessie || leesActieveTraining();
  localStorage.removeItem(ACTIEVE_TRAINING_KEY);
  if (notify && actief) meldLokaleWijziging({ type: "active-delete", data: actief, urgent: true });
}

export function leesInstellingen() {
  const instellingen = leesJson(INSTELLINGEN_KEY, null);
  return instellingen && typeof instellingen === "object" ? instellingen : null;
}

export function schrijfInstellingen(instellingen, { notify = true } = {}) {
  const opgeslagen = { ...instellingen, updatedAtLocal: new Date().toISOString(), schemaVersion: 1 };
  localStorage.setItem(INSTELLINGEN_KEY, JSON.stringify(opgeslagen));
  if (notify) meldLokaleWijziging({ type: "settings-upsert", data: opgeslagen, urgent: false });
  return opgeslagen;
}

export function bewaarUidCache(uid) {
  const waarden = {
    trainingHistorie: localStorage.getItem("trainingHistorie"),
    actieveTraining: localStorage.getItem(ACTIEVE_TRAINING_KEY),
    gewichtHistorie: localStorage.getItem("gewichtHistorie"),
    huidigGewicht: localStorage.getItem("huidigGewicht"),
    settings: localStorage.getItem(INSTELLINGEN_KEY),
  };
  Object.entries(waarden).forEach(([naam, waarde]) => {
    if (waarde !== null) localStorage.setItem(`fitness:${uid}:${naam}`, waarde);
  });
}

export function meldCloudDataToegepast() {
  window.dispatchEvent(new CustomEvent(DATA_GESYNCHRONISEERD_EVENT));
}
