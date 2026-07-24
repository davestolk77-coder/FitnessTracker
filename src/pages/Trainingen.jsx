import { useEffect, useRef, useState } from "react";
import { OEFENING_IDS, TRAINING_SCHEMA_IDS, VRIJE_TRAINING, migreerActieveSessieNaarVrijeTraining, trainingen } from "../data/trainingen";
import CardioForm from "../components/CardioForm";
import { StopTrainingModal } from "../components/StopTrainingModal";
import { AppHeader, AppScreen, Card, DangerButton, PrimaryButton, SecondaryButton, StatusBadge } from "../components/ui";
import { leesJson } from "../utils/storage";
import { berekenPersoonlijkeRecords, leesTrainingHistorie, maakNieuweTrainingId, voegTrainingToe, vindLaatsteCardioWaarden, vindLaatsteOefeningWaarden } from "../utils/trainingHistorie";
import { useToast } from "../utils/toastContext";
import { ACTIEVE_TRAINING_KEY, bewaarActieveTraining, leesInstellingen, schrijfInstellingen, verwijderActieveTraining } from "../sync/localCache";
import { useCloudSync } from "../sync/syncContext";
import { maakEenmaligeUitvoerder } from "../utils/eenmaligeUitvoerder";
import { maakTrainingResultaat } from "../utils/trainingSession";
import { bewaarRusttimerGeluidInstelling, leesRusttimerGeluidInstelling, maakRusttimerAlarmBewaker, ontgrendelRusttimerAudio, speelRusttimerSignaal } from "../utils/rusttimerAudio";
import { bewaarRusttimerNotificatieInstelling, leesRusttimerNotificatieInstelling, maakRusttimerNotificatieBewaker, vraagRusttimerNotificatieToestemming } from "../utils/rusttimerNotificatie";
import { TRAINING_WEIGHT_OPTIONS, TRAINING_WEIGHT_UNIT_VERSION } from "../utils/trainingWeightMigration";
import { herstelAangepasteOefeningenUitData, leesAangepasteOefeningen, leesSchemaOefeningen, verwijderAangepasteOefening, verwijderGetombstonedeOefeningenUitSessie, verwijderOefeningUitSessie, voegAangepasteOefeningToe } from "../utils/customExercises";

const SETS = [1, 2, 3];
const huidigTijdstip = () => Date.now();

function nieuweSessie(training = VRIJE_TRAINING) {
  const sessionId = maakNieuweTrainingId();
  const trainingSchemaId = TRAINING_SCHEMA_IDS[training];
  const definities = leesSchemaOefeningen(trainingSchemaId, trainingen[training]);
  const oefeningen = definities.map(({ naam }) => naam);
  return { trainingId: sessionId, sessionId, trainingSchemaId, training, oefeningen, oefeningDefinities: definities.filter(({ id }) => id), oefeningIds: Object.fromEntries(definities.map(({ naam, id }) => [naam, id || OEFENING_IDS[naam]])), gegevens: {}, cardio: {}, statussen: {}, voltooideSets: [], timer: 0, startTijd: huidigTijdstip(), status: "Actief", weightUnit: "lb", weightUnitVersion: TRAINING_WEIGHT_UNIT_VERSION };
}

function herstelSessie(initialTraining) {
  if (initialTraining && TRAINING_SCHEMA_IDS[initialTraining]) return nieuweSessie(VRIJE_TRAINING);
  const opgeslagen = migreerActieveSessieNaarVrijeTraining(leesJson(ACTIEVE_TRAINING_KEY, null));
  if (!opgeslagen || !trainingen[opgeslagen.training]) return null;
  herstelAangepasteOefeningenUitData(opgeslagen);
  return verwijderGetombstonedeOefeningenUitSessie({
    ...nieuweSessie(opgeslagen.training),
    ...opgeslagen,
    gegevens: opgeslagen.gegevens && typeof opgeslagen.gegevens === "object" ? opgeslagen.gegevens : {},
    cardio: opgeslagen.cardio && typeof opgeslagen.cardio === "object" ? opgeslagen.cardio : {},
    statussen: opgeslagen.statussen && typeof opgeslagen.statussen === "object" ? opgeslagen.statussen : {},
    voltooideSets: Array.isArray(opgeslagen.voltooideSets) ? opgeslagen.voltooideSets : [],
  });
}

