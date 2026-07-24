import { kilogramNaarPond, pondNaarKilogram } from "./trainingWeightMigration.js";

export const MINIMUM_GEWICHT_KG = 40;
export const MAXIMUM_GEWICHT_KG = 200;
const MARGE_KG = 2;
const MINIMUM_BEREIK_KG = 5;

function naarKilogram(waarde, eenheid) {
  return eenheid === "lb" ? pondNaarKilogram(waarde) : Number(waarde);
}

function vanKilogram(waarde, eenheid) {
  return eenheid === "lb" ? kilogramNaarPond(waarde) : waarde;
}

function begrens(waarde, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, waarde));
}

function zorgVoorMinimumBereik(minimum, maximum) {
  if (maximum - minimum >= MINIMUM_BEREIK_KG) return [minimum, maximum];
  const midden = (minimum + maximum) / 2;
  let volgendeMinimum = Math.floor(midden - (MINIMUM_BEREIK_KG / 2));
  let volgendeMaximum = Math.ceil(midden + (MINIMUM_BEREIK_KG / 2));
  if (volgendeMinimum < MINIMUM_GEWICHT_KG) {
    volgendeMinimum = MINIMUM_GEWICHT_KG;
    volgendeMaximum = MINIMUM_GEWICHT_KG + MINIMUM_BEREIK_KG;
  }
  if (volgendeMaximum > MAXIMUM_GEWICHT_KG) {
    volgendeMaximum = MAXIMUM_GEWICHT_KG;
    volgendeMinimum = MAXIMUM_GEWICHT_KG - MINIMUM_BEREIK_KG;
  }
  return [volgendeMinimum, volgendeMaximum];
}

function kiesTickStap(bereik) {
  return [1, 2, 5, 10, 20, 25, 50, 100].find((stap) => bereik / stap <= 6) || 100;
}

function maakTicks(minimum, maximum) {
  const stap = kiesTickStap(maximum - minimum);
  const ticks = [minimum];
  for (let tick = Math.ceil(minimum / stap) * stap; tick < maximum; tick += stap) {
    if (tick > minimum) ticks.push(tick);
  }
  if (maximum !== minimum) ticks.push(maximum);
  return [...new Set(ticks)];
}

export function berekenGewichtGrafiekSchaal(gewichten, eenheid = "kg") {
  if (eenheid !== "kg" && eenheid !== "lb") throw new Error("Onbekende gewichtseenheid.");
  const kilogrammen = (Array.isArray(gewichten) ? gewichten : [])
    .map((waarde) => naarKilogram(waarde, eenheid))
    .filter((waarde) => Number.isFinite(waarde));
  if (kilogrammen.length === 0) {
    const minimum = Math.round(vanKilogram(MINIMUM_GEWICHT_KG, eenheid));
    const maximum = Math.round(vanKilogram(MINIMUM_GEWICHT_KG + MINIMUM_BEREIK_KG, eenheid));
    return { domain: [minimum, maximum], ticks: maakTicks(minimum, maximum) };
  }

  let minimumKg = begrens(Math.floor(Math.min(...kilogrammen) - MARGE_KG), MINIMUM_GEWICHT_KG, MAXIMUM_GEWICHT_KG);
  let maximumKg = begrens(Math.ceil(Math.max(...kilogrammen) + MARGE_KG), MINIMUM_GEWICHT_KG, MAXIMUM_GEWICHT_KG);
  [minimumKg, maximumKg] = zorgVoorMinimumBereik(minimumKg, maximumKg);

  const minimum = Math.round(vanKilogram(minimumKg, eenheid));
  const maximum = Math.round(vanKilogram(maximumKg, eenheid));
  return { domain: [minimum, maximum], ticks: maakTicks(minimum, maximum) };
}
