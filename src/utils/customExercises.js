export const CUSTOM_EXERCISES_KEY = "aangepasteOefeningen";
export const CUSTOM_EXERCISES_SCHEMA_VERSION = 2;

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function maakUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return [...bytes].map((byte, index) => `${index === 4 || index === 6 || index === 8 || index === 10 ? "-" : ""}${byte.toString(16).padStart(2, "0")}`).join("");
}

export function normaliseerOefeningNaam(naam) {
  return String(naam ?? "").trim();
}

export function normaliseerAangepasteOefeningen(value) {
  if (!isObject(value)) return { schemaVersion: CUSTOM_EXERCISES_SCHEMA_VERSION, schemas: {}, verwijderdeIds: [] };
  const verwijderdeIds = [...new Set((Array.isArray(value.verwijderdeIds) ? value.verwijderdeIds : [])
    .map(String).filter((id) => id.startsWith("custom-")))];
  const verwijderd = new Set(verwijderdeIds);
  const schemas = {};
  Object.entries(value.schemas || {}).forEach(([schemaId, oefeningen]) => {
    if (!Array.isArray(oefeningen)) return;
    const perId = new Map();
    const gebruikteNamen = new Set();
    oefeningen.forEach((oefening) => {
      const naam = normaliseerOefeningNaam(oefening?.naam);
      const id = String(oefening?.id || "");
      const naamSleutel = naam.toLocaleLowerCase("nl-NL");
      if (naam && id && !verwijderd.has(id) && !gebruikteNamen.has(naamSleutel)) {
        perId.set(id, { id, naam });
        gebruikteNamen.add(naamSleutel);
      }
    });
    schemas[schemaId] = [...perId.values()];
  });
  return { schemaVersion: CUSTOM_EXERCISES_SCHEMA_VERSION, schemas, verwijderdeIds };
}

export function voegCatalogiSamen(...waarden) {
  const catalogi = waarden.map(normaliseerAangepasteOefeningen);
  const verwijderdeIds = [...new Set(catalogi.flatMap((catalogus) => catalogus.verwijderdeIds))];
  const verwijderd = new Set(verwijderdeIds);
  const schemas = {};
  catalogi.forEach((catalogus) => Object.entries(catalogus.schemas).forEach(([schemaId, oefeningen]) => {
    const perNaam = new Map((schemas[schemaId] || []).map((item) => [item.naam.toLocaleLowerCase("nl-NL"), item]));
    oefeningen.forEach((item) => {
      if (!verwijderd.has(item.id)) perNaam.set(item.naam.toLocaleLowerCase("nl-NL"), item);
    });
    schemas[schemaId] = [...perNaam.values()].filter(({ id }) => !verwijderd.has(id));
  }));
  return { schemaVersion: CUSTOM_EXERCISES_SCHEMA_VERSION, schemas, verwijderdeIds };
}

export function leesAangepasteOefeningen() {
  try {
    const lokaal = normaliseerAangepasteOefeningen(JSON.parse(localStorage.getItem(CUSTOM_EXERCISES_KEY) || "{}"));
    const instellingen = JSON.parse(localStorage.getItem("appInstellingen") || "{}");
    const cloud = normaliseerAangepasteOefeningen(instellingen?.aangepasteOefeningen);
    return voegCatalogiSamen(cloud, lokaal);
  } catch {
    return normaliseerAangepasteOefeningen({});
  }
}

export function schrijfAangepasteOefeningen(catalogus) {
  const veilig = normaliseerAangepasteOefeningen(catalogus);
  localStorage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(veilig));
  return veilig;
}

export function leesSchemaOefeningen(schemaId, basisNamen = []) {
  const aangepast = leesAangepasteOefeningen().schemas[schemaId] || [];
  return [
    ...basisNamen.map((naam) => ({ naam, id: null })),
    ...aangepast,
  ];
}

