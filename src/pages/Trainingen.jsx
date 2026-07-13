import { useEffect, useRef, useState } from "react";
import { trainingen } from "../data/trainingen";
import CardioForm from "../components/CardioForm";
import { AppHeader, AppScreen, Card, PrimaryButton, SecondaryButton, StatusBadge } from "../components/ui";
import { leesJson } from "../utils/storage";
import { leesTrainingHistorie, slaTrainingHistorieOp, vindLaatsteOefeningWaarden } from "../utils/trainingHistorie";

const SETS = [1, 2, 3];
const ACTIEVE_TRAINING_KEY = "actieveTraining";
const huidigTijdstip = () => Date.now();

function nieuweSessie(training) {
  return { training, gegevens: {}, cardio: {}, statussen: {}, voltooideSets: [], timer: 0, startTijd: huidigTijdstip() };
}

function herstelSessie(initialTraining) {
  if (initialTraining && trainingen[initialTraining]) return nieuweSessie(initialTraining);
  const opgeslagen = leesJson(ACTIEVE_TRAINING_KEY, null);
  if (!opgeslagen || !trainingen[opgeslagen.training]) return null;
  return {
    ...nieuweSessie(opgeslagen.training),
    ...opgeslagen,
    gegevens: opgeslagen.gegevens && typeof opgeslagen.gegevens === "object" ? opgeslagen.gegevens : {},
    cardio: opgeslagen.cardio && typeof opgeslagen.cardio === "object" ? opgeslagen.cardio : {},
    statussen: opgeslagen.statussen && typeof opgeslagen.statussen === "object" ? opgeslagen.statussen : {},
    voltooideSets: Array.isArray(opgeslagen.voltooideSets) ? opgeslagen.voltooideSets : [],
  };
}

