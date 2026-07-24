import assert from "node:assert/strict";
import { kilogramNaarPond } from "../src/utils/trainingWeightMigration.js";
import { berekenGewichtGrafiekSchaal } from "../src/utils/weightChartScale.js";

assert.deepEqual(berekenGewichtGrafiekSchaal([84.3, 86.8]).domain, [82, 89]);
assert.deepEqual(berekenGewichtGrafiekSchaal([79.8, 81]).domain, [77, 83]);
assert.deepEqual(berekenGewichtGrafiekSchaal([91.2, 94.1]).domain, [89, 97]);

const enkeleMeting = berekenGewichtGrafiekSchaal([80]);
assert.ok(enkeleMeting.domain[1] - enkeleMeting.domain[0] >= 5);
assert.ok(enkeleMeting.ticks.every(Number.isInteger));

const identiekeMetingen = berekenGewichtGrafiekSchaal([100, 100, 100]);
assert.ok(identiekeMetingen.domain[1] - identiekeMetingen.domain[0] >= 5);

const uiteenlopend = berekenGewichtGrafiekSchaal([20, 250]);
assert.deepEqual(uiteenlopend.domain, [40, 200]);
assert.ok(uiteenlopend.ticks.every(Number.isInteger));

const kilogramSchaal = berekenGewichtGrafiekSchaal([84.3, 86.8], "kg");
const pondSchaal = berekenGewichtGrafiekSchaal([kilogramNaarPond(84.3), kilogramNaarPond(86.8)], "lb");
assert.deepEqual(pondSchaal.domain, kilogramSchaal.domain.map((waarde) => Math.round(kilogramNaarPond(waarde))));
assert.ok(pondSchaal.ticks.every(Number.isInteger));

console.log("Alle dynamische gewichtsgrafiekschaaltests zijn geslaagd.");
