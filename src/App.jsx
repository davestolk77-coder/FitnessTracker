import { useState } from "react";

import Dashboard from "./pages/Dashboard";
import Trainingen from "./pages/Trainingen";
import Historie from "./pages/Historie";
import Records from "./pages/Records";
import Voortgang from "./pages/Voortgang";
import KrachtGrafiek from "./pages/KrachtGrafiek";

function App() {
  const [pagina, setPagina] = useState("dashboard");

  return (
    <div
  style={{
    padding: "20px",
    paddingBottom: "90px",
  }}
>
     {pagina === "dashboard" && <Dashboard />}
     {pagina === "trainingen" && <Trainingen />}
     {pagina === "historie" && <Historie />}
     {pagina === "records" && <Records />}
     {pagina === "voortgang" && <Voortgang />}
     {pagina === "kracht" && <KrachtGrafiek />}

      <hr />
      <div 

      style={{
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center",
  padding: "12px",
  backgroundColor: "white",
  borderTop: "1px solid #ddd",
  boxShadow: "0 -2px 6px rgba(0,0,0,0.08)",
  zIndex: 1000,
}}
      >
<button onClick={() => setPagina("dashboard")}>
  📊
</button>

<button onClick={() => setPagina("trainingen")}>
  🏋️
</button>

<button onClick={() => setPagina("historie")}>
  📜
</button>

<button onClick={() => setPagina("records")}>
  🏆
</button>

<button onClick={() => setPagina("voortgang")}>
  📈
</button>

<button onClick={() => setPagina("kracht")}>
  💪
</button>
      </div>
    </div>
  );
}

export default App;