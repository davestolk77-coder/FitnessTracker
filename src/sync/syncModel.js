export const CLOUD_SCHEMA_VERSION = 1;
export const CLOUD_MIGRATION_VERSION = 1;
export const CLOUD_OWNER_KEY = "fitnessCloudDataOwnerUid";

export function timestampMillis(value) {
  if (typeof value?.toMillis === "function") return value.toMillis();
  const millis = new Date(value ?? 0).getTime();
  return Number.isFinite(millis) ? millis : 0;
}

export function entityTimestamp(entity = {}) {
  return Math.max(
    timestampMillis(entity.updatedAt),
    timestampMillis(entity.updatedAtLocal),
    timestampMillis(entity.datum),
    Number(entity.eindTijd) || 0,
    Number(entity.startTijd) || 0,
  );
}

export function rijkdomScore(value) {
  if (!value || typeof value !== "object") return 0;
  return JSON.stringify(value).length
    + Object.keys(value.oefeningen || value.gegevens || {}).length * 1000
    + Object.keys(value.cardio || {}).length * 100;
}

export function kiesNieuwsteGeldige(lokaal, cloud, { isGeldig = (waarde) => Boolean(waarde) } = {}) {
  const lokaalGeldig = isGeldig(lokaal);
  const cloudGeldig = isGeldig(cloud);
  if (!lokaalGeldig) return cloudGeldig ? cloud : null;
  if (!cloudGeldig) return lokaal;
  const lokaalTijdstip = entityTimestamp(lokaal);
  const cloudTijdstip = entityTimestamp(cloud);
  if (lokaalTijdstip !== cloudTijdstip) return lokaalTijdstip > cloudTijdstip ? lokaal : cloud;
  return rijkdomScore(lokaal) >= rijkdomScore(cloud) ? lokaal : cloud;
}

export function dedupliceerGewichtHistorie(...bronnen) {
  const uniek = new Map();
  bronnen.flat().forEach((meting) => {
    const value = Number(meting?.value ?? meting?.gewicht);
    const datum = new Date(meting?.date ?? meting?.datum);
    if (!Number.isFinite(value) || value <= 0 || Number.isNaN(datum.getTime())) return;
    const date = datum.toISOString();
    uniek.set(`${date}|${value}`, { value, date });
  });
  return [...uniek.values()].sort((a, b) => timestampMillis(a.date) - timestampMillis(b.date));
}

export function mergeProfielen(lokaal = {}, cloud = {}) {
  const weightHistory = dedupliceerGewichtHistorie(lokaal.weightHistory || [], cloud.weightHistory || []);
  const winnaar = kiesNieuwsteGeldige(lokaal, cloud, {
    isGeldig: (waarde) => Number(waarde?.currentWeight) > 0 || (waarde?.weightHistory?.length || 0) > 0,
  }) || {};
  const laatste = weightHistory.at(-1)?.value;
  return {
    currentWeight: Number(winnaar.currentWeight) > 0 ? Number(winnaar.currentWeight) : laatste || 0,
    targetWeight: Number(winnaar.targetWeight) > 0 ? Number(winnaar.targetWeight) : 80,
    weightHistory,
    schemaVersion: CLOUD_SCHEMA_VERSION,
    updatedAtLocal: new Date(Math.max(entityTimestamp(lokaal), entityTimestamp(cloud), timestampMillis(weightHistory.at(-1)?.date))).toISOString(),
  };
}

export function mergeHistorieOpId(lokaal = [], cloud = [], verwijderdeIds = new Set()) {
  const perId = new Map();
  [...lokaal, ...cloud].forEach((training) => {
    const id = String(training?.trainingId || training?.id || "");
    if (!id || verwijderdeIds.has(id)) return;
    const bestaand = perId.get(id);
    perId.set(id, bestaand ? kiesNieuwsteGeldige(bestaand, training) : training);
  });
  return [...perId.values()].sort((a, b) => entityTimestamp(a) - entityTimestamp(b));
}

export function isRecenteSessie(sessie, nu = Date.now()) {
  if (!sessie || typeof sessie !== "object") return false;
  const tijdstip = entityTimestamp(sessie);
  return tijdstip > 0 && nu - tijdstip < 7 * 24 * 60 * 60 * 1000;
}