function Trainingen({ initialTraining, onTrainingClosed }) {
  const { showToast } = useToast();
  const { voltooiTraining } = useCloudSync();
  const [sessie, setSessie] = useState(() => herstelSessie(initialTraining));
  const [geselecteerd, setGeselecteerd] = useState(null);
  const [bevestigOnvolledig, setBevestigOnvolledig] = useState(false);
  const [bevestigStoppen, setBevestigStoppen] = useState(false);
  const [bezigMetStoppen, setBezigMetStoppen] = useState(false);
  const [toonNieuweOefening, setToonNieuweOefening] = useState(false);
  const [nieuweOefeningNaam, setNieuweOefeningNaam] = useState("");
  const [nieuweOefeningFout, setNieuweOefeningFout] = useState("");
  const [teVerwijderenOefening, setTeVerwijderenOefening] = useState(null);
  const [rusttimerGeluid, setRusttimerGeluid] = useState(leesRusttimerGeluidInstelling);
  const [rusttimerNotificatie, setRusttimerNotificatie] = useState(() => leesRusttimerNotificatieInstelling() && globalThis.Notification?.permission === "granted");
  const [actieveRusttimerSet, setActieveRusttimerSet] = useState(null);
  const bezigMetAfronden = useRef(false);
  const stopKnop = useRef(null);
  const voerStoppenEenmaligUit = useRef(maakEenmaligeUitvoerder());
  const rusttimerAlarm = useRef(maakRusttimerAlarmBewaker(speelRusttimerSignaal));
  const rusttimerNotificatieBewaker = useRef(maakRusttimerNotificatieBewaker());
  const rusttimerGeluidRef = useRef(rusttimerGeluid);
  const rusttimerNotificatieRef = useRef(rusttimerNotificatie);

  useEffect(() => { rusttimerGeluidRef.current = rusttimerGeluid; }, [rusttimerGeluid]);
  useEffect(() => { rusttimerNotificatieRef.current = rusttimerNotificatie; }, [rusttimerNotificatie]);
  useEffect(() => () => rusttimerNotificatieBewaker.current.annuleer(), []);

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
        rusttimerNotificatieBewaker.current.meld(rusttimerNotificatieRef.current);
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
    rusttimerNotificatieBewaker.current.annuleer();
  };

  const stopTraining = async () => {
    rusttimerNotificatieBewaker.current.annuleer();
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
    rusttimerNotificatieBewaker.current.annuleer();
    onTrainingClosed();
  };

  const openOefening = (oefening) => {
    rusttimerNotificatieBewaker.current.annuleer();
    setSessie((vorige) => ({ ...vorige, statussen: { ...vorige.statussen, [oefening]: vorige.statussen[oefening] === "Voltooid" ? "Voltooid" : "Bezig" } }));
    setGeselecteerd(oefening);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const haalVorigeSetOp = (oefening, setNummer) => {
    return vindLaatsteOefeningWaarden(historie(), sessie.oefeningIds?.[oefening] || OEFENING_IDS[oefening])?.[setNummer] || null;
  };

  const herstelVorigeWaarden = (oefening) => {
    const vorigeWaarden = oefening === "Cardio"
      ? vindLaatsteCardioWaarden(historie())
      : vindLaatsteOefeningWaarden(historie(), sessie.oefeningIds?.[oefening] || OEFENING_IDS[oefening]);
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
  const voegOefeningToe = (event) => {
    event.preventDefault();
    try {
      const oefening = voegAangepasteOefeningToe(sessie.trainingSchemaId, nieuweOefeningNaam, sessie.oefeningen);
      schrijfInstellingen({ ...(leesInstellingen() || {}), aangepasteOefeningen: leesAangepasteOefeningen() });
      const legeSets = Object.fromEntries(SETS.map((nummer) => [nummer, { gewicht: "", reps: "" }]));
      const volgende = {
        ...sessie,
        oefeningen: [...sessie.oefeningen, oefening.naam],
        oefeningDefinities: [...(sessie.oefeningDefinities || []), oefening],
        oefeningIds: { ...sessie.oefeningIds, [oefening.naam]: oefening.id },
        gegevens: { ...sessie.gegevens, [oefening.naam]: legeSets },
      };
      setSessie(volgende);
      bewaarActieveTraining(volgende, { urgent: true });
      setNieuweOefeningNaam("");
      setNieuweOefeningFout("");
      setToonNieuweOefening(false);
      showToast(`${oefening.naam} is toegevoegd`, "success");
      requestAnimationFrame(() => document.querySelector(`[data-exercise-id="${oefening.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } catch (error) {
      setNieuweOefeningFout(error.message);
    }
  };
  const bevestigOefeningVerwijderen = () => {
    const doel = teVerwijderenOefening;
    if (!doel) return;
    try {
      verwijderAangepasteOefening(sessie.trainingSchemaId, doel.id);
      schrijfInstellingen({ ...(leesInstellingen() || {}), aangepasteOefeningen: leesAangepasteOefeningen() });
      const volgende = verwijderOefeningUitSessie(sessie, doel.id);
      if (geselecteerd === doel.naam || actieveRusttimerSet?.oefening === doel.naam) {
        rusttimerAlarm.current.annuleer();
        rusttimerNotificatieBewaker.current.annuleer();
        setActieveRusttimerSet(null);
        volgende.timer = 0;
        setGeselecteerd(null);
      }
      setSessie(volgende);
      bewaarActieveTraining(volgende, { urgent: true });
      setTeVerwijderenOefening(null);
      showToast(`${doel.naam} is verwijderd`, "success");
    } catch (error) {
      setTeVerwijderenOefening(null);
      showToast(error.message, "error");
    }
  };
  const wijzigSet = (oefening, setNummer, veld, waarde) => setSessie((vorige) => ({ ...vorige, gegevens: { ...vorige.gegevens, [oefening]: { ...vorige.gegevens[oefening], [setNummer]: { ...vorige.gegevens[oefening]?.[setNummer], [veld]: waarde } } } }));
  const stapWaarde = (oefening, setNummer, veld, stap) => {
    const huidig = Number(sessie.gegevens[oefening]?.[setNummer]?.[veld] || 0);
    wijzigSet(oefening, setNummer, veld, String(veld === "gewicht" ? Math.min(200, Math.max(10, huidig + (stap * 10))) : Math.max(0, huidig + stap)));
  };
  const voltooiSet = (oefening, setNummer) => {
    const sleutel = `${oefening}-${setNummer}`;
    const voltooideSets = sessie.voltooideSets.includes(sleutel) ? sessie.voltooideSets : [...sessie.voltooideSets, sleutel];
    if (SETS.every((nummer) => voltooideSets.includes(`${oefening}-${nummer}`))) {
      rusttimerAlarm.current.annuleer();
      rusttimerNotificatieBewaker.current.annuleer();
      setActieveRusttimerSet(null);
      const volgende = { ...sessie, timer: 0, voltooideSets, statussen: { ...sessie.statussen, [oefening]: "Voltooid" } };
      setSessie(volgende);
      bewaarActieveTraining(volgende, { urgent: true });
      setGeselecteerd(null);
      showToast("Oefening opgeslagen", "success");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    startRusttimer(oefening, setNummer);
    setSessie((vorige) => ({ ...vorige, voltooideSets }));
  };
  const startRusttimer = (oefening, setNummer) => {
    if (rusttimerGeluidRef.current) void ontgrendelRusttimerAudio();
    rusttimerAlarm.current.start();
    rusttimerNotificatieBewaker.current.start();
    setActieveRusttimerSet({ oefening, setNummer });
    setSessie((vorige) => ({ ...vorige, timer: 60 }));
  };
  const stopRusttimer = () => {
    rusttimerAlarm.current.annuleer();
    rusttimerNotificatieBewaker.current.annuleer();
    setSessie((vorige) => ({ ...vorige, timer: 0 }));
  };
  const wijzigRusttimerGeluid = (ingeschakeld) => {
    rusttimerGeluidRef.current = ingeschakeld;
    setRusttimerGeluid(bewaarRusttimerGeluidInstelling(ingeschakeld));
  };
  const wijzigRusttimerNotificatie = async (ingeschakeld) => {
    if (!ingeschakeld) {
      rusttimerNotificatieRef.current = false;
      setRusttimerNotificatie(bewaarRusttimerNotificatieInstelling(false));
      rusttimerNotificatieBewaker.current.annuleer();
      return;
    }
    const toestemming = await vraagRusttimerNotificatieToestemming();
    if (toestemming === "granted") {
      rusttimerNotificatieRef.current = true;
      setRusttimerNotificatie(bewaarRusttimerNotificatieInstelling(true));
      return;
    }
    rusttimerNotificatieRef.current = false;
    setRusttimerNotificatie(bewaarRusttimerNotificatieInstelling(false));
    showToast(toestemming === "unsupported" ? "Systeemnotificaties worden niet ondersteund op dit apparaat of in deze browser." : "Toestemming voor systeemnotificaties is niet verleend.", "info");
  };
  const slaOefeningOp = () => {
    rusttimerNotificatieBewaker.current.annuleer();
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
    rusttimerNotificatieBewaker.current.annuleer();
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
    rusttimerNotificatieBewaker.current.annuleer();
    onTrainingClosed();
  };

  const trainingOpslaan = () => {
    const onderdelen = sessie.oefeningen;
    const aantalVoltooid = onderdelen.filter((oefening) => sessie.statussen[oefening] === "Voltooid").length;
    if (aantalVoltooid === 0) return;
    if (aantalVoltooid === onderdelen.length) {
      trainingDefinitiefOpslaan();
      return;
    }
    setBevestigOnvolledig(true);
  };

  if (!sessie) return <AppScreen><AppHeader eyebrow="Aan de slag" title={VRIJE_TRAINING} subtitle="Kies zelf welke oefeningen je vandaag uitvoert." /><PrimaryButton className="button--full button--large" onClick={() => kiesTraining(VRIJE_TRAINING)}>Vrije training starten</PrimaryButton></AppScreen>;

  const onderdelen = sessie.oefeningen;
  const aantalVoltooid = onderdelen.filter((oefening) => sessie.statussen[oefening] === "Voltooid").length;

  if (!geselecteerd) return (
    <AppScreen className="active-workout">
      <SecondaryButton ref={stopKnop} className="back-button button--compact" icon="←" onClick={() => setBevestigStoppen(true)}>Stop training</SecondaryButton>
      <AppHeader eyebrow="Actieve training" title={sessie.training} subtitle={`${aantalVoltooid} van ${onderdelen.length} oefeningen voltooid`} />
      <div className="workout-progress" role="progressbar" aria-label="Voltooide oefeningen" aria-valuemin="0" aria-valuemax={onderdelen.length} aria-valuenow={aantalVoltooid}><span style={{ width: `${(aantalVoltooid / onderdelen.length) * 100}%` }} /></div>
      <div className="exercise-overview">{onderdelen.map((oefening) => {
        const status = sessie.statussen[oefening] || "Nog niet gestart";
        const eersteSet = sessie.gegevens[oefening]?.[1] || haalVorigeSetOp(oefening, 1);
        const oefeningId = sessie.oefeningIds?.[oefening];
        const isAangepast = oefeningId?.startsWith("custom-");
        return <div key={oefeningId || oefening} data-exercise-id={oefeningId} className={`exercise-overview-card${status === "Voltooid" ? " is-complete" : ""}`}><button type="button" className="exercise-overview-card__main" onClick={() => openOefening(oefening)}><span className="exercise-overview-card__copy"><strong>{oefening}</strong><small>{oefening === "Cardio" ? (sessie.cardio.type ? `${sessie.cardio.type}${sessie.cardio.tijd ? ` · ${sessie.cardio.tijd} min` : ""}` : "Cardioresultaat invoeren") : eersteSet?.gewicht || eersteSet?.reps ? `Set 1: ${eersteSet.gewicht || 0} lb × ${eersteSet.reps || 0}` : "Nog geen eerdere waarden"}</small></span><StatusBadge tone={status === "Bezig" ? "warning" : status === "Voltooid" ? "success" : "neutral"}>{status === "Voltooid" ? "✓ Voltooid" : status}</StatusBadge><span className="exercise-overview-card__arrow" aria-hidden="true">›</span></button>{isAangepast && <button type="button" className="exercise-overview-card__delete" aria-label={`${oefening} verwijderen`} onClick={() => setTeVerwijderenOefening({ id: oefeningId, naam: oefening })}>⌫</button>}</div>;
      })}</div>
      <SecondaryButton className="button--full add-exercise-button" icon="+" onClick={() => setToonNieuweOefening(true)}>Oefening toevoegen</SecondaryButton>
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
      {toonNieuweOefening && (
        <div className="confirmation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setToonNieuweOefening(false); }}>
          <Card className="confirmation-dialog add-exercise-dialog" role="dialog" aria-modal="true" aria-labelledby="nieuwe-oefening-titel">
            <form onSubmit={voegOefeningToe}>
              <h2 id="nieuwe-oefening-titel">Nieuwe oefening</h2>
              <div className="field">
                <label htmlFor="nieuwe-oefening-naam">Naam oefening</label>
                <input id="nieuwe-oefening-naam" autoFocus autoComplete="off" value={nieuweOefeningNaam} onChange={(event) => { setNieuweOefeningNaam(event.target.value); setNieuweOefeningFout(""); }} aria-invalid={Boolean(nieuweOefeningFout)} aria-describedby={nieuweOefeningFout ? "nieuwe-oefening-fout" : undefined} />
                {nieuweOefeningFout && <p id="nieuwe-oefening-fout" className="field-error" role="alert">{nieuweOefeningFout}</p>}
              </div>
              <div className="confirmation-dialog__actions">
                <SecondaryButton type="button" onClick={() => { setToonNieuweOefening(false); setNieuweOefeningFout(""); }}>Annuleren</SecondaryButton>
                <PrimaryButton type="submit">Toevoegen</PrimaryButton>
              </div>
            </form>
          </Card>
        </div>
      )}
      {teVerwijderenOefening && (
        <div className="confirmation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setTeVerwijderenOefening(null); }}>
          <Card className="confirmation-dialog delete-exercise-dialog" role="dialog" aria-modal="true" aria-labelledby="oefening-verwijderen-titel">
            <h2 id="oefening-verwijderen-titel">Oefening verwijderen?</h2>
            <p>{teVerwijderenOefening.naam} wordt uit {sessie.training} verwijderd. Eerder opgeslagen trainingsresultaten en historie blijven bewaard.</p>
            <div className="confirmation-dialog__actions">
              <SecondaryButton onClick={() => setTeVerwijderenOefening(null)}>Annuleren</SecondaryButton>
              <DangerButton onClick={bevestigOefeningVerwijderen}>Verwijderen</DangerButton>
            </div>
          </Card>
        </div>
      )}
    </AppScreen>
  );

  const isCardio = geselecteerd === "Cardio";
  return (
    <AppScreen className="active-workout">
      <SecondaryButton className="back-button button--compact" icon="←" onClick={() => { bewaarActieveTraining(sessie, { urgent: true }); rusttimerNotificatieBewaker.current.annuleer(); setGeselecteerd(null); }}>Terug naar overzicht</SecondaryButton>
      <AppHeader eyebrow="Oefening" title={geselecteerd} subtitle={sessie.training} />
      {isCardio ? <><div className="exercise-header"><span /><SecondaryButton className="button--compact" icon="↶" onClick={() => herstelVorigeWaarden(geselecteerd)}>Herstel vorige waarde</SecondaryButton></div><CardioForm value={sessie.cardio} onCardioChange={(cardio) => setSessie((vorige) => ({ ...vorige, cardio }))} /></> : (
        <Card className="exercise-card">
          <div className="exercise-header"><div><h2>{geselecteerd}</h2><div style={{ marginTop: 8 }}><StatusBadge tone="warning">Record: {haalRecordOp(geselecteerd)} lb</StatusBadge></div></div><SecondaryButton className="button--compact" icon="↶" onClick={() => herstelVorigeWaarden(geselecteerd)}>Herstel vorige waarde</SecondaryButton></div>
          <label className="timer-sound-setting"><input type="checkbox" checked={rusttimerGeluid} onChange={(event) => wijzigRusttimerGeluid(event.target.checked)} /><span>Geluid bij afloop</span></label>
          <label className="timer-sound-setting"><input type="checkbox" checked={rusttimerNotificatie} onChange={(event) => void wijzigRusttimerNotificatie(event.target.checked)} /><span>Melding bij afloop</span></label>
          <div className="sets">{SETS.map((setNummer) => {
            const vorigeSet = haalVorigeSetOp(geselecteerd, setNummer);
            const sleutel = `${geselecteerd}-${setNummer}`;
            const voltooid = sessie.voltooideSets.includes(sleutel);
            const timerHoortBijSet = actieveRusttimerSet?.oefening === geselecteerd && actieveRusttimerSet?.setNummer === setNummer;
            const timerLoopt = timerHoortBijSet && sessie.timer > 0;
            return <div key={setNummer}>{vorigeSet && <p className="previous-set">Vorige keer: {vorigeSet.gewicht || 0} lb × {vorigeSet.reps || 0}</p>}<div className={`set-card${voltooid ? " is-complete" : ""}`}><div className="set-card__header"><strong>Set {setNummer}</strong><div className="set-card__status">{voltooid && <StatusBadge>Voltooid</StatusBadge>}<button type="button" className={`set-timer-button${timerLoopt ? " is-active" : ""}`} aria-label={timerLoopt ? `Stop rusttimer van set ${setNummer}` : `Start rusttimer van set ${setNummer}`} onClick={() => timerLoopt ? stopRusttimer() : startRusttimer(geselecteerd, setNummer)}>{timerLoopt ? `${sessie.timer}s · Stop` : timerHoortBijSet ? "Opnieuw 60s" : "Rust 60s"}</button></div></div><div className="set-fields"><div className="field"><label htmlFor={`${geselecteerd}-${setNummer}-lb`}>Gewicht (lb)</label><select id={`${geselecteerd}-${setNummer}-lb`} value={sessie.gegevens[geselecteerd]?.[setNummer]?.gewicht || ""} onChange={(e) => wijzigSet(geselecteerd, setNummer, "gewicht", e.target.value)}><option value="" disabled>Kies gewicht</option>{TRAINING_WEIGHT_OPTIONS.map((gewicht) => <option key={gewicht} value={gewicht}>{gewicht} lb</option>)}</select></div><div className="field"><label htmlFor={`${geselecteerd}-${setNummer}-reps`}>Herhalingen</label><div className="stepper"><button type="button" aria-label={`Verlaag herhalingen van set ${setNummer}`} onClick={() => stapWaarde(geselecteerd, setNummer, "reps", -1)}>−</button><input id={`${geselecteerd}-${setNummer}-reps`} type="number" inputMode="numeric" value={sessie.gegevens[geselecteerd]?.[setNummer]?.reps || ""} onChange={(e) => wijzigSet(geselecteerd, setNummer, "reps", e.target.value)} placeholder="0" /><button type="button" aria-label={`Verhoog herhalingen van set ${setNummer}`} onClick={() => stapWaarde(geselecteerd, setNummer, "reps", 1)}>+</button></div></div></div><SecondaryButton className="button--full complete-set-button" disabled={voltooid} onClick={() => voltooiSet(geselecteerd, setNummer)}>{voltooid ? "Set voltooid" : setNummer === SETS.at(-1) ? "Voltooi set en sla oefening op" : "Voltooi set en start rust"}</SecondaryButton></div></div>;
          })}</div>
        </Card>
      )}
      <PrimaryButton className="button--full button--large" icon="✓" onClick={slaOefeningOp}>Oefening opslaan</PrimaryButton>
    </AppScreen>
  );
}
export default Trainingen;
