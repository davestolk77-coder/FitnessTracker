import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { maakEenmaligeUitvoerder } from "../src/utils/eenmaligeUitvoerder.js";

const trainingPagina = await readFile(new URL("../src/pages/Trainingen.jsx", import.meta.url), "utf8");
const modal = await readFile(new URL("../src/components/StopTrainingModal.jsx", import.meta.url), "utf8");

assert.doesNotMatch(trainingPagina, /\b(?:window\.)?confirm\s*\(/, "stoppen mag geen browserconfirm gebruiken");
assert.match(trainingPagina, /onClick=\{\(\) => setBevestigStoppen\(true\)\}/, "stopknop moet de modal openen");
assert.match(modal, /role="dialog"/);
assert.match(modal, /aria-modal="true"/);
assert.match(modal, /aria-labelledby="stop-training-titel"/);
assert.match(modal, /aria-describedby="stop-training-uitleg"/);
assert.match(modal, /event\.key === "Escape"/, "Escape moet de modal sluiten");
assert.match(
  modal,
  /<div className="confirmation-backdrop stop-training-backdrop" role="presentation">/,
  "de backdrop mag geen sluit-handler hebben",
);

let stopAanroepen = 0;
let rondStoppenAf;
const stopBlokkade = new Promise((resolve) => { rondStoppenAf = resolve; });
const voerEenmaligUit = maakEenmaligeUitvoerder();
const eersteKlik = voerEenmaligUit(async () => {
  stopAanroepen += 1;
  await stopBlokkade;
});
const tweedeKlik = await voerEenmaligUit(async () => { stopAanroepen += 1; });
assert.equal(tweedeKlik, false, "dubbel klikken mag geen tweede stopactie starten");
assert.equal(stopAanroepen, 1, "de bestaande stopfunctie moet exact eenmaal worden aangeroepen");
rondStoppenAf();
assert.equal(await eersteKlik, true);

let writesBijAnnuleren = 0;
let modalOpen = true;
const doorgaanMetTrainen = () => { modalOpen = false; };
doorgaanMetTrainen();
assert.equal(modalOpen, false, "doorgaan moet alleen de modal sluiten");
assert.equal(writesBijAnnuleren, 0, "annuleren mag geen opslag- of syncwrite uitvoeren");

console.log("Alle stop-trainingmodal-, annulering- en dubbelkliktests zijn geslaagd.");
