import { useRef, useState } from "react";
import CardioForm from "../components/CardioForm";
import { AppHeader, AppScreen, Card, DangerButton, EmptyState, PrimaryButton, SecondaryButton, StatusBadge } from "../components/ui";
import { heeftCardio, leesTrainingHistorie, normaliseerHistorieItem, slaTrainingHistorieOp, verwijderOefeningUitTraining } from "../utils/trainingHistorie";

const kopieer = (waarde) => JSON.parse(JSON.stringify(waarde));

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

function Bevestigingsvenster({ titel, tekst, fout, bevestigTekst, onAnnuleren, onBevestigen }) {
  return (
    <div className="confirmation-backdrop" role="presentation" onMouseDown={onAnnuleren}>
      <Card className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="bevestiging-titel" onMouseDown={(event) => event.stopPropagation()}>
        <h2 id="bevestiging-titel">{titel}</h2>
        <p>{tekst}</p>
        {fout && <p className="confirmation-dialog__error" role="alert">{fout}</p>}
        <div className="confirmation-dialog__actions">
          <SecondaryButton autoFocus onClick={onAnnuleren}>Annuleren</SecondaryButton>
          <DangerButton onClick={onBevestigen}>{bevestigTekst}</DangerButton>
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
  const [melding, setMelding] = useState("");
  const bezigMetOpslaan = useRef(false);

  const geselecteerdeTraining = geselecteerdeIndex === null || !historie[geselecteerdeIndex]
    ? null
    : normaliseerHistorieItem(historie[geselecteerdeIndex]);
  const getoondeTraining = bewerken && concept ? concept : geselecteerdeTraining;

  const openTraining = (index) => {
    setGeselecteerdeIndex(index);
    setBewerken(false);
    setConcept(null);
    setMelding("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const terugNaarOverzicht = () => {
    setGeselecteerdeIndex(null);
    setBewerken(false);
    setConcept(null);
    setBevestiging(null);
    setMelding("");
  };

  const bewaarHistorie = (volgendeHistorie, succesmelding) => {
    if (bezigMetOpslaan.current) return false;
    bezigMetOpslaan.current = true;
    try {
      slaTrainingHistorieOp(volgendeHistorie);
      setHistorie(volgendeHistorie);
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
    const volgendeHistorie = [...historie];
    const aangevuld = normaliseerHistorieItem(concept);
    volgendeHistorie[geselecteerdeIndex] = aangevuld;
    if (bewaarHistorie(volgendeHistorie, "Wijzigingen opgeslagen.")) {
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
    const volgendeHistorie = [...historie];
    volgendeHistorie[geselecteerdeIndex] = verwijderOefeningUitTraining(geselecteerdeTraining, oefening);
    if (bewaarHistorie(volgendeHistorie, `${oefening} is uit de training verwijderd.`)) setBevestiging(null);
  };

  const verwijderTraining = () => {
    const volgendeHistorie = historie.filter((_, index) => index !== geselecteerdeIndex);
    if (bewaarHistorie(volgendeHistorie, "Training verwijderd.")) terugNaarOverzicht();
  };

  if (!getoondeTraining) {
    return (
      <AppScreen>
        <AppHeader eyebrow="Activiteit" title="Historie" subtitle="Open een training om resultaten te bekijken, aan te passen of te verwijderen." />
        {melding && <Card className="status-message" role="status">{melding}</Card>}
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
      </AppScreen>
    );
  }

  if (bewerken) {
    return (
      <AppScreen className="history-detail">
        <SecondaryButton className="back-button button--compact" icon="←" onClick={() => { setBewerken(false); setConcept(null); setMelding(""); }}>Bewerken annuleren</SecondaryButton>
        <AppHeader eyebrow="Training bewerken" title={concept.training || "Training"} subtitle="Pas opgeslagen waarden aan en sla ze opnieuw op." />
        {melding && <Card className="history-message" role="alert">{melding}</Card>}
        {heeftCardio(concept) && <CardioForm value={concept.cardio} onCardioChange={(cardio) => setConcept((vorige) => ({ ...vorige, cardio }))} />}
        {Object.entries(concept.oefeningen).map(([oefening, sets]) => (
          <Card key={oefening} className="exercise-card history-edit-exercise">
            <h2>{oefening}</h2>
            <div className="sets">{Object.entries(sets || {}).map(([setNummer, setData]) => (
              <div key={setNummer} className="set-card">
                <div className="set-card__title">Set {setNummer}</div>
                <div className="set-fields">
                  <div className="field"><label htmlFor={`edit-${oefening}-${setNummer}-kg`}>Gewicht (kg)</label><div className="stepper"><button type="button" aria-label={`Verlaag gewicht van ${oefening}, set ${setNummer}`} onClick={() => stapSet(oefening, setNummer, "gewicht", -1)}>−</button><input id={`edit-${oefening}-${setNummer}-kg`} type="number" inputMode="decimal" value={setData?.gewicht ?? ""} onChange={(event) => wijzigSet(oefening, setNummer, "gewicht", event.target.value)} /><button type="button" aria-label={`Verhoog gewicht van ${oefening}, set ${setNummer}`} onClick={() => stapSet(oefening, setNummer, "gewicht", 1)}>+</button></div></div>
                  <div className="field"><label htmlFor={`edit-${oefening}-${setNummer}-reps`}>Herhalingen</label><div className="stepper"><button type="button" aria-label={`Verlaag herhalingen van ${oefening}, set ${setNummer}`} onClick={() => stapSet(oefening, setNummer, "reps", -1)}>−</button><input id={`edit-${oefening}-${setNummer}-reps`} type="number" inputMode="numeric" value={setData?.reps ?? ""} onChange={(event) => wijzigSet(oefening, setNummer, "reps", event.target.value)} /><button type="button" aria-label={`Verhoog herhalingen van ${oefening}, set ${setNummer}`} onClick={() => stapSet(oefening, setNummer, "reps", 1)}>+</button></div></div>
                </div>
              </div>
            ))}</div>
          </Card>
        ))}
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
