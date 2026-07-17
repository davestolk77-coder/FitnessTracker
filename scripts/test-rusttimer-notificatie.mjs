import assert from "node:assert/strict";
import {
  bewaarRusttimerNotificatieInstelling,
  leesRusttimerNotificatieInstelling,
  maakRusttimerNotificatieBewaker,
  RUSTTIMER_NOTIFICATIE_KEY,
  RUSTTIMER_NOTIFICATIE_TEKST,
  RUSTTIMER_NOTIFICATIE_TITEL,
  vraagRusttimerNotificatieToestemming,
} from "../src/utils/rusttimerNotificatie.js";

assert.equal(RUSTTIMER_NOTIFICATIE_TITEL, "⏱️ Rusttijd voorbij");
assert.equal(RUSTTIMER_NOTIFICATIE_TEKST, "Je kunt beginnen aan je volgende set.");

let aanvragen = 0;
const apiGranted = { permission: "default", requestPermission: async () => { aanvragen += 1; return "granted"; } };
assert.equal(aanvragen, 0, "toestemming mag niet automatisch worden gevraagd");
assert.equal(await vraagRusttimerNotificatieToestemming(apiGranted), "granted");
assert.equal(aanvragen, 1, "toestemming wordt pas na expliciet inschakelen gevraagd");
assert.equal(await vraagRusttimerNotificatieToestemming({ permission: "denied", requestPermission: async () => "granted" }), "denied");
assert.equal(await vraagRusttimerNotificatieToestemming(undefined), "unsupported");

const opslag = new Map();
const localStorage = { getItem: (key) => opslag.get(key) ?? null, setItem: (key, value) => opslag.set(key, String(value)) };
assert.equal(leesRusttimerNotificatieInstelling(localStorage), false);
bewaarRusttimerNotificatieInstelling(true, localStorage);
assert.equal(opslag.get(RUSTTIMER_NOTIFICATIE_KEY), "true");
assert.equal(leesRusttimerNotificatieInstelling(localStorage), true, "voorkeur moet na herladen behouden blijven");

let meldingen = 0;
const bewaker = maakRusttimerNotificatieBewaker(() => { meldingen += 1; }, { permission: "granted" });
bewaker.start();
assert.equal(bewaker.meld(true), true);
assert.equal(bewaker.meld(true), false);
assert.equal(meldingen, 1, "per timer mag maximaal één notificatie verschijnen");

bewaker.start();
bewaker.annuleer();
assert.equal(bewaker.meld(true), false);
assert.equal(meldingen, 1, "stoppen moet een latere notificatie voorkomen");

bewaker.start();
bewaker.start();
assert.equal(bewaker.meld(true), true);
assert.equal(bewaker.meld(true), false);
assert.equal(meldingen, 2, "herstarten of wisselen van set mag niet dubbel melden");

const stil = maakRusttimerNotificatieBewaker(() => { meldingen += 1; }, { permission: "granted" });
stil.start();
assert.equal(stil.meld(false), false, "uitgeschakelde meldingen blijven onafhankelijk van timer en geluid");
assert.equal(meldingen, 2);

console.log("Alle rusttimernotificatie-, toestemming- en annuleringscontroles zijn geslaagd.");
