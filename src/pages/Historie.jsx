import { useRef, useState } from "react";
import CardioForm from "../components/CardioForm";
import { AppHeader, AppScreen, Card, DangerButton, EmptyState, PrimaryButton, SecondaryButton, StatusBadge } from "../components/ui";
import { getOntbrekendeOefeningen, getTrainingSchema, heeftCardio, importeerFitnessBackup, leesTrainingHistorie, maakFitnessBackupData, normaliseerHistorieItem, valideerFitnessBackup, verwijderOefeningUitTraining, verwijderTraining as verwijderTrainingUitHistorie, vindLaatsteOefeningWaarden, werkTrainingBij } from "../utils/trainingHistorie";

const kopieer = (waarde) => JSON.parse(JSON.stringify(waarde));
const SETS = [1, 2, 3];

function formatDatum(waarde) {
  const datum = new Date(waarde);
  return Number.isNaN(datum.getTime()) ? "Datum onbekend" : datum.toLocaleString("nl-NL");
}

function formatStartTijd(waarde) {
  if (!waarde) return "Niet opgeslagen";
  const datum = new Date(waarde);
  return Number.isNaN(datum.getTime()) ? "Niet opgeslagen" : datum.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

function formatDuur(seconden) {
  if (!Number.isFinite(Number(seconden)) || Number(seconden) <= 0) return "Niet opgeslagen";
  const totaal = Math.round(Number(seconden));
  const minuten = Math.floor(totaal / 60);
  const rest = totaal % 60;
  return minuten > 0 ? `${minuten} min ${rest} sec` : `${rest} sec`;
}

function cardioSamenvatting(cardio) {
  const labels = { type: "Type", tijd: "Tijd", afstand: "Afstand", snelheid: "Snelheid", helling: "Helling", niveau: "Niveau", weerstand: "Weerstand" };
  const eenheden = { tijd: " min", afstand: " km", snelheid: " km/u", helling: "%" };
  return Object.entries(cardio || {}).map(([veld, waarde]) => `${labels[veld] || veld}: ${waarde}${eenheden[veld] || ""}`).join(" · ");
}

function Bevestigingsvenster({ titel, tekst, fout, bevestigTekst, danger = true, onAnnuleren, onBevestigen }) {
  const BevestigButton = danger ? DangerButton : PrimaryButton;
  return (
    <div className="confirmation-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onAnnuleren();
    }}>
      <Card className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="bevestiging-titel" onMouseDown={(event) => event.stopPropagation()}>
        <h2 id="bevestiging-titel">{titel}</h2>
        <p>{tekst}</p>
        {fout && <p className="confirmation-dialog__error" role="alert">{fout}</p>}
        <div className="confirmation-dialog__actions">
          <SecondaryButton autoFocus onClick={onAnnuleren}>Annuleren</SecondaryButton>
          <BevestigButton onClick={onBevestigen}>{bevestigTekst}</BevestigButton>
        </div>
      </Card>
    </div>
  );
}

