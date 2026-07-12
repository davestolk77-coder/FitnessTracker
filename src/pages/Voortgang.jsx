import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppHeader, AppScreen, Card, EmptyState } from "../components/ui";
import { theme } from "../styles/theme";
import { leesJson } from "../utils/storage";

function Voortgang() {
  const [metingen] = useState(() => {
    const opgeslagen = leesJson("gewichtHistorie", []);
    const historie = Array.isArray(opgeslagen) ? opgeslagen : [];
    return historie.map((meting) => ({ datum: new Date(meting.datum).toLocaleDateString("nl-NL"), gewicht: meting.gewicht }));
  });
  return (
    <AppScreen>
      <AppHeader eyebrow="Ontwikkeling" title="Gewichtsvoortgang" subtitle="Volg de ontwikkeling van je lichaamsgewicht." />
      {metingen.length === 0 ? <EmptyState icon="↗" title="Nog geen metingen" description="Sla op het overzicht je gewicht op om hier je voortgang te zien." /> : <>
        <Card className="chart-card"><div className="chart-wrap"><ResponsiveContainer><LineChart data={metingen} margin={{ top: 8, right: 14, left: -18, bottom: 8 }}><CartesianGrid stroke={theme.colors.surfaceRaised} strokeDasharray="3 3" vertical={false} /><XAxis dataKey="datum" stroke={theme.colors.textMuted} tick={{ fontSize: 11 }} /><YAxis stroke={theme.colors.textMuted} tick={{ fontSize: 11 }} /><Tooltip contentStyle={{ background: theme.colors.card, border: `1px solid ${theme.colors.border}`, borderRadius: 12 }} /><Line type="monotone" dataKey="gewicht" stroke={theme.colors.primary} strokeWidth={3} dot={{ fill: theme.colors.primary, r: 3 }} /></LineChart></ResponsiveContainer></div></Card>
        <Card className="metric-card"><span className="metric-label">Laatste gewicht</span><strong className="metric-value metric-value--accent">{metingen[metingen.length - 1].gewicht} kg</strong></Card>
      </>}
    </AppScreen>
  );
}
export default Voortgang;
