import { TRAINING_SCHEMA_IDS, trainingSchemas, trainingen } from "../data/trainingen.js";
import { meldLokaleWijziging } from "../sync/localChanges.js";

export const HISTORIE_SCHEMA_VERSION = 1;
export const HISTORIE_KEYS = {
  primair: "trainingHistorie",
  backup: "trainingHistorieBackup",
  vorigeBackup: "trainingHistorieBackupPrevious",
  tijdelijk: "trainingHistoriePending",
  volledigeBackup: "fitnessTrackerFullBackup",
  vorigeVolledigeBackup: "fitnessTrackerFullBackupPrevious",
};

const LEGACY_HISTORIE_KEYS = [
  "trainingHistory",
  "trainingsHistorie",
  "workoutHistory",
  "historie",
  "workouts",
  "trainingen",
  "fitnessTrackerData",
  "fitnessTrackerBackup",
  HISTORIE_KEYS.volledigeBackup,
  HISTORIE_KEYS.vorigeVolledigeBackup,
];

const ACTIEVE_TRAINING_KEYS = ["actieveTraining", "activeTraining", "activeWorkout", "onafgerondeTraining", "tijdelijkeTraining"];
const HERSTEL_MARKER_KEY = "fitnessTrackerHistorieRecoveryV1";
const isObject = (waarde) => waarde && typeof waarde === "object" && !Array.isArray(waarde);
const isGevuld = (waarde) => waarde !== undefined && waarde !== null && waarde !== "";

function parseJson(ruw, bron) {
  if (ruw === null) return { bestaat: false, geldig: false, waarde: null, ruw: null };
  try {
    return { bestaat: true, geldig: true, waarde: JSON.parse(ruw), ruw };
  } catch (error) {
    console.error(`[FitnessTracker opslag] ${bron} bevat ongeldige JSON en wordt niet overschreven.`, error);
    return { bestaat: true, geldig: false, waarde: null, ruw };
  }
}

function leesKey(sleutel) {
  return parseJson(localStorage.getItem(sleutel), sleutel);
}

