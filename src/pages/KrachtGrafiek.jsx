import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppHeader, AppScreen, Card, EmptyState } from "../components/ui";
import { theme } from "../styles/theme";
import { leesTrainingHistorie, maakKrachtGrafiekData } from "../utils/trainingHistorie";

function KrachtGrafiek() {
  const [historie] = useState(leesTrainingHistorie);
  const [oefeningen] = useState(() => {
    const uniekeOefeningen = new Set();
    leesTrainingHistorie().forEach((training) => Object.keys(training.oefeningen || {}).forEach((oefening) => uniekeOefeningen.add(oefening)));
    return Array.from(uniekeOefeningen);
  });
  const [gekozenOefening, setGekozenOefening] = useState(() => oefeningen[0] || "");
  const data = useMemo(() => maakKrachtGrafiekData(historie, gekozenOefening), [gekozenOefening, historie]);
  return (
    <AppScreen>
      <AppHeader eyebrow="Ontwikkeling" title="Krachtontwikkeling" subtitle="Bekijk je hoogste gewicht per training." />
      {oefeningen.length === 0 ? <EmptyState icon="⌁" title="Nog geen krachtgegevens" description="Sla eerst een training met gewichten op." /> : <Card className="chart-card">
        <div className="section-heading" style={{ marginBottom: 10 }}><div className="field"><label htmlFor="exercise-select">Oefening</label><select id="exercise-select" value={gekozenOefening} onChange={(e) => setGekozenOefening(e.target.value)}>{oefeningen.map((oefening) => <option key={oefening}>{oefening}</option>)}</select></div></div>
        {data.length === 0 ? <EmptyState title="Geen gegevens gevonden" /> : <div className="chart-wrap"><ResponsiveContainer><LineChart data={data} margin={{ top: 8, right: 14, left: -18, bottom: 8 }}><CartesianGrid stroke={theme.colors.surfaceRaised} strokeDasharray="3 3" vertical={false} /><XAxis dataKey="training" stroke={theme.colors.textMuted} tick={{ fontSize: 11 }} /><YAxis stroke={theme.colors.textMuted} tick={{ fontSize: 11 }} /><Tooltip contentStyle={{ background: theme.colors.card, border: `1px solid ${theme.colors.border}`, borderRadius: 12 }} /><Line type="monotone" dataKey="gewicht" stroke={theme.colors.primary} strokeWidth={3} dot={{ fill: theme.colors.primary, r: 3 }} /></LineChart></ResponsiveContainer></div>}
      </Card>}
    </AppScreen>
  );
}
export default KrachtGrafiek;
