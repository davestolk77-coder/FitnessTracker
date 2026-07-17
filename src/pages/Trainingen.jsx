import { useEffect, useRef, useState } from "react";
import { OEFENING_IDS, TRAINING_SCHEMA_IDS, VRIJE_TRAINING, migreerActieveSessieNaarVrijeTraining, trainingen } from "../data/trainingen";
import CardioForm from "../components/CardioForm";
import { StopTrainingModal } from "../components/StopTrainingModal";
import { AppHeader, AppScreen, Card, PrimaryButton, SecondaryButton, StatusBadge } from "../components/ui";
import { leesJson } from "../utils/storage";
import { berekenPersoonlijkeRecords, leesTrainingHistorie, maakNieuweTrainingId, voegTrainingToe, vindLaatsteCardioWaarden, vindLaatsteOefeningWaarden } from "../utils/trainingHistorie";
import { useToast } from "../utils/toastContext";
import { ACTIEVE_TRAINING_KEY, bewaarActieveTraining, verwijderActieveTraining } from "../sync/localCache";
import { useCloudSync } from "../sync/syncContext";
import { maakEenmaligeUitvoerder } from "../utils/eenmaligeUitvoerder";
import { maakTrainingResultaat } from "../utils/trainingSession";
import { bewaarRusttimerGeluidInstelling, leesRusttimerGeluidInstelling, maakRusttimerAlarmBewaker, ontgrendelRusttimerAudio, speelRusttimerSignaal } from "../utils/rusttimerAudio";

const SETS = [1, 2, 3];
const huidigTijdstip = () => Date.now();

function nieuweSessie(training = VRIJE_TRAINING) {
  const sessionId = maakNieuweTrainingId();
  return { trainingId: sessionId, sessionId, trainingSchemaId: TRAINING_SCHEMA_IDS[training], training, oefeningIds: Object.fromEntries(trainingen[training].map((naam) => [naam, OEFENING_IDS[naam]])), gegevens: {}, cardio: {}, statussen: {}, voltooideSets: [], timer: 0, startTijd: huidigTijdstip(), status: "Actief" };
}

