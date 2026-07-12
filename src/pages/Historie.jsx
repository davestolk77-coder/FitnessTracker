import { useState } from "react";
import { AppHeader, AppScreen, Card, EmptyState } from "../components/ui";
import { leesJson } from "../utils/storage";

function Historie() {
  const [opgeslagen] = useState(() => leesJson("trainingHistorie", []));
  const trainingen = Array.isArray(opgeslagen) ? opgeslagen : [];
  return (
    <AppScreen>
      <AppHeader eyebrow="Activiteit" title="Historie" subtitle="Bekijk je afgeronde trainingen en sets." />
      {trainingen.length === 0 ? <EmptyState icon="◷" title="Nog geen trainingen" description="Opgeslagen trainingen verschijnen hier automatisch." /> : (
        <div className="history-list">
          {trainingen.slice().reverse().map((training, index) => (
            <Card key={`${training.datum}-${index}`} className="history-card">
              <div><h2>{training.training}</h2><p className="history-date">{new Date(training.datum).toLocaleString("nl-NL")}</p></div>
              <div>
                {Object.entries(training.oefeningen || {}).map(([oefening, sets]) => (
                  <div key={oefening} className="history-exercise">
                    <strong>{oefening}</strong>
                    {Object.entries(sets || {}).map(([setNr, setData]) => <div key={setNr} className="history-set">Set {setNr}: {setData.gewicht} kg × {setData.reps}</div>)}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppScreen>
  );
}
export default Historie;
