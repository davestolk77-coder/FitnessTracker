import { useState } from "react";
import { AppHeader, AppScreen, Card, PrimaryButton, SectionCard, StatusBadge } from "../components/ui";
import { volgendeTraining } from "../data/trainingen";
import { leesJson } from "../utils/storage";
import { leesTrainingHistorie } from "../utils/trainingHistorie";

const DOELGEWICHT = 80;

function begroetingVoorUur(uur) {
  if (uur < 12) return "Goedemorgen";
  if (uur < 18) return "Goedemiddag";
  return "Goedenavond";
}

function formatDuur(seconden) {
  if (!Number.isFinite(seconden) || seconden <= 0) return null;
  const minuten = Math.max(1, Math.round(seconden / 60));
  return `${minuten} min`;
}

function leesLaatsteGewicht() {
  const huidig = Number(localStorage.getItem("huidigGewicht"));
  if (Number.isFinite(huidig) && huidig > 0) return huidig;
  const metingen = leesJson("gewichtHistorie", []);
  const laatste = Array.isArray(metingen) ? Number(metingen.at(-1)?.gewicht) : NaN;
  return Number.isFinite(laatste) && laatste > 0 ? laatste : null;
}

function Dashboard({ onStartTraining }) {
  const [gewicht, setGewicht] = useState(() => localStorage.getItem("huidigGewicht") || "");
  const [laatsteGewicht, setLaatsteGewicht] = useState(leesLaatsteGewicht);
  const [historie] = useState(leesTrainingHistorie);
  const geldigeHistorie = historie;
  const laatsteTraining = geldigeHistorie.at(-1) || null;
  const voorstel = volgendeTraining(laatsteTraining?.training);
  const dezeMaand = geldigeHistorie.filter((item) => {
    const datum = new Date(item?.datum);
    const nu = new Date();
    return !Number.isNaN(datum.getTime()) && datum.getMonth() === nu.getMonth() && datum.getFullYear() === nu.getFullYear();
  }).length;
  const resterend = laatsteGewicht === null ? null : Math.max(0, laatsteGewicht - DOELGEWICHT);
  const doelBehaald = laatsteGewicht !== null && laatsteGewicht <= DOELGEWICHT;
  const doelVoortgang = laatsteGewicht === null ? 0 : doelBehaald ? 100 : Math.max(0, Math.min(99, (DOELGEWICHT / laatsteGewicht) * 100));
  const voltooideSets = laatsteTraining?.voltooideSets ?? Object.values(laatsteTraining?.oefeningen || {}).reduce((totaal, sets) => totaal + Object.keys(sets || {}).length, 0);
  const voltooideOefeningen = laatsteTraining?.voltooideOefeningen ?? Object.keys(laatsteTraining?.oefeningen || {}).length;

  const opslaanGewicht = () => {
    const waarde = Number(gewicht);
    if (!Number.isFinite(waarde) || waarde <= 0) return;
    localStorage.setItem("huidigGewicht", gewicht);
    const opgeslagen = leesJson("gewichtHistorie", []);
    const gewichtHistorie = Array.isArray(opgeslagen) ? opgeslagen : [];
    gewichtHistorie.push({ datum: new Date().toISOString(), gewicht: waarde });
    localStorage.setItem("gewichtHistorie", JSON.stringify(gewichtHistorie));
    setLaatsteGewicht(waarde);
    alert("Gewicht opgeslagen!");
  };

  return (
    <AppScreen>
      <AppHeader eyebrow="FitnessTracker" title={`${begroetingVoorUur(new Date().getHours())} Dave`} subtitle="Vandaag is weer een kans om sterker te worden." />

      <Card className="goal-card">
        <div className="goal-card__top"><div><span className="metric-label">Doelgewicht</span><strong className="goal-weight">{laatsteGewicht !== null ? `${laatsteGewicht.toFixed(1)} kg` : "Nog geen meting"}</strong></div><StatusBadge>{DOELGEWICHT} kg doel</StatusBadge></div>
        <div className="progress-track" role="progressbar" aria-label="Voortgang naar doelgewicht" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(doelVoortgang)}><span style={{ width: `${doelVoortgang}%` }} /></div>
        <p className={doelBehaald ? "goal-message goal-message--success" : "goal-message"}>{laatsteGewicht === null ? "Sla je gewicht op om je voortgang te volgen." : doelBehaald ? "Geweldig, je doelgewicht is bereikt!" : `Nog ${resterend.toFixed(1)} kg tot je doel`}</p>
      </Card>

      <SectionCard title="Volgende training" description="Op basis van je laatst afgeronde training.">
        <strong className="next-training-name">{voorstel}</strong>
        <PrimaryButton className="button--full button--large" icon="▶" onClick={() => onStartTraining(voorstel)}>Start deze training</PrimaryButton>
      </SectionCard>

      <SectionCard title="Gewicht bijwerken" description="Voeg een nieuwe meting toe aan je voortgang.">
        <div className="form-row"><div className="field" style={{ flex: 1 }}><label htmlFor="current-weight">Gewicht in kg</label><input id="current-weight" type="number" step="0.1" inputMode="decimal" value={gewicht} onChange={(e) => setGewicht(e.target.value)} placeholder="Bijv. 82,5" /></div><PrimaryButton icon="✓" onClick={opslaanGewicht} disabled={!Number(gewicht) || Number(gewicht) <= 0}>Opslaan</PrimaryButton></div>
      </SectionCard>

      <div className="card-grid dashboard-stats">
        <Card className="metric-card"><span className="metric-label">Deze maand</span><strong className="metric-value metric-value--accent">{dezeMaand} {dezeMaand === 1 ? "training" : "trainingen"}</strong></Card>
        <Card className="metric-card"><span className="metric-label">Totaal</span><strong className="metric-value">{geldigeHistorie.length} {geldigeHistorie.length === 1 ? "training" : "trainingen"}</strong></Card>
        <Card className="metric-card"><span className="metric-label">Huidig gewicht</span><strong className="metric-value">{laatsteGewicht !== null ? `${laatsteGewicht.toFixed(1)} kg` : "—"}</strong></Card>
      </div>

      <SectionCard title="Laatste training" description={laatsteTraining ? new Date(laatsteTraining.datum).toLocaleString("nl-NL") : "Nog geen training afgerond."}>
        {laatsteTraining ? <div className="last-training"><strong>{laatsteTraining.training || "Training"}</strong><div className="last-training__details">{formatDuur(laatsteTraining.duur) && <span>{formatDuur(laatsteTraining.duur)}</span>}<span>{voltooideOefeningen} {voltooideOefeningen === 1 ? "oefening" : "oefeningen"}</span><span>{voltooideSets} sets</span></div></div> : <p className="muted-text">Start Training A om je eerste resultaat vast te leggen.</p>}
      </SectionCard>
    </AppScreen>
  );
}
export default Dashboard;
