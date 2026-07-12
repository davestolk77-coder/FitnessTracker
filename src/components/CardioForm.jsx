import { SectionCard } from "./ui";

function CardioForm({ value = {}, onCardioChange }) {
  const type = value.type || "Loopband";
  const wijzigVeld = (veld, veldWaarde) => onCardioChange({ ...value, type, [veld]: veldWaarde });
  const wijzigType = (nieuwType) => onCardioChange({ type: nieuwType });
  const field = (id, label, options = {}) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="number" inputMode="decimal" step={options.step} value={value[options.key || id] || ""} onChange={(e) => wijzigVeld(options.key || id, e.target.value)} />
    </div>
  );
  return (
    <SectionCard title="Cardio" description="Voeg je cardioresultaten toe en sla de oefening op.">
      <div className="cardio-fields">
        <div className="field"><label htmlFor="cardio-type">Type</label><select id="cardio-type" value={type} onChange={(e) => wijzigType(e.target.value)}><option>Loopband</option><option>Crosstrainer</option><option>Fiets</option></select></div>
        {field("tijd", "Tijd (minuten)")}
        {type === "Loopband" && <>{field("afstand", "Afstand (km)", { step: "0.1" })}{field("snelheid", "Snelheid (km/u)", { step: "0.1" })}{field("helling", "Helling (%)")}</>}
        {type === "Crosstrainer" && field("niveau", "Niveau")}
        {type === "Fiets" && <>{field("afstand", "Afstand (km)", { step: "0.1" })}{field("weerstand", "Weerstand")}</>}
      </div>
    </SectionCard>
  );
}
export default CardioForm;
