import { OEFENING_IDS, TRAINING_SCHEMA_IDS, VRIJE_TRAINING, migreerActieveSessieNaarVrijeTraining, trainingen } from "../data/trainingen.js";
import { leesAangepasteOefeningen, leesSchemaOefeningen } from "./customExercises.js";
import { migreerTrainingsgewichten, TRAINING_WEIGHT_UNIT_VERSION } from "./trainingWeightMigration.js";

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function uniekeNamen(...bronnen) {
  const gezien = new Set();
  return bronnen.flat().map((waarde) => typeof waarde === "string" ? waarde.trim() : "").filter((naam) => {
    if (!naam || gezien.has(naam)) return false;
    gezien.add(naam);
    return true;
  });
}

function namenUitOefeningen(value) {
  if (Array.isArray(value)) return value.map((item) => typeof item === "string" ? item : item?.naam);
  if (isObject(value) && !("schemas" in value) && !("schemaVersion" in value)) return Object.keys(value);
  return [];
}

function normaliseerObject(value) {
  return isObject(value) ? value : {};
}

function eersteGevuldeObject(...waarden) {
  return waarden.find((waarde) => isObject(waarde) && Object.keys(waarde).length > 0)
    || waarden.find(isObject)
    || {};
}

function normaliseerVoltooideSets(value) {
  if (Array.isArray(value)) return value.filter((sleutel) => typeof sleutel === "string");
  if (isObject(value)) return Object.entries(value).filter(([, voltooid]) => Boolean(voltooid)).map(([sleutel]) => sleutel);
  return [];
}

function idsUitLegacy(value) {
  if (isObject(value)) return value;
  if (!Array.isArray(value)) return {};
  return Object.fromEntries(value.flatMap((item) => {
    if (isObject(item) && item.naam && item.id) return [[String(item.naam), String(item.id)]];
    return [];
  }));
}

export function normaliseerTrainingSessie(invoer, { standaardTraining = VRIJE_TRAINING } = {}) {
  if (!isObject(invoer)) return null;
  const gewichten = migreerTrainingsgewichten(invoer);
  const gemigreerd = migreerActieveSessieNaarVrijeTraining(gewichten);
  const training = trainingen[gemigreerd.training] ? gemigreerd.training : standaardTraining;
  const trainingSchemaId = gemigreerd.trainingSchemaId || TRAINING_SCHEMA_IDS[training] || TRAINING_SCHEMA_IDS[VRIJE_TRAINING];
  const basisDefinities = leesSchemaOefeningen(trainingSchemaId, trainingen[training] || trainingen[VRIJE_TRAINING]);
  const ruweDefinities = Array.isArray(gemigreerd.oefeningDefinities)
    ? gemigreerd.oefeningDefinities
    : Array.isArray(gemigreerd.exerciseDefinitions) ? gemigreerd.exerciseDefinitions : [];
  const legacyIds = idsUitLegacy(gemigreerd.oefeningIds || gemigreerd.exerciseIds);
  const oefeningenAlsGegevens = isObject(gemigreerd.oefeningen) && !("schemas" in gemigreerd.oefeningen) && !("schemaVersion" in gemigreerd.oefeningen)
    ? gemigreerd.oefeningen
    : {};
  const gegevens = eersteGevuldeObject(gemigreerd.gegevens, gemigreerd.exercises, oefeningenAlsGegevens);
  const statussen = eersteGevuldeObject(gemigreerd.statussen, gemigreerd.exerciseStatuses);
  const namen = uniekeNamen(
    basisDefinities.map(({ naam }) => naam),
    namenUitOefeningen(gemigreerd.oefeningen),
    Object.keys(gegevens),
    Object.keys(statussen),
    Object.keys(legacyIds),
    ruweDefinities.map(({ naam }) => naam),
  );
  const definitiePerNaam = new Map([
    ...basisDefinities.filter(({ id }) => id).map((item) => [item.naam, item]),
    ...ruweDefinities.filter((item) => item?.naam && String(item?.id || "").startsWith("custom-")).map((item) => [String(item.naam), { naam: String(item.naam), id: String(item.id) }]),
  ]);
  const verwijderdeIds = new Set(leesAangepasteOefeningen().verwijderdeIds);
  const oefeningIds = Object.fromEntries(namen.map((naam) => [
    naam,
    legacyIds[naam] || definitiePerNaam.get(naam)?.id || OEFENING_IDS[naam] || naam,
  ]));
  const oefeningen = namen.filter((naam) => !verwijderdeIds.has(oefeningIds[naam]));
  const oefeningDefinities = oefeningen
    .map((naam) => definitiePerNaam.get(naam) || (String(oefeningIds[naam]).startsWith("custom-") ? { naam, id: oefeningIds[naam] } : null))
    .filter(Boolean);

  return {
    ...gemigreerd,
    training,
    trainingNaam: gemigreerd.trainingNaam || training,
    trainingSchemaId,
    oefeningen,
    oefeningIds: Object.fromEntries(oefeningen.map((naam) => [naam, oefeningIds[naam]])),
    oefeningDefinities,
    gegevens,
    cardio: normaliseerObject(gemigreerd.cardio),
    statussen,
    voltooideSets: normaliseerVoltooideSets(gemigreerd.voltooideSets || gemigreerd.completedSets),
    timer: Number.isFinite(Number(gemigreerd.timer)) ? Math.max(0, Number(gemigreerd.timer)) : 0,
    status: gemigreerd.status || "Actief",
    weightUnit: "lb",
    weightUnitVersion: TRAINING_WEIGHT_UNIT_VERSION,
  };
}
