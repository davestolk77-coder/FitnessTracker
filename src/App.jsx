import { useState } from "react";
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
  const startTraining = (naam) => { setDirecteTraining(naam); setPagina("trainingen"); };
  const openPagina = (naam) => { if (naam !== "trainingen") setDirecteTraining(null); setPagina(naam); };

  const pages = {
    dashboard: <Dashboard onStartTraining={startTraining} />,
    trainingen: <Trainingen initialTraining={directeTraining} onTrainingClosed={() => setDirecteTraining(null)} />,
    historie: <Historie />,
    records: <Records />,
    voortgang: <Voortgang />,
    kracht: <KrachtGrafiek />,
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
