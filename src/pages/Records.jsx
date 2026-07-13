import { useState } from "react";
import { AppHeader, AppScreen, Card, EmptyState, StatusBadge } from "../components/ui";
import { berekenPersoonlijkeRecords, leesTrainingHistorie } from "../utils/trainingHistorie";

function Records() {
  const [records] = useState(() => berekenPersoonlijkeRecords(leesTrainingHistorie()));
  const lijst = Object.entries(records).sort((a, b) => a[0].localeCompare(b[0]));
  return (
    <AppScreen>
      <AppHeader eyebrow="Prestaties" title="Persoonlijke records" subtitle="Je hoogste gewicht per oefening." />
      {lijst.length === 0 ? <EmptyState icon="★" title="Nog geen records" description="Records worden berekend zodra je een training opslaat." /> : (
        <div className="record-list">{lijst.map(([oefening, gewicht]) => <Card key={oefening} className="record-card"><div><StatusBadge>Persoonlijk record</StatusBadge><h2 style={{ marginTop: 10 }}>{oefening}</h2></div><strong className="record-value">{gewicht} kg</strong></Card>)}</div>
      )}
    </AppScreen>
  );
}
export default Records;