export function voegAangepasteOefeningToe(schemaId, naam, bestaandeOefeningen = []) {
  const opgeschoond = normaliseerOefeningNaam(naam);
  if (!opgeschoond) throw new Error("Vul een naam voor de oefening in.");
  const catalogus = leesAangepasteOefeningen();
  const schemaOefeningen = catalogus.schemas[schemaId] || [];
  const alleNamen = [...bestaandeOefeningen.map((item) => typeof item === "string" ? item : item?.naam), ...schemaOefeningen.map((item) => item.naam)];
  if (alleNamen.some((bestaand) => String(bestaand).toLocaleLowerCase("nl-NL") === opgeschoond.toLocaleLowerCase("nl-NL"))) {
    throw new Error("Deze oefening staat al in dit trainingsschema.");
  }
  const oefening = { id: `custom-${maakUuid()}`, naam: opgeschoond };
  schrijfAangepasteOefeningen({
    ...catalogus,
    schemas: { ...catalogus.schemas, [schemaId]: [...schemaOefeningen, oefening] },
  });
  return oefening;
}

export function verwijderAangepasteOefening(schemaId, oefeningId) {
  const id = String(oefeningId || "");
  if (!id.startsWith("custom-")) throw new Error("Alleen aangepaste oefeningen kunnen worden verwijderd.");
  const catalogus = leesAangepasteOefeningen();
  if (catalogus.verwijderdeIds.includes(id)) return { verwijderd: false, id };
  const schemaOefeningen = catalogus.schemas[schemaId] || [];
  const oefening = schemaOefeningen.find((item) => item.id === id);
  if (!oefening) throw new Error("De aangepaste oefening bestaat niet in dit trainingsschema.");
  schrijfAangepasteOefeningen({
    ...catalogus,
    schemas: { ...catalogus.schemas, [schemaId]: schemaOefeningen.filter((item) => item.id !== id) },
    verwijderdeIds: [...catalogus.verwijderdeIds, id],
  });
  return { verwijderd: true, id, naam: oefening.naam };
}

export function verwijderOefeningUitSessie(sessie, oefeningId) {
  const naam = Object.entries(sessie.oefeningIds || {}).find(([, id]) => id === oefeningId)?.[0];
  if (!naam) return sessie;
  const gegevens = { ...(sessie.gegevens || {}) };
  const statussen = { ...(sessie.statussen || {}) };
  const oefeningIds = { ...(sessie.oefeningIds || {}) };
  delete gegevens[naam];
  delete statussen[naam];
  delete oefeningIds[naam];
  return {
    ...sessie,
    oefeningen: (sessie.oefeningen || []).filter((item) => item !== naam),
    oefeningDefinities: (sessie.oefeningDefinities || []).filter((item) => item.id !== oefeningId),
    oefeningIds,
    gegevens,
    statussen,
    voltooideSets: (sessie.voltooideSets || []).filter((sleutel) => !sleutel.startsWith(`${naam}-`)),
  };
}

export function verwijderGetombstonedeOefeningenUitSessie(sessie) {
  return leesAangepasteOefeningen().verwijderdeIds.reduce(
    (volgende, oefeningId) => verwijderOefeningUitSessie(volgende, oefeningId),
    sessie,
  );
}

export function herstelAangepasteOefeningenUitData(...datasets) {
  const catalogus = leesAangepasteOefeningen();
  let gewijzigd = false;
  datasets.flat().forEach((data) => {
    if (!isObject(data)) return;
    const schemaId = data.trainingSchemaId;
    const definities = Array.isArray(data.oefeningDefinities) ? data.oefeningDefinities : [];
    if (!schemaId || definities.length === 0) return;
    const bestaand = catalogus.schemas[schemaId] || [];
    const perId = new Map(bestaand.map((item) => [item.id, item]));
    definities.forEach((item) => {
      const id = String(item?.id || "");
      const naam = normaliseerOefeningNaam(item?.naam);
      if (id.startsWith("custom-") && naam && !catalogus.verwijderdeIds.includes(id) && !perId.has(id)) {
        perId.set(id, { id, naam });
        gewijzigd = true;
      }
    });
    catalogus.schemas[schemaId] = [...perId.values()];
  });
  return gewijzigd ? schrijfAangepasteOefeningen(catalogus) : catalogus;
}