function Historie() {
  const [historie, setHistorie] = useState(leesTrainingHistorie);
  const [geselecteerdeIndex, setGeselecteerdeIndex] = useState(null);
  const [bewerken, setBewerken] = useState(false);
  const [concept, setConcept] = useState(null);
  const [bevestiging, setBevestiging] = useState(null);
  const [importVoorstel, setImportVoorstel] = useState(null);
  const [toevoegenOefening, setToevoegenOefening] = useState(null);
  const [toevoegConcept, setToevoegConcept] = useState(null);
  const [melding, setMelding] = useState("");
  const bezigMetOpslaan = useRef(false);
  const importInput = useRef(null);

  const geselecteerdeTraining = geselecteerdeIndex === null || !historie[geselecteerdeIndex]
    ? null
    : normaliseerHistorieItem(historie[geselecteerdeIndex]);
  const getoondeTraining = bewerken && concept ? concept : geselecteerdeTraining;
  const schema = geselecteerdeTraining ? getTrainingSchema(geselecteerdeTraining) : null;
  const ontbrekendeOefeningen = geselecteerdeTraining ? getOntbrekendeOefeningen(geselecteerdeTraining) : [];
  const andereHistorie = geselecteerdeTraining ? historie.filter((item) => normaliseerHistorieItem(item).trainingId !== geselecteerdeTraining.trainingId) : historie;

  const openTraining = (index) => {
    setGeselecteerdeIndex(index);
    setBewerken(false);
    setConcept(null);
    setToevoegenOefening(null);
    setToevoegConcept(null);
    setMelding("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const terugNaarOverzicht = () => {
    setGeselecteerdeIndex(null);
    setBewerken(false);
    setConcept(null);
    setToevoegenOefening(null);
    setToevoegConcept(null);
    setBevestiging(null);
    setImportVoorstel(null);
    setMelding("");
  };

  const voerOpslagActieUit = (actie, succesmelding) => {
    if (bezigMetOpslaan.current) return false;
    bezigMetOpslaan.current = true;
    try {
      const opgeslagenHistorie = actie();
      setHistorie(opgeslagenHistorie);
      setMelding(succesmelding);
      return true;
    } catch (error) {
      console.error("Trainingshistorie opslaan mislukt", error);
      setMelding("Opslaan is niet gelukt. Je bestaande trainingshistorie is niet bewust gewist; probeer het opnieuw.");
      return false;
    } finally {
      bezigMetOpslaan.current = false;
    }
  };

  const startBewerken = () => {
    setConcept(kopieer(geselecteerdeTraining));
    setBewerken(true);
    setMelding("");
  };

  const vorigeWaardenVoor = (oefening) => vindLaatsteOefeningWaarden(andereHistorie, oefening);
  const vorigeCardio = [...andereHistorie].reverse().map(normaliseerHistorieItem).find(heeftCardio)?.cardio || null;

  const startOefeningToevoegen = (oefening) => {
    setToevoegenOefening(oefening);
    setToevoegConcept(oefening === "Cardio" ? { type: "Loopband" } : Object.fromEntries(SETS.map((setNummer) => [setNummer, {}])));
    setMelding("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const voegAanConceptToe = (oefening) => {
    setConcept((vorige) => oefening === "Cardio"
      ? { ...vorige, cardio: { type: "Loopband" } }
      : { ...vorige, oefeningen: { ...vorige.oefeningen, [oefening]: Object.fromEntries(SETS.map((setNummer) => [setNummer, {}])) } });
  };

  const wijzigToevoegSet = (setNummer, veld, waarde) => {
    setToevoegConcept((vorige) => ({ ...vorige, [setNummer]: { ...vorige?.[setNummer], [veld]: waarde } }));
  };

  const stapToevoegSet = (setNummer, veld, stap) => {
    const huidig = Number(toevoegConcept?.[setNummer]?.[veld] || 0);
    wijzigToevoegSet(setNummer, veld, String(Math.max(0, huidig + stap)));
  };

  const gebruikVorigeToevoegWaarden = () => {
    if (toevoegenOefening === "Cardio" && vorigeCardio) setToevoegConcept(kopieer(vorigeCardio));
    else {
      const vorige = vorigeWaardenVoor(toevoegenOefening);
      if (vorige) setToevoegConcept(kopieer(vorige));
    }
  };

  const slaToegevoegdeOefeningOp = () => {
    const bijgewerkt = kopieer(geselecteerdeTraining);
    if (toevoegenOefening === "Cardio") bijgewerkt.cardio = { ...toevoegConcept, type: toevoegConcept?.type || "Loopband" };
    else bijgewerkt.oefeningen = { ...bijgewerkt.oefeningen, [toevoegenOefening]: toevoegConcept };
    const genormaliseerd = normaliseerHistorieItem(bijgewerkt);
    if (voerOpslagActieUit(() => werkTrainingBij(geselecteerdeTraining.trainingId, genormaliseerd), `${toevoegenOefening} is aan de training toegevoegd.`)) {
      setToevoegenOefening(null);
      setToevoegConcept(null);
    }
  };

  const wijzigSet = (oefening, setNummer, veld, waarde) => {
    setConcept((vorige) => ({
      ...vorige,
      oefeningen: {
        ...vorige.oefeningen,
        [oefening]: {
          ...vorige.oefeningen[oefening],
          [setNummer]: { ...vorige.oefeningen[oefening]?.[setNummer], [veld]: waarde },
        },
      },
    }));
  };

  const stapSet = (oefening, setNummer, veld, stap) => {
    const huidig = Number(concept.oefeningen[oefening]?.[setNummer]?.[veld] || 0);
    wijzigSet(oefening, setNummer, veld, String(Math.max(0, huidig + stap)));
  };

  const slaWijzigingenOp = () => {
    const aangevuld = normaliseerHistorieItem(concept);
    if (voerOpslagActieUit(() => werkTrainingBij(geselecteerdeTraining.trainingId, aangevuld), "Wijzigingen opgeslagen.")) {
      setConcept(null);
      setBewerken(false);
    }
  };

  const vraagOefeningVerwijderen = (oefening) => {
    if (geselecteerdeTraining.voltooidAantal <= 1) {
      setMelding("De laatste oefening kan niet afzonderlijk worden verwijderd. Verwijder de volledige training als je deze niet wilt bewaren.");
      return;
    }
    setMelding("");
    setBevestiging({ type: "oefening", oefening });
  };

  const verwijderOefening = () => {
    const oefening = bevestiging.oefening;
    const bijgewerkt = verwijderOefeningUitTraining(geselecteerdeTraining, oefening);
    if (voerOpslagActieUit(() => werkTrainingBij(geselecteerdeTraining.trainingId, bijgewerkt), `${oefening} is uit de training verwijderd.`)) setBevestiging(null);
  };

  const verwijderTraining = () => {
    if (voerOpslagActieUit(() => verwijderTrainingUitHistorie(geselecteerdeTraining.trainingId), "Training verwijderd.")) terugNaarOverzicht();
  };

  const exporteerBackup = () => {
    try {
      const data = maakFitnessBackupData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const nu = new Date();
      const tweeCijfers = (waarde) => String(waarde).padStart(2, "0");
      link.href = url;
      link.download = `FitnessTracker-backup-${nu.getFullYear()}-${tweeCijfers(nu.getMonth() + 1)}-${tweeCijfers(nu.getDate())}-${tweeCijfers(nu.getHours())}${tweeCijfers(nu.getMinutes())}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      setMelding(`Back-up voorbereid met ${data.trainingHistorie.length} training(en) en ${data.gewichtHistorie.length} gewichtsmeting(en).`);
    } catch (error) {
      console.error("Back-up exporteren mislukt", error);
      setMelding("Back-up exporteren is niet gelukt. Er zijn geen opgeslagen gegevens gewijzigd.");
    }
  };

  const leesImportBestand = async (event) => {
    const bestand = event.target.files?.[0];
    event.target.value = "";
    if (!bestand) return;
    try {
      const voorstel = valideerFitnessBackup(await bestand.text());
      setImportVoorstel(voorstel);
      setMelding("");
      setBevestiging({ type: "import" });
    } catch (error) {
      setImportVoorstel(null);
      setMelding(error.message || "De back-up kon niet worden gelezen.");
    }
  };

  const bevestigImport = () => {
    if (!importVoorstel) return;
    if (voerOpslagActieUit(() => importeerFitnessBackup(importVoorstel.data), "Back-up samengevoegd met de bestaande gegevens.")) {
      setImportVoorstel(null);
      setBevestiging(null);
    }
  };

  if (!getoondeTraining) {
    return (
      <AppScreen>
        <AppHeader eyebrow="Activiteit" title="Historie" subtitle="Open een training om resultaten te bekijken, aan te passen of te verwijderen." />
        {melding && <Card className="status-message" role="status">{melding}</Card>}
        <Card className="backup-tools">
          <div><h2>Gegevens veiligstellen</h2><p>Exporteer een eigen kopie of voeg een eerdere FitnessTracker-back-up samen.</p></div>
          <div className="backup-tools__actions">
            <SecondaryButton icon="↓" onClick={exporteerBackup}>Back-up exporteren</SecondaryButton>
            <SecondaryButton icon="↑" onClick={() => importInput.current?.click()}>Back-up importeren</SecondaryButton>
          </div>
          <input ref={importInput} className="visually-hidden" type="file" accept="application/json,.json" onChange={leesImportBestand} aria-label="FitnessTracker-back-up kiezen" />
        </Card>
        {historie.length === 0 ? <EmptyState icon="◷" title="Nog geen trainingen" description="Opgeslagen trainingen verschijnen hier automatisch." /> : (
          <div className="history-list">
            {historie.map((item, index) => ({ item: normaliseerHistorieItem(item), index })).reverse().map(({ item, index }) => (
              <Card key={`${item.datum || "training"}-${index}`} className="history-card">
                <div className="history-heading">
                  <div><h2>{item.training || "Training"}</h2><p className="history-date">{formatDatum(item.datum)}</p></div>
                  <StatusBadge tone={item.isVolledig ? "success" : "warning"}>{item.isVolledig ? "Voltooid" : "Gedeeltelijk"}</StatusBadge>
                </div>
                <p className="history-summary">{item.voltooidAantal} van {item.totaalOefeningen} oefeningen · {formatDuur(item.duur)}</p>
                <SecondaryButton className="button--full" icon="›" onClick={() => openTraining(index)}>Bekijken en aanpassen</SecondaryButton>
              </Card>
            ))}
          </div>
        )}
        {bevestiging?.type === "import" && importVoorstel && <Bevestigingsvenster titel="Back-up importeren?" tekst={`De back-up bevat ${importVoorstel.samenvatting.trainingen} training(en) en ${importVoorstel.samenvatting.gewichtsmetingen} gewichtsmeting(en). Deze worden samengevoegd; bestaande gegevens worden niet blind overschreven.`} fout={melding.startsWith("Opslaan is niet gelukt") ? melding : ""} bevestigTekst="Samenvoegen" danger={false} onAnnuleren={() => { setBevestiging(null); setImportVoorstel(null); }} onBevestigen={bevestigImport} />}
      </AppScreen>
    );
  }

  if (toevoegenOefening && geselecteerdeTraining) {
    const vorigeKrachtwaarden = toevoegenOefening === "Cardio" ? null : vorigeWaardenVoor(toevoegenOefening);
    const heeftVorigeWaarden = toevoegenOefening === "Cardio" ? Boolean(vorigeCardio) : Boolean(vorigeKrachtwaarden);
    return (
      <AppScreen className="history-detail">
        <SecondaryButton className="back-button button--compact" icon="←" onClick={() => { setToevoegenOefening(null); setToevoegConcept(null); setMelding(""); }}>Toevoegen annuleren</SecondaryButton>
        <AppHeader eyebrow="Oefening toevoegen" title={toevoegenOefening} subtitle={geselecteerdeTraining.training || "Opgeslagen training"} />
        {melding && <Card className="history-message" role="alert">{melding}</Card>}
        {heeftVorigeWaarden && <SecondaryButton className="button--full" icon="↶" onClick={gebruikVorigeToevoegWaarden}>Vorige waarden gebruiken</SecondaryButton>}
        {toevoegenOefening === "Cardio" ? (
          <CardioForm value={toevoegConcept || {}} onCardioChange={setToevoegConcept} />
        ) : (
          <Card className="exercise-card history-edit-exercise">
            <h2>{toevoegenOefening}</h2>
            <div className="sets">{SETS.map((setNummer) => {
              const setData = toevoegConcept?.[setNummer] || {};
              const vorigeSet = vorigeKrachtwaarden?.[setNummer];
              return (
                <div key={setNummer}>
                  {vorigeSet && <p className="previous-set">Vorige keer: {vorigeSet.gewicht || 0} kg × {vorigeSet.reps || 0}</p>}
                  <div className="set-card">
                    <div className="set-card__title">Set {setNummer}</div>
                    <div className="set-fields">
                      <div className="field"><label htmlFor={`add-${toevoegenOefening}-${setNummer}-kg`}>Gewicht (kg)</label><div className="stepper"><button type="button" aria-label={`Verlaag gewicht van ${toevoegenOefening}, set ${setNummer}`} onClick={() => stapToevoegSet(setNummer, "gewicht", -1)}>−</button><input id={`add-${toevoegenOefening}-${setNummer}-kg`} type="number" inputMode="decimal" value={setData.gewicht ?? ""} onChange={(event) => wijzigToevoegSet(setNummer, "gewicht", event.target.value)} /><button type="button" aria-label={`Verhoog gewicht van ${toevoegenOefening}, set ${setNummer}`} onClick={() => stapToevoegSet(setNummer, "gewicht", 1)}>+</button></div></div>
                      <div className="field"><label htmlFor={`add-${toevoegenOefening}-${setNummer}-reps`}>Herhalingen</label><div className="stepper"><button type="button" aria-label={`Verlaag herhalingen van ${toevoegenOefening}, set ${setNummer}`} onClick={() => stapToevoegSet(setNummer, "reps", -1)}>−</button><input id={`add-${toevoegenOefening}-${setNummer}-reps`} type="number" inputMode="numeric" value={setData.reps ?? ""} onChange={(event) => wijzigToevoegSet(setNummer, "reps", event.target.value)} /><button type="button" aria-label={`Verhoog herhalingen van ${toevoegenOefening}, set ${setNummer}`} onClick={() => stapToevoegSet(setNummer, "reps", 1)}>+</button></div></div>
                    </div>
                  </div>
                </div>
              );
            })}</div>
          </Card>
        )}
        <PrimaryButton className="button--full button--large" icon="✓" onClick={slaToegevoegdeOefeningOp}>Oefening opslaan</PrimaryButton>
      </AppScreen>
    );
  }

  if (bewerken) {
    return (
      <AppScreen className="history-detail">
        <SecondaryButton className="back-button button--compact" icon="←" onClick={() => { setBewerken(false); setConcept(null); setMelding(""); }}>Bewerken annuleren</SecondaryButton>
        <AppHeader eyebrow="Training bewerken" title={concept.training || "Training"} subtitle="Pas opgeslagen waarden aan en sla ze opnieuw op." />
        {melding && <Card className="history-message" role="alert">{melding}</Card>}
        <div className="history-section-heading"><h2>Uitgevoerde oefeningen</h2><StatusBadge>{normaliseerHistorieItem(concept).voltooidAantal} opgeslagen</StatusBadge></div>
        {heeftCardio(concept) && <CardioForm value={concept.cardio} onCardioChange={(cardio) => setConcept((vorige) => ({ ...vorige, cardio }))} />}
        {Object.entries(concept.oefeningen).map(([oefening, sets]) => (
          <Card key={oefening} className="exercise-card history-edit-exercise">
            <h2>{oefening}</h2>
            <div className="sets">{Object.entries(sets || {}).map(([setNummer, setData]) => (
              <div key={setNummer}>
                {vorigeWaardenVoor(oefening)?.[setNummer] && <p className="previous-set">Vorige keer: {vorigeWaardenVoor(oefening)[setNummer].gewicht || 0} kg × {vorigeWaardenVoor(oefening)[setNummer].reps || 0}</p>}
                <div className="set-card">
                  <div className="set-card__title">Set {setNummer}</div>
                  <div className="set-fields">
                    <div className="field"><label htmlFor={`edit-${oefening}-${setNummer}-kg`}>Gewicht (kg)</label><div className="stepper"><button type="button" aria-label={`Verlaag gewicht van ${oefening}, set ${setNummer}`} onClick={() => stapSet(oefening, setNummer, "gewicht", -1)}>−</button><input id={`edit-${oefening}-${setNummer}-kg`} type="number" inputMode="decimal" value={setData?.gewicht ?? ""} onChange={(event) => wijzigSet(oefening, setNummer, "gewicht", event.target.value)} /><button type="button" aria-label={`Verhoog gewicht van ${oefening}, set ${setNummer}`} onClick={() => stapSet(oefening, setNummer, "gewicht", 1)}>+</button></div></div>
                    <div className="field"><label htmlFor={`edit-${oefening}-${setNummer}-reps`}>Herhalingen</label><div className="stepper"><button type="button" aria-label={`Verlaag herhalingen van ${oefening}, set ${setNummer}`} onClick={() => stapSet(oefening, setNummer, "reps", -1)}>−</button><input id={`edit-${oefening}-${setNummer}-reps`} type="number" inputMode="numeric" value={setData?.reps ?? ""} onChange={(event) => wijzigSet(oefening, setNummer, "reps", event.target.value)} /><button type="button" aria-label={`Verhoog herhalingen van ${oefening}, set ${setNummer}`} onClick={() => stapSet(oefening, setNummer, "reps", 1)}>+</button></div></div>
                  </div>
                </div>
              </div>
            ))}</div>
          </Card>
        ))}
        {getTrainingSchema(concept) && <>
          <div className="history-section-heading"><h2>Nog niet uitgevoerd</h2><StatusBadge tone="neutral">{getOntbrekendeOefeningen(concept).length} ontbrekend</StatusBadge></div>
          {getOntbrekendeOefeningen(concept).length === 0 ? <Card className="history-complete-message">Alle oefeningen uit dit schema zijn toegevoegd.</Card> : getOntbrekendeOefeningen(concept).map((oefening) => (
            <Card key={oefening} className="history-exercise history-exercise--missing">
              <div><strong>{oefening}</strong><StatusBadge tone="neutral">Nog niet uitgevoerd</StatusBadge></div>
              <SecondaryButton className="button--compact" onClick={() => voegAanConceptToe(oefening)}>Oefening toevoegen</SecondaryButton>
            </Card>
          ))}
        </>}
        <PrimaryButton className="button--full button--large" icon="✓" onClick={slaWijzigingenOp}>Wijzigingen opslaan</PrimaryButton>
      </AppScreen>
    );
  }

  return (
    <AppScreen className="history-detail">
      <SecondaryButton className="back-button button--compact" icon="←" onClick={terugNaarOverzicht}>Terug naar historie</SecondaryButton>
      <AppHeader eyebrow="Opgeslagen training" title={geselecteerdeTraining.training || "Training"} subtitle={formatDatum(geselecteerdeTraining.datum)} />
      {melding && <Card className="history-message" role="status">{melding}</Card>}
      <div className="history-detail__meta">
        <Card className="history-meta-card"><span>Starttijd</span><strong>{formatStartTijd(geselecteerdeTraining.startTijd)}</strong></Card>
        <Card className="history-meta-card"><span>Duur</span><strong>{formatDuur(geselecteerdeTraining.duur)}</strong></Card>
        <Card className="history-meta-card"><span>Status</span><StatusBadge tone={geselecteerdeTraining.isVolledig ? "success" : "warning"}>{geselecteerdeTraining.status}</StatusBadge></Card>
        <Card className="history-meta-card"><span>Uitgevoerd</span><strong>{geselecteerdeTraining.voltooidAantal} van {geselecteerdeTraining.totaalOefeningen}</strong></Card>
      </div>
      <div className="history-section-heading"><h2>Uitgevoerde oefeningen</h2><StatusBadge>{geselecteerdeTraining.voltooidAantal} opgeslagen</StatusBadge></div>
      {heeftCardio(geselecteerdeTraining) && (
        <Card className="history-exercise history-exercise--detail">
          <div className="history-exercise__heading"><strong>Cardio</strong><DangerButton className="button--compact" onClick={() => vraagOefeningVerwijderen("Cardio")}>Verwijderen</DangerButton></div>
          <div className="history-set">{cardioSamenvatting(geselecteerdeTraining.cardio)}</div>
        </Card>
      )}
      {Object.entries(geselecteerdeTraining.oefeningen).map(([oefening, sets]) => (
        <Card key={oefening} className="history-exercise history-exercise--detail">
          <div className="history-exercise__heading"><strong>{oefening}</strong><DangerButton className="button--compact" onClick={() => vraagOefeningVerwijderen(oefening)}>Verwijderen</DangerButton></div>
          {Object.keys(sets || {}).length === 0 ? <div className="history-set">Geen setwaarden opgeslagen.</div> : Object.entries(sets).map(([setNr, setData]) => <div key={setNr} className="history-set">Set {setNr}: {setData?.gewicht ?? 0} kg × {setData?.reps ?? 0}</div>)}
        </Card>
      ))}
      {schema && <>
        <div className="history-section-heading"><h2>Nog niet uitgevoerd</h2><StatusBadge tone="neutral">{ontbrekendeOefeningen.length} ontbrekend</StatusBadge></div>
        {ontbrekendeOefeningen.length === 0 ? <Card className="history-complete-message">Alle oefeningen uit dit schema zijn uitgevoerd.</Card> : ontbrekendeOefeningen.map((oefening) => (
          <Card key={oefening} className="history-exercise history-exercise--missing">
            <div><strong>{oefening}</strong><StatusBadge tone="neutral">Nog niet uitgevoerd</StatusBadge></div>
            <SecondaryButton className="button--compact" onClick={() => startOefeningToevoegen(oefening)}>Oefening toevoegen</SecondaryButton>
          </Card>
        ))}
      </>}
      <div className="history-detail__actions">
        <PrimaryButton className="button--full" icon="✎" onClick={startBewerken}>Training bewerken</PrimaryButton>
        <DangerButton className="button--full" icon="×" onClick={() => { setMelding(""); setBevestiging({ type: "training" }); }}>Training verwijderen</DangerButton>
      </div>
      {bevestiging?.type === "oefening" && <Bevestigingsvenster titel="Oefening verwijderen?" tekst={`${bevestiging.oefening} wordt uit deze opgeslagen training verwijderd. Dit kan invloed hebben op je records en vorige waarden.`} fout={melding.startsWith("Opslaan is niet gelukt") ? melding : ""} bevestigTekst="Verwijderen" onAnnuleren={() => setBevestiging(null)} onBevestigen={verwijderOefening} />}
      {bevestiging?.type === "training" && <Bevestigingsvenster titel="Training verwijderen?" tekst="Deze training en alle opgeslagen oefeningen worden permanent verwijderd uit je historie." fout={melding.startsWith("Opslaan is niet gelukt") ? melding : ""} bevestigTekst="Definitief verwijderen" onAnnuleren={() => setBevestiging(null)} onBevestigen={verwijderTraining} />}
    </AppScreen>
  );
}

export default Historie;