function hashTekst(tekst) {
  let hash = 2166136261;
  for (let index = 0; index < tekst.length; index += 1) {
    hash ^= tekst.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function maakDeterministischeId(training) {
  const basis = [training.training, training.datum, training.startTijd, JSON.stringify(training.oefeningen || {}), JSON.stringify(training.cardio || {})].join("|");
  return `training-${hashTekst(basis)}`;
}

export function maakNieuweTrainingId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `training-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normaliseerSets(sets) {
  if (!isObject(sets)) return {};
  return Object.fromEntries(Object.entries(sets).map(([setNummer, setData]) => [setNummer, isObject(setData) ? { ...setData } : {}]));
}

function normaliseerOefeningen(waarde) {
  if (!isObject(waarde)) return {};
  return Object.fromEntries(Object.entries(waarde).filter(([naam]) => naam !== "Cardio").map(([naam, sets]) => [naam, normaliseerSets(sets)]));
}

export function heeftCardio(training) {
  return isObject(training?.cardio) && Object.keys(training.cardio).some((sleutel) => isGevuld(training.cardio[sleutel]));
}

export function telUitgevoerdeOefeningen(training) {
  const oefeningen = isObject(training?.oefeningen) ? Object.keys(training.oefeningen).length : 0;
  return oefeningen + (heeftCardio(training) ? 1 : 0);
}

export function getTrainingSchema(training) {
  if (!training || typeof training !== "object") return null;
  const explicietSchemaId = training.trainingSchemaId || training.schemaId;
  if (explicietSchemaId && trainingSchemas[explicietSchemaId]) return trainingSchemas[explicietSchemaId];
  if (training.trainingId && trainingSchemas[training.trainingId]) return trainingSchemas[training.trainingId];
  const schemaIdViaNaam = TRAINING_SCHEMA_IDS[training.training || training.trainingsnaam || training.workoutName || training.naam];
  return schemaIdViaNaam ? trainingSchemas[schemaIdViaNaam] : null;
}

export function getOntbrekendeOefeningen(training) {
  const schema = getTrainingSchema(training);
  if (!schema) return [];
  const uitgevoerd = new Set(Object.keys(training.oefeningen || {}));
  if (heeftCardio(training)) uitgevoerd.add("Cardio");
  return schema.oefeningen.filter((oefening) => !uitgevoerd.has(oefening));
}

function isMogelijkHistorieItem(item) {
  // Onbekende velden uit oudere versies blijven via de objectspread in
  // normaliseerHistorieItem behouden. Een object niet herkennen mag daarom
  // nooit een reden zijn om het stil uit de historie te verwijderen.
  return isObject(item);
}

export function normaliseerHistorieItem(item = {}) {
  const trainingsnaam = item.training || item.trainingsnaam || item.workoutName || item.naam || "Training";
  const datum = item.datum || item.date || item.eindTijd || item.endTime || null;
  const startTijd = item.startTijd ?? item.startTime ?? null;
  const eindTijd = item.eindTijd ?? item.endTime ?? datum;
  const ruweOefeningen = item.oefeningen || item.exercises || item.gegevens || {};
  const cardioUitOefeningen = isObject(ruweOefeningen) && isObject(ruweOefeningen.Cardio) ? ruweOefeningen.Cardio : {};
  const cardio = isObject(item.cardio) ? { ...item.cardio } : { ...cardioUitOefeningen };
  const oefeningen = normaliseerOefeningen(ruweOefeningen);
  const voltooidAantal = telUitgevoerdeOefeningen({ oefeningen, cardio });
  const schema = getTrainingSchema({ ...item, training: trainingsnaam });
  const opgeslagenTotaal = Number(item.totaalOefeningen ?? item.totalExercises);
  const standaardTotaal = schema?.oefeningen.length;
  const totaalOefeningen = Number.isFinite(opgeslagenTotaal) && opgeslagenTotaal > 0
    ? Math.max(opgeslagenTotaal, voltooidAantal)
    : standaardTotaal || Math.max(voltooidAantal, 1);
  const isVolledig = voltooidAantal === totaalOefeningen;
  const afgeleideDuur = Number.isFinite(Number(startTijd)) && Number.isFinite(Number(eindTijd))
    ? Math.max(0, Math.round((Number(eindTijd) - Number(startTijd)) / 1000))
    : null;
  const opgeslagenDuur = Number(item.duur ?? item.duration);
  const duur = Number.isFinite(opgeslagenDuur) && opgeslagenDuur >= 0 ? opgeslagenDuur : afgeleideDuur;
  const voltooideSets = Object.values(oefeningen).reduce((totaal, sets) => totaal + Object.keys(sets).length, 0);
  const zonderId = {
    ...item,
    schemaVersion: HISTORIE_SCHEMA_VERSION,
    ...(schema ? { trainingSchemaId: schema.id } : {}),
    training: trainingsnaam,
    datum,
    startTijd,
    eindTijd,
    duur,
    oefeningen,
    cardio,
    voltooideSets,
    voltooidAantal,
    voltooideOefeningen: voltooidAantal,
    totaalOefeningen,
    isVolledig,
    status: isVolledig ? "Voltooid" : "Gedeeltelijk",
  };
  return {
    ...zonderId,
    trainingId: String(item.trainingId || item.id || item.workoutId || maakDeterministischeId(zonderId)),
  };
}

function rijkdomScore(item) {
  return JSON.stringify(item).length + telUitgevoerdeOefeningen(item) * 1000 + Number(Boolean(item.startTijd)) * 100;
}

function combineerSets(eerste = {}, tweede = {}) {
  const gecombineerd = { ...eerste };
  Object.entries(tweede).forEach(([nummer, setData]) => {
    if (!gecombineerd[nummer] || JSON.stringify(setData).length > JSON.stringify(gecombineerd[nummer]).length) gecombineerd[nummer] = setData;
  });
  return gecombineerd;
}

function combineerItems(eerste, tweede) {
  const rijkste = rijkdomScore(eerste) >= rijkdomScore(tweede) ? eerste : tweede;
  const aanvulling = rijkste === eerste ? tweede : eerste;
  const oefeningen = { ...aanvulling.oefeningen };
  Object.entries(rijkste.oefeningen || {}).forEach(([naam, sets]) => {
    oefeningen[naam] = combineerSets(oefeningen[naam], sets);
  });
  return normaliseerHistorieItem({
    ...aanvulling,
    ...rijkste,
    datum: rijkste.datum ?? aanvulling.datum,
    startTijd: rijkste.startTijd ?? aanvulling.startTijd,
    eindTijd: rijkste.eindTijd ?? aanvulling.eindTijd,
    oefeningen,
    cardio: { ...(aanvulling.cardio || {}), ...(rijkste.cardio || {}) },
  });
}

function zelfdeTraining(eerste, tweede) {
  if (eerste.trainingId && tweede.trainingId && eerste.trainingId === tweede.trainingId) return true;
  const zelfdeNaam = eerste.training === tweede.training;
  const zelfdeDatum = isGevuld(eerste.datum) && isGevuld(tweede.datum) && String(eerste.datum) === String(tweede.datum);
  const zelfdeStart = isGevuld(eerste.startTijd) && isGevuld(tweede.startTijd) && String(eerste.startTijd) === String(tweede.startTijd);
  return zelfdeNaam && (zelfdeDatum || zelfdeStart);
}

export function normaliseerTrainingHistorie(waarde) {
  if (!Array.isArray(waarde)) return [];
  const resultaat = [];
  waarde.filter(isMogelijkHistorieItem).map(normaliseerHistorieItem).forEach((item) => {
    const bestaandIndex = resultaat.findIndex((bestaand) => zelfdeTraining(bestaand, item));
    if (bestaandIndex === -1) resultaat.push(item);
    else resultaat[bestaandIndex] = combineerItems(resultaat[bestaandIndex], item);
  });
  return resultaat;
}

function haalHistorieUitContainer(waarde) {
  if (Array.isArray(waarde)) return waarde;
  if (!isObject(waarde)) return [];
  const velden = ["trainingHistorie", "trainingHistory", "trainingsHistorie", "historie", "workoutHistory", "workouts", "trainingen"];
  for (const veld of velden) {
    if (Array.isArray(waarde[veld])) return waarde[veld];
  }
  if (isObject(waarde.data)) return haalHistorieUitContainer(waarde.data);
  return [];
}

function actieveTrainingNaarHistorie(waarde) {
  if (!isObject(waarde) || !waarde.training || !trainingen[waarde.training]) return [];
  const onderdelen = trainingen[waarde.training];
  const statussen = isObject(waarde.statussen) ? waarde.statussen : {};
  const explicietVoltooid = waarde.isVolledig === true || waarde.status === "Voltooid";
  const alleStatussenVoltooid = onderdelen.every((onderdeel) => statussen[onderdeel] === "Voltooid");
  if (!explicietVoltooid && !alleStatussenVoltooid) return [];
  const startTijd = waarde.startTijd ?? waarde.startTime ?? null;
  return [{
    ...waarde,
    trainingId: waarde.trainingId || maakDeterministischeId({ training: waarde.training, startTijd, oefeningen: waarde.gegevens, cardio: waarde.cardio }),
    training: waarde.training,
    datum: waarde.datum || waarde.eindTijd || startTijd,
    startTijd,
    eindTijd: waarde.eindTijd ?? waarde.datum ?? null,
    oefeningen: waarde.gegevens || waarde.oefeningen || {},
    cardio: waarde.cardio || {},
    totaalOefeningen: onderdelen.length,
    isVolledig: true,
    status: "Voltooid",
  }];
}

function verzamelHerstelbronnen() {
  const bronnen = [HISTORIE_KEYS.primair, HISTORIE_KEYS.backup, HISTORIE_KEYS.vorigeBackup, HISTORIE_KEYS.tijdelijk, ...LEGACY_HISTORIE_KEYS];
  const gevonden = [];
  [...new Set(bronnen)].forEach((sleutel) => {
    const gelezen = leesKey(sleutel);
    const items = gelezen.geldig ? normaliseerTrainingHistorie(haalHistorieUitContainer(gelezen.waarde)) : [];
    console.info(`[FitnessTracker herstel] ${sleutel}: ${items.length} geldig(e) item(s) gevonden.`);
    gevonden.push(...items);
  });
  ACTIEVE_TRAINING_KEYS.forEach((sleutel) => {
    const gelezen = leesKey(sleutel);
    const items = gelezen.geldig ? normaliseerTrainingHistorie(actieveTrainingNaarHistorie(gelezen.waarde)) : [];
    console.info(`[FitnessTracker herstel] ${sleutel}: ${items.length} afgeronde actieve training(en) gevonden.`);
    gevonden.push(...items);
  });
  return normaliseerTrainingHistorie(gevonden);
}

export function leesTrainingHistorie() {
  const primair = leesKey(HISTORIE_KEYS.primair);
  if (primair.geldig && Array.isArray(primair.waarde)) return normaliseerTrainingHistorie(primair.waarde);
  const hersteld = verzamelHerstelbronnen();
  if (hersteld.length > 0) {
    console.warn(`[FitnessTracker opslag] Primaire historie is niet leesbaar; ${hersteld.length} item(s) zijn uit herstelbronnen geladen.`);
    return hersteld;
  }
  if (primair.bestaat) console.error("[FitnessTracker opslag] Historie is onleesbaar en er is geen geldige herstelbron. De onleesbare primaire waarde blijft onaangetast.");
  return [];
}

export function berekenPersoonlijkeRecords(historie) {
  const records = {};
  normaliseerTrainingHistorie(historie).forEach((training) => Object.entries(training.oefeningen).forEach(([oefening, sets]) => {
    Object.values(sets).forEach((setData) => {
      const gewicht = Number(setData?.gewicht || 0);
      if (Number.isFinite(gewicht) && gewicht > (records[oefening] || 0)) records[oefening] = gewicht;
    });
  }));
  return records;
}

export function vindLaatsteOefeningWaarden(historie, oefening) {
  const geldigeHistorie = normaliseerTrainingHistorie(historie);
  for (let index = geldigeHistorie.length - 1; index >= 0; index -= 1) {
    const waarden = geldigeHistorie[index].oefeningen[oefening];
    if (isObject(waarden)) return waarden;
  }
  return null;
}

export function maakKrachtGrafiekData(historie, oefening) {
  if (!oefening) return [];
  const grafiekData = [];
  normaliseerTrainingHistorie(historie).forEach((training, index) => {
    const sets = training.oefeningen[oefening];
    if (!isObject(sets)) return;
    const hoogsteGewicht = Object.values(sets).reduce((hoogste, setData) => {
      const gewicht = Number(setData?.gewicht || 0);
      return Number.isFinite(gewicht) ? Math.max(hoogste, gewicht) : hoogste;
    }, 0);
    grafiekData.push({ training: index + 1, gewicht: hoogsteGewicht });
  });
  return grafiekData;
}

function historieFingerprint(historie) {
  return JSON.stringify(normaliseerTrainingHistorie(historie));
}

export function maakHistorieBackup(historie = leesTrainingHistorie()) {
  const geldig = normaliseerTrainingHistorie(historie);
  if (geldig.length === 0) return false;
  const huidigeBackup = leesKey(HISTORIE_KEYS.backup);
  if (huidigeBackup.geldig && normaliseerTrainingHistorie(huidigeBackup.waarde).length > 0) {
    localStorage.setItem(HISTORIE_KEYS.vorigeBackup, JSON.stringify(huidigeBackup.waarde));
  }
  localStorage.setItem(HISTORIE_KEYS.backup, JSON.stringify(geldig));
  return true;
}

export function schrijfTrainingHistorie(nieuweHistorie, { explicieteVerwijdering = false, reden = "wijziging" } = {}) {
  if (!Array.isArray(nieuweHistorie)) throw new Error("De nieuwe trainingshistorie moet een array zijn.");
  const vorigePrimaire = leesKey(HISTORIE_KEYS.primair);
  const huidigeHistorie = vorigePrimaire.geldig && Array.isArray(vorigePrimaire.waarde)
    ? normaliseerTrainingHistorie(vorigePrimaire.waarde)
    : leesTrainingHistorie();
  const volgendeHistorie = normaliseerTrainingHistorie(nieuweHistorie);
  const vorigeRecords = localStorage.getItem("persoonlijkeRecords");
  const vorigeEngelseRecords = localStorage.getItem("personalRecords");
  if (vorigePrimaire.geldig && Array.isArray(vorigePrimaire.waarde) && vorigePrimaire.waarde.some((item) => !isObject(item))) {
    throw new Error("De bestaande historie bevat een onbekend item en blijft daarom onaangetast.");
  }
  if (volgendeHistorie.length < huidigeHistorie.length && !explicieteVerwijdering) {
    throw new Error("Een niet-expliciete wijziging mag geen historie-items verwijderen.");
  }
  if (huidigeHistorie.length > 0 && volgendeHistorie.length === 0 && !explicieteVerwijdering) {
    throw new Error("Een lege historie mag bestaande historie niet overschrijven.");
  }
  if (nieuweHistorie.length > 0 && volgendeHistorie.length === 0) {
    throw new Error("De nieuwe trainingshistorie bevat geen geldige items.");
  }

  try {
    maakHistorieBackup(huidigeHistorie);
    localStorage.setItem(HISTORIE_KEYS.tijdelijk, JSON.stringify(volgendeHistorie));
    const tijdelijk = leesKey(HISTORIE_KEYS.tijdelijk);
    const tijdelijkGeldig = tijdelijk.geldig ? normaliseerTrainingHistorie(tijdelijk.waarde) : [];
    if (!tijdelijk.geldig || tijdelijkGeldig.length !== volgendeHistorie.length || historieFingerprint(tijdelijkGeldig) !== historieFingerprint(volgendeHistorie)) {
      throw new Error("Controle van de tijdelijke historie is mislukt.");
    }

    localStorage.setItem(HISTORIE_KEYS.primair, JSON.stringify(tijdelijkGeldig));
    const teruggelezen = leesKey(HISTORIE_KEYS.primair);
    const gecontroleerd = teruggelezen.geldig ? normaliseerTrainingHistorie(teruggelezen.waarde) : [];
    if (!teruggelezen.geldig || gecontroleerd.length !== volgendeHistorie.length || historieFingerprint(gecontroleerd) !== historieFingerprint(volgendeHistorie)) {
      throw new Error("Teruglezen van de primaire historie is mislukt.");
    }

    const records = berekenPersoonlijkeRecords(gecontroleerd);
    if (localStorage.getItem("personalRecords") !== null) localStorage.setItem("personalRecords", JSON.stringify(records));
    localStorage.setItem("persoonlijkeRecords", JSON.stringify(records));
    try {
      localStorage.removeItem(HISTORIE_KEYS.tijdelijk);
    } catch (error) {
      console.warn("[FitnessTracker opslag] De gecontroleerde tijdelijke kopie kon niet worden opgeruimd en blijft beschikbaar voor herstel.", error);
    }
    console.info(`[FitnessTracker opslag] ${reden}: ${huidigeHistorie.length} → ${gecontroleerd.length} historie-item(s), gecontroleerd en opgeslagen.`);
    return gecontroleerd;
  } catch (error) {
    try {
      if (vorigePrimaire.geldig && Array.isArray(vorigePrimaire.waarde)) {
        localStorage.setItem(HISTORIE_KEYS.primair, vorigePrimaire.ruw);
      } else {
        const backup = leesKey(HISTORIE_KEYS.backup);
        if (backup.geldig && normaliseerTrainingHistorie(backup.waarde).length > 0) localStorage.setItem(HISTORIE_KEYS.primair, JSON.stringify(backup.waarde));
      }
      if (vorigeRecords !== null) localStorage.setItem("persoonlijkeRecords", vorigeRecords);
      if (vorigeEngelseRecords !== null) localStorage.setItem("personalRecords", vorigeEngelseRecords);
    } catch (herstelFout) {
      console.error("[FitnessTracker opslag] Automatisch terugzetten van de historie is mislukt.", herstelFout);
    }
    throw error;
  }
}

export function voegTrainingToe(training, { meldSync = true } = {}) {
  const huidigeHistorie = leesTrainingHistorie();
  const nu = new Date().toISOString();
  const nieuwItem = normaliseerHistorieItem({
    ...training,
    trainingId: training.trainingId || maakNieuweTrainingId(),
    createdAtLocal: training.createdAtLocal || nu,
    updatedAtLocal: nu,
  });
  const resultaat = schrijfTrainingHistorie([...huidigeHistorie, nieuwItem], { reden: "training toevoegen" });
  if (!resultaat.some((item) => item.trainingId === nieuwItem.trainingId)) throw new Error("De toegevoegde training kon niet worden teruggelezen.");
  const opgeslagenTraining = resultaat.find((item) => item.trainingId === nieuwItem.trainingId);
  if (meldSync) meldLokaleWijziging({ type: "history-upsert", data: opgeslagenTraining, urgent: true });
  return { historie: resultaat, training: opgeslagenTraining };
}

export function werkTrainingBij(trainingId, bijgewerktItem) {
  const huidigeHistorie = leesTrainingHistorie();
  const index = huidigeHistorie.findIndex((item) => item.trainingId === trainingId);
  if (index === -1) throw new Error("De geselecteerde training bestaat niet meer.");
  const volgendeHistorie = [...huidigeHistorie];
  volgendeHistorie[index] = normaliseerHistorieItem({
    ...bijgewerktItem,
    trainingId,
    createdAtLocal: huidigeHistorie[index].createdAtLocal || bijgewerktItem.createdAtLocal || huidigeHistorie[index].datum,
    updatedAtLocal: new Date().toISOString(),
  });
  const resultaat = schrijfTrainingHistorie(volgendeHistorie, { reden: "training bijwerken" });
  meldLokaleWijziging({ type: "history-upsert", data: resultaat.find((item) => item.trainingId === trainingId), urgent: true });
  return resultaat;
}

export function verwijderTraining(trainingId) {
  const huidigeHistorie = leesTrainingHistorie();
  const volgendeHistorie = huidigeHistorie.filter((item) => item.trainingId !== trainingId);
  if (volgendeHistorie.length === huidigeHistorie.length) throw new Error("De geselecteerde training bestaat niet meer.");
  const resultaat = schrijfTrainingHistorie(volgendeHistorie, { explicieteVerwijdering: true, reden: "training verwijderen" });
  meldLokaleWijziging({ type: "history-delete", data: { trainingId }, urgent: true });
  return resultaat;
}

export function verwijderOefeningUitTraining(training, oefening) {
  const genormaliseerd = normaliseerHistorieItem(training);
  if (genormaliseerd.voltooidAantal <= 1) throw new Error("De laatste oefening kan niet afzonderlijk worden verwijderd.");
  const bijgewerkt = JSON.parse(JSON.stringify(genormaliseerd));
  if (oefening === "Cardio") bijgewerkt.cardio = {};
  else delete bijgewerkt.oefeningen[oefening];
  return normaliseerHistorieItem(bijgewerkt);
}

export function herstelHistorieBackup() {
  const hersteld = verzamelHerstelbronnen();
  const huidig = leesTrainingHistorie();
  const samengevoegd = normaliseerTrainingHistorie([...huidig, ...hersteld]);
  if (samengevoegd.length < huidig.length) throw new Error("Herstel zou bestaande historie verwijderen en is gestopt.");
  if (samengevoegd.length === 0 || historieFingerprint(samengevoegd) === historieFingerprint(huidig)) return huidig;
  return schrijfTrainingHistorie(samengevoegd, { reden: "automatisch historieherstel" });
}

export function initialiseerVeiligeHistorieOpslag() {
  const primair = leesKey(HISTORIE_KEYS.primair);
  const herstelAlUitgevoerd = localStorage.getItem(HERSTEL_MARKER_KEY) === "1";
  if (herstelAlUitgevoerd && primair.geldig && Array.isArray(primair.waarde)) {
    const geldig = normaliseerTrainingHistorie(primair.waarde);
    if (geldig.length > 0) localStorage.setItem("persoonlijkeRecords", JSON.stringify(berekenPersoonlijkeRecords(geldig)));
    return geldig;
  }
  const hersteld = verzamelHerstelbronnen();
  const primairGeldig = primair.geldig && Array.isArray(primair.waarde) ? normaliseerTrainingHistorie(primair.waarde) : [];
  const samengevoegd = normaliseerTrainingHistorie([...primairGeldig, ...hersteld]);
  if (samengevoegd.length > 0 && (!primair.geldig || historieFingerprint(samengevoegd) !== historieFingerprint(primairGeldig))) {
    schrijfTrainingHistorie(samengevoegd, { reden: "veilige startup-normalisatie en herstel" });
  } else if (primairGeldig.length > 0) {
    localStorage.setItem("persoonlijkeRecords", JSON.stringify(berekenPersoonlijkeRecords(primairGeldig)));
  }
  localStorage.setItem(HERSTEL_MARKER_KEY, "1");
  return samengevoegd;
}

function leesOptioneleJsonKey(sleutel) {
  const gelezen = leesKey(sleutel);
  return gelezen.geldig ? gelezen.waarde : null;
}

export function maakFitnessBackupData() {
  const trainingHistorie = leesTrainingHistorie();
  return {
    schemaVersion: HISTORIE_SCHEMA_VERSION,
    exportDatum: new Date().toISOString(),
    trainingHistorie,
    gewicht: localStorage.getItem("huidigGewicht"),
    gewichtHistorie: leesOptioneleJsonKey("gewichtHistorie") || [],
    records: berekenPersoonlijkeRecords(trainingHistorie),
    actieveTraining: leesOptioneleJsonKey("actieveTraining"),
    instellingen: leesOptioneleJsonKey("appInstellingen"),
  };
}

function maakVolledigeLokaleBackup() {
  const bestaande = localStorage.getItem(HISTORIE_KEYS.volledigeBackup);
  if (bestaande !== null) localStorage.setItem(HISTORIE_KEYS.vorigeVolledigeBackup, bestaande);
  localStorage.setItem(HISTORIE_KEYS.volledigeBackup, JSON.stringify(maakFitnessBackupData()));
}

export function valideerFitnessBackup(inhoud) {
  let data;
  try {
    data = typeof inhoud === "string" ? JSON.parse(inhoud) : inhoud;
  } catch {
    throw new Error("Het gekozen bestand bevat geen geldige JSON.");
  }
  if (!isObject(data) || !Array.isArray(data.trainingHistorie)) throw new Error("Dit is geen geldige FitnessTracker-back-up.");
  if (data.gewichtHistorie !== undefined && !Array.isArray(data.gewichtHistorie)) throw new Error("De gewichtshistorie in de back-up heeft een ongeldig formaat.");
  if (data.instellingen !== undefined && data.instellingen !== null && !isObject(data.instellingen)) throw new Error("De instellingen in de back-up hebben een ongeldig formaat.");
  const trainingHistorie = normaliseerTrainingHistorie(data.trainingHistorie);
  if (data.trainingHistorie.length > 0 && trainingHistorie.length === 0) throw new Error("De back-up bevat geen herkenbare trainingen.");
  return {
    data: { ...data, trainingHistorie, gewichtHistorie: data.gewichtHistorie || [] },
    samenvatting: {
      trainingen: trainingHistorie.length,
      gewichtsmetingen: (data.gewichtHistorie || []).length,
      heeftActieveTraining: Boolean(data.actieveTraining),
    },
  };
}

function combineerGewichtHistorie(huidig, geïmporteerd) {
  const resultaat = [];
  [...huidig, ...geïmporteerd].filter(isObject).forEach((meting) => {
    const sleutel = `${meting.datum || ""}|${meting.gewicht ?? ""}`;
    if (!resultaat.some((item) => `${item.datum || ""}|${item.gewicht ?? ""}` === sleutel)) resultaat.push(meting);
  });
  return resultaat;
}

export function importeerFitnessBackup(inhoud) {
  const { data } = valideerFitnessBackup(inhoud);
  maakVolledigeLokaleBackup();
  maakHistorieBackup();
  const huidigeHistorie = leesTrainingHistorie();
  const samengevoegd = normaliseerTrainingHistorie([...huidigeHistorie, ...data.trainingHistorie]);
  const opgeslagenHistorie = schrijfTrainingHistorie(samengevoegd, { reden: "back-up importeren en samenvoegen" });

  const huidigGewicht = localStorage.getItem("huidigGewicht");
  if (huidigGewicht === null && isGevuld(data.gewicht)) localStorage.setItem("huidigGewicht", String(data.gewicht));
  const huidigeGewichten = leesKey("gewichtHistorie");
  if ((!huidigeGewichten.bestaat || (huidigeGewichten.geldig && Array.isArray(huidigeGewichten.waarde))) && data.gewichtHistorie.length > 0) {
    const basis = huidigeGewichten.geldig && Array.isArray(huidigeGewichten.waarde) ? huidigeGewichten.waarde : [];
    localStorage.setItem("gewichtHistorie", JSON.stringify(combineerGewichtHistorie(basis, data.gewichtHistorie)));
  }
  if (localStorage.getItem("actieveTraining") === null && isObject(data.actieveTraining)) {
    localStorage.setItem("actieveTraining", JSON.stringify(data.actieveTraining));
  }
  if (localStorage.getItem("appInstellingen") === null && isObject(data.instellingen)) {
    localStorage.setItem("appInstellingen", JSON.stringify(data.instellingen));
  }
  meldLokaleWijziging({ type: "full-sync", urgent: true });
  return opgeslagenHistorie;
}
