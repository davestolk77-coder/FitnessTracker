export const TRAINING_WEIGHT_UNIT_VERSION = 1;
export const TRAINING_WEIGHT_OPTIONS = Array.from({ length: 20 }, (_, index) => (index + 1) * 10);

export function kilogramNaarPond(gewicht) {
  const waarde = Number(gewicht);
  return Number.isFinite(waarde) ? waarde * 2.2046226218 : gewicht;
}

export function pondNaarKilogram(gewicht) {
  const waarde = Number(gewicht);
  return Number.isFinite(waarde) ? waarde / 2.2046226218 : gewicht;
}

export function kilogramNaarPondStap(gewicht) {
  const waarde = Number(gewicht);
  if (!Number.isFinite(waarde) || waarde <= 0) return gewicht;
  return Math.min(200, Math.max(10, Math.round(kilogramNaarPond(waarde) / 10) * 10));
}

function converteerOefeningen(oefeningen) {
  if (!oefeningen || typeof oefeningen !== "object" || Array.isArray(oefeningen)) return oefeningen;
  return Object.fromEntries(Object.entries(oefeningen).map(([oefening, sets]) => [
    oefening,
    sets && typeof sets === "object" && !Array.isArray(sets)
      ? Object.fromEntries(Object.entries(sets).map(([setNummer, setData]) => [
          setNummer,
          setData && typeof setData === "object" && !Array.isArray(setData)
            ? { ...setData, gewicht: kilogramNaarPondStap(setData.gewicht) }
            : setData,
        ]))
      : sets,
  ]));
}

export function migreerTrainingsgewichten(dataset) {
  if (!dataset || typeof dataset !== "object" || Number(dataset.weightUnitVersion || 0) >= TRAINING_WEIGHT_UNIT_VERSION) return dataset;
  const resultaat = { ...dataset, weightUnit: "lb", weightUnitVersion: TRAINING_WEIGHT_UNIT_VERSION };
  if (resultaat.oefeningen) resultaat.oefeningen = converteerOefeningen(resultaat.oefeningen);
  if (resultaat.gegevens) resultaat.gegevens = converteerOefeningen(resultaat.gegevens);
  if (resultaat.exercises) resultaat.exercises = converteerOefeningen(resultaat.exercises);
  return resultaat;
}