function Trainingen({ initialTraining, onTrainingClosed }) {
  const [sessie, setSessie] = useState(() => herstelSessie(initialTraining));
  const [geselecteerd, setGeselecteerd] = useState(null);
  const [melding, setMelding] = useState(false);
  const [bevestigOnvolledig, setBevestigOnvolledig] = useState(false);
  const bezigMetAfronden = useRef(false);

  const historie = leesTrainingHistorie;

  useEffect(() => {
    if (sessie) localStorage.setItem(ACTIEVE_TRAINING_KEY, JSON.stringify(sessie));
  }, [sessie]);

  useEffect(() => {
    const interval = setInterval(() => setSessie((vorige) => {
      if (!vorige || vorige.timer <= 0) return vorige;
      if (vorige.timer === 1) {
        const audio = new Audio("/ping.mp3");
        audio.volume = 1;
        audio.play().catch(() => {});
        setMelding(true);
        setTimeout(() => setMelding(false), 5000);
      }
      return { ...vorige, timer: vorige.timer - 1 };
    }), 1000);
    return () => clearInterval(interval);
  }, []);

  const kiesTraining = (training) => {
    const volgende = nieuweSessie(training);
    localStorage.setItem(ACTIEVE_TRAINING_KEY, JSON.stringify(volgende));
    setSessie(volgende);
    setGeselecteerd(null);
  };

  const stopTraining = () => {
    if (!confirm("Training stoppen? De actieve trainingsgegevens worden verwijderd.")) return;
    localStorage.removeItem(ACTIEVE_TRAINING_KEY);
    setSessie(null);
    setGeselecteerd(null);
    onTrainingClosed();
  };

  const openOefening = (oefening) => {
    setSessie((vorige) => ({ ...vorige, statussen: { ...vorige.statussen, [oefening]: vorige.statussen[oefening] === "Voltooid" ? "Voltooid" : "Bezig" } }));
    setGeselecteerd(oefening);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const haalVorigeSetOp = (oefening, setNummer) => {
    const items = historie();
    for (let i = items.length - 1; i >= 0; i--) {
      const vorige = items[i]?.oefeningen?.[oefening]?.[setNummer];
      if (vorige) return vorige;
    }
    return null;
  };

  const gebruikVorigeTraining = (oefening) => {
    const vorigeWaarden = vindLaatsteOefeningWaarden(historie(), oefening);
    if (vorigeWaarden) {
      setSessie((vorige) => ({ ...vorige, gegevens: { ...vorige.gegevens, [oefening]: vorigeWaarden } }));
      return;
    }
    alert("Geen eerdere training gevonden.");
  };

  const haalRecordOp = (oefening) => historie().reduce((record, item) => Math.max(record, ...Object.values(item?.oefeningen?.[oefening] || {}).map((setData) => Number(setData?.gewicht || 0))), 0);
  const wijzigSet = (oefening, setNummer, veld, waarde) => setSessie((vorige) => ({ ...vorige, gegevens: { ...vorige.gegevens, [oefening]: { ...vorige.gegevens[oefening], [setNummer]: { ...vorige.gegevens[oefening]?.[setNummer], [veld]: waarde } } } }));
  const stapWaarde = (oefening, setNummer, veld, stap) => {
    const huidig = Number(sessie.gegevens[oefening]?.[setNummer]?.[veld] || 0);
    wijzigSet(oefening, setNummer, veld, String(Math.max(0, huidig + stap)));
  };
  const voltooiSet = (oefening, setNummer) => {
    const sleutel = `${oefening}-${setNummer}`;
    setSessie((vorige) => ({ ...vorige, voltooideSets: vorige.voltooideSets.includes(sleutel) ? vorige.voltooideSets : [...vorige.voltooideSets, sleutel], timer: 60 }));
  };
  const slaOefeningOp = () => {
    setSessie((vorige) => ({
      ...vorige,
      cardio: geselecteerd === "Cardio" && !vorige.cardio.type ? { ...vorige.cardio, type: "Loopband" } : vorige.cardio,
      statussen: { ...vorige.statussen, [geselecteerd]: "Voltooid" },
    }));
    setGeselecteerd(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const trainingDefinitiefOpslaan = () => {
    if (bezigMetAfronden.current) return;
    bezigMetAfronden.current = true;
    const onderdelen = trainingen[sessie.training];
    const voltooideOnderdelen = onderdelen.filter((oefening) => sessie.statussen[oefening] === "Voltooid");
    const voltooideKrachtoefeningen = voltooideOnderdelen.filter((oefening) => oefening !== "Cardio");
    const opgeslagenOefeningen = Object.fromEntries(
      voltooideKrachtoefeningen.map((oefening) => [oefening, sessie.gegevens[oefening] || {}]),
    );
    const voltooideSets = voltooideKrachtoefeningen.reduce(
      (totaal, oefening) => totaal + SETS.filter((setNummer) => sessie.voltooideSets.includes(`${oefening}-${setNummer}`)).length,
      0,
    );
    const duur = Math.max(1, Math.round((huidigTijdstip() - sessie.startTijd) / 1000));
    const trainingData = {
      datum: new Date().toISOString(),
      training: sessie.training,
      startTijd: sessie.startTijd,
      oefeningen: opgeslagenOefeningen,
      cardio: voltooideOnderdelen.includes("Cardio") ? sessie.cardio : {},
      duur,
      voltooideSets,
      voltooidAantal: voltooideOnderdelen.length,
      voltooideOefeningen: voltooideOnderdelen.length,
      totaalOefeningen: onderdelen.length,
      isVolledig: voltooideOnderdelen.length === onderdelen.length,
      status: voltooideOnderdelen.length === onderdelen.length ? "Voltooid" : "Gedeeltelijk",
    };
    const bestaandeTrainingen = historie();
    bestaandeTrainingen.push(trainingData);
    try {
      slaTrainingHistorieOp(bestaandeTrainingen);
    } catch (error) {
      console.error("Training opslaan mislukt", error);
      bezigMetAfronden.current = false;
      alert("Training opslaan is niet gelukt. Je actieve training is behouden; probeer het opnieuw.");
      return;
    }
    localStorage.removeItem(ACTIEVE_TRAINING_KEY);
    alert("Training opgeslagen!");
    setSessie(null);
    onTrainingClosed();
  };

  const trainingOpslaan = () => {
    const onderdelen = trainingen[sessie.training];
    const aantalVoltooid = onderdelen.filter((oefening) => sessie.statussen[oefening] === "Voltooid").length;
    if (aantalVoltooid === 0) return;
    if (aantalVoltooid === onderdelen.length) {
      trainingDefinitiefOpslaan();
      return;
    }
    setBevestigOnvolledig(true);
  };

  if (!sessie) return <AppScreen><AppHeader eyebrow="Aan de slag" title="Kies je training" subtitle="Twee complete trainingen, ieder met zes onderdelen." />{Object.keys(trainingen).map((naam) => <SecondaryButton key={naam} className="training-choice" icon="◆" onClick={() => kiesTraining(naam)}>{naam}<span aria-hidden="true">›</span></SecondaryButton>)}</AppScreen>;

  const onderdelen = trainingen[sessie.training];
  const aantalVoltooid = onderdelen.filter((oefening) => sessie.statussen[oefening] === "Voltooid").length;

  if (!geselecteerd) return (
    <AppScreen className="active-workout">
      <SecondaryButton className="back-button button--compact" icon="←" onClick={stopTraining}>Stop training</SecondaryButton>
      <AppHeader eyebrow="Actieve training" title={sessie.training} subtitle={`${aantalVoltooid} van ${onderdelen.length} oefeningen voltooid`} />
      <div className="workout-progress" role="progressbar" aria-label="Voltooide oefeningen" aria-valuemin="0" aria-valuemax={onderdelen.length} aria-valuenow={aantalVoltooid}><span style={{ width: `${(aantalVoltooid / onderdelen.length) * 100}%` }} /></div>
      <div className="exercise-overview">{onderdelen.map((oefening) => {
        const status = sessie.statussen[oefening] || "Nog niet gestart";
        const eersteSet = sessie.gegevens[oefening]?.[1] || haalVorigeSetOp(oefening, 1);
        return <button type="button" key={oefening} className={`exercise-overview-card${status === "Voltooid" ? " is-complete" : ""}`} onClick={() => openOefening(oefening)}><span className="exercise-overview-card__copy"><strong>{oefening}</strong><small>{oefening === "Cardio" ? (sessie.cardio.type ? `${sessie.cardio.type}${sessie.cardio.tijd ? ` · ${sessie.cardio.tijd} min` : ""}` : "Cardioresultaat invoeren") : eersteSet ? `Set 1: ${eersteSet.gewicht || 0} kg × ${eersteSet.reps || 0}` : "Nog geen eerdere waarden"}</small></span><StatusBadge tone={status === "Bezig" ? "warning" : status === "Voltooid" ? "success" : "neutral"}>{status === "Voltooid" ? "✓ Voltooid" : status}</StatusBadge><span className="exercise-overview-card__arrow" aria-hidden="true">›</span></button>;
      })}</div>
      <PrimaryButton className="button--full button--large" icon="✓" disabled={aantalVoltooid === 0} onClick={trainingOpslaan}>Training afronden</PrimaryButton>
      {aantalVoltooid === 0 && <p className="finish-hint">Sla minimaal één oefening op om de training af te ronden.</p>}
      {bevestigOnvolledig && (
        <div className="confirmation-backdrop" role="presentation" onMouseDown={() => setBevestigOnvolledig(false)}>
          <Card className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="onvolledig-titel" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="onvolledig-titel">Training onvolledig afronden?</h2>
            <p>Je hebt {aantalVoltooid} van de {onderdelen.length} oefeningen voltooid. De voltooide oefeningen worden opgeslagen. De overige oefeningen worden overgeslagen.</p>
            <div className="confirmation-dialog__actions">
              <SecondaryButton onClick={() => setBevestigOnvolledig(false)}>Annuleren</SecondaryButton>
              <PrimaryButton onClick={trainingDefinitiefOpslaan}>Toch afronden</PrimaryButton>
            </div>
          </Card>
        </div>
      )}
    </AppScreen>
  );

  const isCardio = geselecteerd === "Cardio";
  return (
    <AppScreen className="active-workout">
      <SecondaryButton className="back-button button--compact" icon="←" onClick={() => setGeselecteerd(null)}>Terug naar overzicht</SecondaryButton>
      <AppHeader eyebrow="Oefening" title={geselecteerd} subtitle={sessie.training} />
      {melding && <Card className="status-message" role="status">Rusttijd voorbij — je kunt weer verder.</Card>}
      {isCardio ? <CardioForm value={sessie.cardio} onCardioChange={(cardio) => setSessie((vorige) => ({ ...vorige, cardio }))} /> : (
        <Card className="exercise-card">
          <div className="exercise-header"><div><h2>{geselecteerd}</h2><div style={{ marginTop: 8 }}><StatusBadge tone="warning">Record: {haalRecordOp(geselecteerd)} kg</StatusBadge></div></div><SecondaryButton className="button--compact" icon="↶" onClick={() => gebruikVorigeTraining(geselecteerd)}>Vorige waarden</SecondaryButton></div>
          <div className="timer-row"><span className="field-label">Rusttimer</span><StatusBadge tone={sessie.timer > 0 ? "warning" : "success"}>{sessie.timer > 0 ? `${sessie.timer}s resterend` : "Klaar"}</StatusBadge></div>
          <div className="sets">{SETS.map((setNummer) => {
            const vorigeSet = haalVorigeSetOp(geselecteerd, setNummer);
            const sleutel = `${geselecteerd}-${setNummer}`;
            const voltooid = sessie.voltooideSets.includes(sleutel);
            return <div key={setNummer}>{vorigeSet && <p className="previous-set">Vorige keer: {vorigeSet.gewicht || 0} kg × {vorigeSet.reps || 0}</p>}<div className={`set-card${voltooid ? " is-complete" : ""}`}><div className="set-card__header"><strong>Set {setNummer}</strong>{voltooid && <StatusBadge>Voltooid</StatusBadge>}</div><div className="set-fields"><div className="field"><label htmlFor={`${geselecteerd}-${setNummer}-kg`}>Gewicht (kg)</label><div className="stepper"><button type="button" aria-label={`Verlaag gewicht van set ${setNummer}`} onClick={() => stapWaarde(geselecteerd, setNummer, "gewicht", -1)}>−</button><input id={`${geselecteerd}-${setNummer}-kg`} type="number" inputMode="decimal" value={sessie.gegevens[geselecteerd]?.[setNummer]?.gewicht || ""} onChange={(e) => wijzigSet(geselecteerd, setNummer, "gewicht", e.target.value)} placeholder="0" /><button type="button" aria-label={`Verhoog gewicht van set ${setNummer}`} onClick={() => stapWaarde(geselecteerd, setNummer, "gewicht", 1)}>+</button></div></div><div className="field"><label htmlFor={`${geselecteerd}-${setNummer}-reps`}>Herhalingen</label><div className="stepper"><button type="button" aria-label={`Verlaag herhalingen van set ${setNummer}`} onClick={() => stapWaarde(geselecteerd, setNummer, "reps", -1)}>−</button><input id={`${geselecteerd}-${setNummer}-reps`} type="number" inputMode="numeric" value={sessie.gegevens[geselecteerd]?.[setNummer]?.reps || ""} onChange={(e) => wijzigSet(geselecteerd, setNummer, "reps", e.target.value)} placeholder="0" /><button type="button" aria-label={`Verhoog herhalingen van set ${setNummer}`} onClick={() => stapWaarde(geselecteerd, setNummer, "reps", 1)}>+</button></div></div></div><SecondaryButton className="button--full complete-set-button" disabled={voltooid} onClick={() => voltooiSet(geselecteerd, setNummer)}>{voltooid ? "Set voltooid" : "Voltooi set en start rust"}</SecondaryButton></div></div>;
          })}</div>
        </Card>
      )}
      <PrimaryButton className="button--full button--large" icon="✓" onClick={slaOefeningOp}>Oefening opslaan</PrimaryButton>
    </AppScreen>
  );
}
export default Trainingen;
