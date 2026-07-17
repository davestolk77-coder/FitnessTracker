import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bewaarRusttimerGeluidInstelling, leesRusttimerGeluidInstelling, maakRusttimerAlarmBewaker, RUSTTIMER_GELUID_KEY } from "../src/utils/rusttimerAudio.js";

let signalen = 0;
const alarm = maakRusttimerAlarmBewaker(() => { signalen += 1; });
alarm.start();
assert.equal(alarm.tik(2), false);
assert.equal(alarm.tik(1), true);
assert.equal(signalen, 1, "geluid moet precies eenmaal bij de overgang naar nul spelen");
assert.equal(alarm.tik(1), false);
assert.equal(signalen, 1, "een extra render/tik mag geen dubbel signaal geven");

alarm.start();
alarm.annuleer();
assert.equal(alarm.tik(1), false);
assert.equal(signalen, 1, "annuleren mag geen geluid geven");

alarm.start();
assert.equal(alarm.tik(1, false), true);
assert.equal(signalen, 1, "uitgeschakeld geluid moet stil blijven");

const hersteldAlarm = maakRusttimerAlarmBewaker(() => { signalen += 1; });
assert.equal(hersteldAlarm.tik(1), false, "remount/herstel van een lopende of verstreken timer mag niet piepen");

const opslag = new Map();
const localStorage = { getItem: (key) => opslag.get(key) ?? null, setItem: (key, value) => opslag.set(key, String(value)) };
assert.equal(leesRusttimerGeluidInstelling(localStorage), true, "geluid moet standaard aan staan");
bewaarRusttimerGeluidInstelling(false, localStorage);
assert.equal(opslag.get(RUSTTIMER_GELUID_KEY), "false");
assert.equal(leesRusttimerGeluidInstelling(localStorage), false, "instelling moet na opnieuw openen behouden blijven");

const css = await readFile(new URL("../src/App.css", import.meta.url), "utf8");
assert.match(css, /--bottom-nav-height:[^;]*--bottom-nav-control-height[^;]*safe-area-inset-bottom/);
assert.match(css, /\.dashboard-version\s*\{[^}]*bottom:\s*calc\(var\(--bottom-nav-height\) \+ 8px\)/s);
assert.match(css, /\.app-content[^}]*padding:[^;]*var\(--bottom-nav-height\)/s);
assert.match(css, /\.toast-region\s*\{[^}]*z-index:\s*100[^}]*top:\s*calc\(max\(14px, env\(safe-area-inset-top\)\) \+ 8px\)/s);
assert.match(css, /\.set-timer-button\s*\{[^}]*min-height:\s*44px/s);
console.log("Alle rusttimeraudio-, instelling- en versielayouttests zijn geslaagd.");