function herstelSessie(initialTraining) {
  if (initialTraining && TRAINING_SCHEMA_IDS[initialTraining]) return nieuweSessie(VRIJE_TRAINING);
  const opgeslagen = migreerActieveSessieNaarVrijeTraining(leesJson(ACTIEVE_TRAINING_KEY, null));
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
  const { showToast } = useToast();
  const { voltooiTraining } = useCloudSync();
  const [sessie, setSessie] = useState(() => herstelSessie(initialTraining));
  const [geselecteerd, setGeselecteerd] = useState(null);
  const [bevestigOnvolledig, setBevestigOnvolledig] = useState(false);
  const [bevestigStoppen, setBevestigStoppen] = useState(false);
  const [bezigMetStoppen, setBezigMetStoppen] = useState(false);
  const [rusttimerGeluid, setRusttimerGeluid] = useState(leesRusttimerGeluidInstelling);
  const [actieveRusttimerSet, setActieveRusttimerSet] = useState(null);
  const bezigMetAfronden = useRef(false);
  const stopKnop = useRef(null);
  const voerStoppenEenmaligUit = useRef(maakEenmaligeUitvoerder());
  const rusttimerAlarm = useRef(maakRusttimerAlarmBewaker(speelRusttimerSignaal));
  const rusttimerGeluidRef = useRef(rusttimerGeluid);

  useEffect(() => { rusttimerGeluidRef.current = rusttimerGeluid; }, [rusttimerGeluid]);

  const historie = leesTrainingHistorie;

  useEffect(() => {
    if (sessie) bewaarActieveTraining(sessie);
  }, [sessie]);

  useEffect(() => {
    const flushBijAchtergrond = () => {
      if (document.visibilityState === "hidden" && sessie) bewaarActieveTraining(sessie, { urgent: true });
    };
    document.addEventListener("visibilitychange", flushBijAchtergrond);
    return () => document.removeEventListener("visibilitychange", flushBijAchtergrond);
  }, [sessie]);

  useEffect(() => {
    const interval = setInterval(() => setSessie((vorige) => {
      if (!vorige || vorige.timer <= 0) return vorige;
      if (vorige.timer === 1) {
        rusttimerAlarm.current.tik(vorige.timer, rusttimerGeluidRef.current);
        showToast("Rusttijd voorbij — je kunt weer verder", "info", { duration: 3500 });
      }
      return { ...vorige, timer: vorige.timer - 1 };
    }), 1000);
    return () => clearInterval(interval);
  }, [showToast]);

  const kiesTraining = (training) => {
    const volgende = nieuweSessie(training);
    bewaarActieveTraining(volgende, { urgent: true });
    setSessie(volgende);
    setGeselecteerd(null);
    setActieveRusttimerSet(null);
  };

  const stopTraining = async () => {
    try {
      const uitgevoerd = await voerStoppenEenmaligUit.current(async () => {
        setBezigMetStoppen(true);
        await Promise.resolve();
        verwijderActieveTraining({ sessie });
      });
      if (!uitgevoerd) return;
    } catch (error) {
      console.error("Training stoppen mislukt", error);
      setBezigMetStoppen(false);
      showToast("Training stoppen is niet gelukt. Je actieve training is behouden; probeer het opnieuw.", "error");
      return;
    }

    setBevestigStoppen(false);
    setBezigMetStoppen(false);
    setSessie(null);
    setGeselecteerd(null);
    setActieveRusttimerSet(null);
    onTrainingClosed();
  };

  const openOefening = (oefening) => {
    setSessie((vorige) => ({ ...vorige, statussen: { ...vorige.statussen, [oefening]: vorige.statussen[oefening] === "Voltooid" ? "Voltooid" : "Bezig" } }));
    setGeselecteerd(oefening);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const haalVorigeSetOp = (oefening, setNummer) => {
    return vindLaatsteOefeningWaarden(historie(), OEFENING_IDS[oefening])?.[setNummer] || null;
  };

  const herstelVorigeWaarden = (oefening) => {
    const vorigeWaarden = oefening === "Cardio"
      ? vindLaatsteCardioWaarden(historie())
      : vindLaatsteOefeningWaarden(historie(), OEFENING_IDS[oefening]);
    if (vorigeWaarden) {
      setSessie((vorige) => oefening === "Cardio"
        ? { ...vorige, cardio: { ...vorigeWaarden } }
        : { ...vorige, gegevens: { ...vorige.gegevens, [oefening]: vorigeWaarden } });
      showToast(`Vorige waarden voor ${oefening} hersteld`, "success");
      return;
    }
    showToast(`Geen eerdere waarden voor ${oefening} gevonden.`, "info");
  };

  const haalRecordOp = (oefening) => berekenPersoonlijkeRecords(historie())[oefening] || 0;
  const wijzigSet = (oefening, setNummer, veld, waarde) => setSessie((vorige) => ({ ...vorige, gegevens: { ...vorige.gegevens, [oefening]: { ...vorige.gegevens[oefening], [setNummer]: { ...vorige.gegevens[oefening]?.[setNummer], [veld]: waarde } } } }));
  const stapWaarde = (oefening, setNummer, veld, stap) => {
    const huidig = Number(sessie.gegevens[oefening]?.[setNummer]?.[veld] || 0);
    wijzigSet(oefening, setNummer, veld, String(Math.max(0, huidig + stap)));
  };
  const voltooiSet = (oefening, setNummer) => {
    const sleutel = `${oefening}-${setNummer}`;
    startRusttimer(oefening, setNummer);
    setSessie((vorige) => ({ ...vorige, voltooideSets: vorige.voltooideSets.includes(sleutel) ? vorige.voltooideSets : [...vorige.voltooideSets, sleutel] }));
  };
  const startRusttimer = (oefening, setNummer) => {
    if (rusttimerGeluidRef.current) void ontgrendelRusttimerAudio();
    rusttimerAlarm.current.start();
    setActieveRusttimerSet({ oefening, setNummer });
    setSessie((vorige) => ({ ...vorige, timer: 60 }));
  };
  const stopRusttimer = () => {
    rusttimerAlarm.current.annuleer();
    setSessie((vorige) => ({ ...vorige, timer: 0 }));
  };
  const wijzigRusttimerGeluid = (ingeschakeld) => {
    rusttimerGeluidRef.current = ingeschakeld;
    setRusttimerGeluid(bewaarRusttimerGeluidInstelling(ingeschakeld));
  };
  const slaOefeningOp = () => {
    const volgende = {
      ...sessie,
      cardio: geselecteerd === "Cardio" && !sessie.cardio.type ? { ...sessie.cardio, type: "Loopband" } : sessie.cardio,
      statussen: { ...sessie.statussen, [geselecteerd]: "Voltooid" },
    };
    setSessie(volgende);
    bewaarActieveTraining(volgende, { urgent: true });
    setGeselecteerd(null);
    showToast("Oefening opgeslagen", "success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const trainingDefinitiefOpslaan = async () => {
    if (bezigMetAfronden.current) return;
    bezigMetAfronden.current = true;
    const eindTijd = huidigTijdstip();
    const trainingData = maakTrainingResultaat(sessie, eindTijd);
    try {
      const opgeslagen = voegTrainingToe(trainingData, { meldSync: false });
      await voltooiTraining(opgeslagen.training, sessie);
    } catch (error) {
      console.error("Training opslaan mislukt", error);
      bezigMetAfronden.current = false;
      showToast("Training opslaan is niet gelukt. Je actieve training is behouden; probeer het opnieuw.", "error");
      return;
    }
    showToast("Training opgeslagen", "success");
    setSessie(null);
    setActieveRusttimerSet(null);
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

  if (!sessie) return <AppScreen><AppHeader eyebrow="Aan de slag" title={VRIJE_TRAINING} subtitle="Kies zelf welke oefeningen je vandaag uitvoert." /><PrimaryButton className="button--full button--large" onClick={() => kiesTraining(VRIJE_TRAINING)}>Vrije training starten</PrimaryButton></AppScreen>;

  const onderdelen = trainingen[sessie.training];
  const aantalVoltooid = onderdelen.filter((oefening) => sessie.statussen[oefening] === "Voltooid").length;

  if (!geselecteerd) return (
    <AppScreen className="active-workout">
      <SecondaryButton ref={stopKnop} className="back-button button--compact" icon="←" onClick={() => setBevestigStoppen(true)}>Stop training</SecondaryButton>
      <AppHeader eyebrow="Actieve training" title={sessie.training} subtitle={`${aantalVoltooid} van ${onderdelen.length} oefeningen voltooid`} />
      <div className="workout-progress" role="progressbar" aria-label="Voltooide oefeningen" aria-valuemin="0" aria-valuemax={onderdelen.length} aria-valuenow={aantalVoltooid}><span style={{ width: `${(aantalVoltooid / onderdelen.length) * 100}%` }} /></div>
      <div className="exercise-overview">{onderdelen.map((oefening) => {
        const status = sessie.statussen[oefening] || "Nog niet gestart";
        const eersteSet = sessie.gegevens[oefening]?.[1] || haalVorigeSetOp(oefening, 1);
        return <button type="button" key={oefening} className={`exercise-overview-card${status === "Voltooid" ? " is-complete" : ""}`} onClick={() => openOefening(oefening)}><span className="exercise-overview-card__copy"><strong>{oefening}</strong><small>{oefening === "Cardio" ? (sessie.cardio.type ? `${sessie.cardio.type}${sessie.cardio.tijd ? ` · ${sessie.cardio.tijd} min` : ""}` : "Cardioresultaat invoeren") : eersteSet ? `Set 1: ${eersteSet.gewicht || 0} kg × ${eersteSet.reps || 0}` : "Nog geen eerdere waarden"}</small></span><StatusBadge tone={status === "Bezig" ? "warning" : status === "Voltooid" ? "success" : "neutral"}>{status === "Voltooid" ? "✓ Voltooid" : status}</StatusBadge><span className="exercise-overview-card__arrow" aria-hidden="true">›</span></button>;
      })}</div>
      <PrimaryButton className="button--full button--large" icon="✓" disabled={aantalVoltooid === 0} onClick={trainingOpslaan}>Training afronden</PrimaryButton>
      {aantalVoltooid === 0 && <p className="finish-hint">Sla minimaal één oefening op om de training af te ronden.</p>}
      {bevestigStoppen && (
        <StopTrainingModal
          bezig={bezigMetStoppen}
          triggerRef={stopKnop}
          onDoorgaan={() => { if (!bezigMetStoppen) setBevestigStoppen(false); }}
          onStoppen={stopTraining}
        />
      )}
      {bevestigOnvolledig && (
        <div className="confirmation-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setBevestigOnvolledig(false);
        }}>
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
      <SecondaryButton className="back-button button--compact" icon="←" onClick={() => { bewaarActieveTraining(sessie, { urgent: true }); setGeselecteerd(null); }}>Terug naar overzicht</SecondaryButton>
      <AppHeader eyebrow="Oefening" title={geselecteerd} subtitle={sessie.training} />
      {isCardio ? <><div className="exercise-header"><span /><SecondaryButton className="button--compact" icon="↶" onClick={() => herstelVorigeWaarden(geselecteerd)}>Herstel vorige waarde</SecondaryButton></div><CardioForm value={sessie.cardio} onCardioChange={(cardio) => setSessie((vorige) => ({ ...vorige, cardio }))} /></> : (
        <Card className="exercise-card">
          <div className="exercise-header"><div><h2>{geselecteerd}</h2><div style={{ marginTop: 8 }}><StatusBadge tone="warning">Record: {haalRecordOp(geselecteerd)} kg</StatusBadge></div></div><SecondaryButton className="button--compact" icon="↶" onClick={() => herstelVorigeWaarden(geselecteerd)}>Herstel vorige waarde</SecondaryButton></div>
          <label className="timer-sound-setting"><input type="checkbox" checked={rusttimerGeluid} onChange={(event) => wijzigRusttimerGeluid(event.target.checked)} /><span>Geluid bij afloop</span></label>
          <div className="sets">{SETS.map((setNummer) => {
            const vorigeSet = haalVorigeSetOp(geselecteerd, setNummer);
            const sleutel = `${geselecteerd}-${setNummer}`;
            const voltooid = sessie.voltooideSets.includes(sleutel);
            const timerHoortBijSet = actieveRusttimerSet?.oefening === geselecteerd && actieveRusttimerSet?.setNummer === setNummer;
            const timerLoopt = timerHoortBijSet && sessie.timer > 0;
            return <div key={setNummer}>{vorigeSet && <p className="previous-set">Vorige keer: {vorigeSet.gewicht || 0} kg × {vorigeSet.reps || 0}</p>}<div className={`set-card${voltooid ? " is-complete" : ""}`}><div className="set-card__header"><strong>Set {setNummer}</strong><div className="set-card__status">{voltooid && <StatusBadge>Voltooid</StatusBadge>}<button type="button" className={`set-timer-button${timerLoopt ? " is-active" : ""}`} aria-label={timerLoopt ? `Stop rusttimer van set ${setNummer}` : `Start rusttimer van set ${setNummer}`} onClick={() => timerLoopt ? stopRusttimer() : startRusttimer(geselecteerd, setNummer)}>{timerLoopt ? `${sessie.timer}s · Stop` : timerHoortBijSet ? "Opnieuw 60s" : "Rust 60s"}</button></div></div><div className="set-fields"><div className="field"><label htmlFor={`${geselecteerd}-${setNummer}-kg`}>Gewicht (kg)</label><div className="stepper"><button type="button" aria-label={`Verlaag gewicht van set ${setNummer}`} onClick={() => stapWaarde(geselecteerd, setNummer, "gewicht", -1)}>−</button><input id={`${geselecteerd}-${setNummer}-kg`} type="number" inputMode="decimal" value={sessie.gegevens[geselecteerd]?.[setNummer]?.gewicht || ""} onChange={(e) => wijzigSet(geselecteerd, setNummer, "gewicht", e.target.value)} placeholder="0" /><button type="button" aria-label={`Verhoog gewicht van set ${setNummer}`} onClick={() => stapWaarde(geselecteerd, setNummer, "gewicht", 1)}>+</button></div></div><div className="field"><label htmlFor={`${geselecteerd}-${setNummer}-reps`}>Herhalingen</label><div className="stepper"><button type="button" aria-label={`Verlaag herhalingen van set ${setNummer}`} onClick={() => stapWaarde(geselecteerd, setNummer, "reps", -1)}>−</button><input id={`${geselecteerd}-${setNummer}-reps`} type="number" inputMode="numeric" value={sessie.gegevens[geselecteerd]?.[setNummer]?.reps || ""} onChange={(e) => wijzigSet(geselecteerd, setNummer, "reps", e.target.value)} placeholder="0" /><button type="button" aria-label={`Verhoog herhalingen van set ${setNummer}`} onClick={() => stapWaarde(geselecteerd, setNummer, "reps", 1)}>+</button></div></div></div><SecondaryButton className="button--full complete-set-button" disabled={voltooid} onClick={() => voltooiSet(geselecteerd, setNummer)}>{voltooid ? "Set voltooid" : "Voltooi set en start rust"}</SecondaryButton></div></div>;
          })}</div>
        </Card>
      )}
      <PrimaryButton className="button--full button--large" icon="✓" onClick={slaOefeningOp}>Oefening opslaan</PrimaryButton>
    </AppScreen>
  );
}
export default Trainingen;
