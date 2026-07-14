import { useEffect, useState } from "react";
import "./App.css";
import Dashboard from "./pages/Dashboard";
import Trainingen from "./pages/Trainingen";
import Historie from "./pages/Historie";
import Records from "./pages/Records";
import Voortgang from "./pages/Voortgang";
import KrachtGrafiek from "./pages/KrachtGrafiek";
import { IconButton } from "./components/ui";
import { migreerTrainingsdata } from "./utils/storage";
import { initialiseerVeiligeHistorieOpslag } from "./utils/trainingHistorie";
import { DATA_GESYNCHRONISEERD_EVENT } from "./sync/localCache";

migreerTrainingsdata();
try {
  initialiseerVeiligeHistorieOpslag();
} catch (error) {
  console.error("Veilige initialisatie van de trainingshistorie is mislukt. Bestaande opslag blijft behouden.", error);
}

const navigation = [
  { id: "dashboard", label: "Overzicht", icon: "▦" },
  { id: "trainingen", label: "Training", icon: "◆" },
  { id: "historie", label: "Historie", icon: "◷" },
  { id: "records", label: "Records", icon: "★" },
  { id: "voortgang", label: "Gewicht", icon: "↗" },
  { id: "kracht", label: "Kracht", icon: "⌁" },
];

function App() {
  const [pagina, setPagina] = useState("dashboard");
  const [directeTraining, setDirecteTraining] = useState(null);
  const [dataRevision, setDataRevision] = useState(0);

  useEffect(() => {
    const vernieuw = () => setDataRevision((vorige) => vorige + 1);
    window.addEventListener(DATA_GESYNCHRONISEERD_EVENT, vernieuw);
    return () => window.removeEventListener(DATA_GESYNCHRONISEERD_EVENT, vernieuw);
  }, []);
  const startTraining = (naam) => { setDirecteTraining(naam); setPagina("trainingen"); };
  const openPagina = (naam) => { if (naam !== "trainingen") setDirecteTraining(null); setPagina(naam); };

  const pages = {
    dashboard: <Dashboard key={`dashboard-${dataRevision}`} onStartTraining={startTraining} />,
    trainingen: <Trainingen initialTraining={directeTraining} onTrainingClosed={() => setDirecteTraining(null)} />,
    historie: <Historie key={`historie-${dataRevision}`} />,
    records: <Records key={`records-${dataRevision}`} />,
    voortgang: <Voortgang key={`voortgang-${dataRevision}`} />,
    kracht: <KrachtGrafiek key={`kracht-${dataRevision}`} />,
  };

  return (
    <div className="app-shell">
      <div className="app-content">{pages[pagina]}</div>
      <nav className="bottom-nav" aria-label="Hoofdnavigatie">
        <div className="bottom-nav__inner">
          {navigation.map((item) => <IconButton key={item.id} label={item.label} icon={item.icon} active={pagina === item.id} onClick={() => openPagina(item.id)} />)}
        </div>
      </nav>
    </div>
  );
}
export default App;
