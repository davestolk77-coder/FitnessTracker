import { trainingen } from "../data/trainingen.js";
import { leesJson } from "./storage.js";

const isObject = (waarde) => waarde && typeof waarde === "object" && !Array.isArray(waarde);

export function leesTrainingHistorie() {
  const opgeslagen = leesJson("trainingHistorie", []);
  return Array.isArray(opgeslagen) ? opgeslagen : [];
}

export function heeftCardio(training) {
  return isObject(training?.cardio) && Object.keys(training.cardio).length > 0;
}

export function telUitgevoerdeOefeningen(training) {
  const oefeningen = isObject(training?.oefeningen) ? Object.keys(training.oefeningen).length : 0;
  return oefeningen + (heeftCardio(training) ? 1 : 0);
}

export function normaliseerHistorieItem(training = {}) {
  const oefeningen = isObject(training.oefeningen) ? training.oefeningen : {};
  const cardio = isObject(training.cardio) ? training.cardio : {};
  const voltooidAantal = telUitgevoerdeOefeningen({ oefeningen, cardio });
  const standaardTotaal = trainingen[training.training]?.length;
  const opgeslagenTotaal = Number(training.totaalOefeningen);
  const totaalOefeningen = Number.isFinite(opgeslagenTotaal) && opgeslagenTotaal > 0
    ? opgeslagenTotaal
    : standaardTotaal || Math.max(voltooidAantal, 1);
  const isVolledig = voltooidAantal === totaalOefeningen;
  const voltooideSets = Object.values(oefeningen).reduce(
    (totaal, sets) => totaal + (isObject(sets) ? Object.keys(sets).length : 0),
    0,
  );

  return {
    ...training,
    startTijd: training.startTijd ?? null,
    duur: Number.isFinite(Number(training.duur)) ? Number(training.duur) : null,
    oefeningen,
    cardio,
    voltooideSets,
    voltooidAantal,
    voltooideOefeningen: voltooidAantal,
    totaalOefeningen,
    isVolledig,
    status: isVolledig ? "Voltooid" : "Gedeeltelijk",
  };
}

export function berekenPersoonlijkeRecords(historie) {
  const records = {};
  historie.forEach((training) => Object.entries(training?.oefeningen || {}).forEach(([oefening, sets]) => {
    Object.values(sets || {}).forEach((setData) => {
      const gewicht = Number(setData?.gewicht || 0);
      if (Number.isFinite(gewicht) && gewicht > (records[oefening] || 0)) records[oefening] = gewicht;
    });
  }));
  return records;
}

export function vindLaatsteOefeningWaarden(historie, oefening) {
  for (let index = historie.length - 1; index >= 0; index -= 1) {
    const waarden = historie[index]?.oefeningen?.[oefening];
    if (isObject(waarden)) return waarden;
  }
  return null;
}

export function maakKrachtGrafiekData(historie, oefening) {
  if (!oefening) return [];
  const grafiekData = [];
  historie.forEach((training, index) => {
    const sets = training?.oefeningen?.[oefening];
    if (!isObject(sets)) return;
    const hoogsteGewicht = Object.values(sets).reduce((hoogste, setData) => {
      const gewicht = Number(setData?.gewicht || 0);
      return Number.isFinite(gewicht) ? Math.max(hoogste, gewicht) : hoogste;
    }, 0);
    grafiekData.push({ training: index + 1, gewicht: hoogsteGewicht });
  });
  return grafiekData;
}

export function verwijderOefeningUitTraining(training, oefening) {
  const genormaliseerd = normaliseerHistorieItem(training);
  if (genormaliseerd.voltooidAantal <= 1) {
    throw new Error("De laatste oefening kan niet afzonderlijk worden verwijderd.");
  }
  const bijgewerkt = JSON.parse(JSON.stringify(genormaliseerd));
  if (oefening === "Cardio") bijgewerkt.cardio = {};
  else delete bijgewerkt.oefeningen[oefening];
  return normaliseerHistorieItem(bijgewerkt);
}

export function slaTrainingHistorieOp(historie) {
  if (!Array.isArray(historie)) throw new Error("De trainingshistorie heeft een ongeldig formaat.");
  const records = berekenPersoonlijkeRecords(historie);
  const vorigeHistorie = localStorage.getItem("trainingHistorie");
  const vorigeRecords = localStorage.getItem("persoonlijkeRecords");
  const vorigeEngelseRecords = localStorage.getItem("personalRecords");
  const herstelWaarde = (sleutel, waarde) => {
    if (waarde === null) localStorage.removeItem(sleutel);
    else localStorage.setItem(sleutel, waarde);
  };

  try {
    localStorage.setItem("trainingHistorie", JSON.stringify(historie));
    localStorage.setItem("persoonlijkeRecords", JSON.stringify(records));
    if (vorigeEngelseRecords !== null) localStorage.setItem("personalRecords", JSON.stringify(records));
  } catch (error) {
    try {
      herstelWaarde("trainingHistorie", vorigeHistorie);
      herstelWaarde("persoonlijkeRecords", vorigeRecords);
      herstelWaarde("personalRecords", vorigeEngelseRecords);
    } catch {
      // De oorspronkelijke opslagfout blijft leidend; de UI meldt dat opnieuw geprobeerd moet worden.
    }
    throw error;
  }
  return records;
}
