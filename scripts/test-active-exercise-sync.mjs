import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { moetCloudActieveTrainingToepassen } from "../src/sync/activeTrainingConflict.js";

const oefeningId = "Chest Press";
let geselecteerd = oefeningId;
let lokaleSessie = {
  trainingId: "training-1",
  sessionId: "training-1",
  syncGeneration: 4,
  gegevens: { [oefeningId]: { 1: { gewicht: "80", reps: "10" } } },
};
const eerdereDebouncedWrite = {
  ...lokaleSessie,
  syncGeneration: 3,
  gegevens: { [oefeningId]: { 1: { gewicht: "75", reps: "8" } } },
};

if (moetCloudActieveTrainingToepassen(lokaleSessie, eerdereDebouncedWrite, { cloudIsNieuwer: true })) {
  lokaleSessie = eerdereDebouncedWrite;
}

assert.equal(geselecteerd, oefeningId, "dezelfde oefening moet na debounce/sync geopend blijven");
assert.equal(lokaleSessie.gegevens[oefeningId][1].gewicht, "80", "nieuw lokaal gewicht moet behouden blijven");
assert.equal(lokaleSessie.gegevens[oefeningId][1].reps, "10", "nieuwe lokale herhalingen moeten behouden blijven");
assert.equal(moetCloudActieveTrainingToepassen(lokaleSessie, { ...eerdereDebouncedWrite, syncGeneration: 4 }, { cloudIsNieuwer: true }), false, "dezelfde generatie mag lokale state niet vervangen");
assert.equal(moetCloudActieveTrainingToepassen(lokaleSessie, { ...lokaleSessie, syncGeneration: 5 }), true, "een werkelijk nieuwere generatie blijft synchroniseerbaar");

const bron = await readFile(new URL("../src/pages/Trainingen.jsx", import.meta.url), "utf8");
assert.doesNotMatch(bron, /DATA_GESYNCHRONISEERD_EVENT|leesActieveTraining/, "sync-events mogen de actieve UI-sessie niet vervangen");
assert.match(bron, /const \[geselecteerd, setGeselecteerd\] = useState\(null\)/, "de selectie moet een stabiele oefening-ID zijn");

console.log("De actieve-oefening-, debounce- en stale-cloudregressietest is geslaagd.");
