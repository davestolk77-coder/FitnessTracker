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

  paddingTop: "12px",
  paddingBottom: "35px",

  backgroundColor: "white",
  borderTop: "1px solid #ddd",

  boxShadow:
    "0 -2px 6px rgba(0,0,0,0.08)",

  zIndex: 1000,
}}
      >
<button onClick={() => setPagina("dashboard")}
  style={{
    fontSize: "28px",
    padding: "10px",
    minWidth: "60px",
  }}>
  📊
</button>

<button onClick={() => setPagina("trainingen")}
  style={{
    fontSize: "28px",
    padding: "10px",
    minWidth: "60px",
  }}>
  🏋️
</button>

<button onClick={() => setPagina("historie")}style={{
    fontSize: "28px",
    padding: "10px",
    minWidth: "60px",
  }}>
  📜
</button>

<button onClick={() => setPagina("records")}
  style={{
    fontSize: "28px",
    padding: "10px",
    minWidth: "60px",
  }}>
  🏆
</button>

<button onClick={() => setPagina("voortgang")}
  style={{
    fontSize: "28px",
    padding: "10px",
    minWidth: "60px",
  }}>
  📈
</button>

<button onClick={() => setPagina("kracht")}style={{
    fontSize: "28px",
    padding: "10px",
    minWidth: "60px",
  }}>
  💪
</button>
      </div>
    </div>
  );
}

export default App;