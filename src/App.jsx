import { useState } from "react";

import Dashboard from "./pages/Dashboard";
import Trainingen from "./pages/Trainingen";
import Historie from "./pages/Historie";
import Records from "./pages/Records";
import Voortgang from "./pages/Voortgang";
import KrachtGrafiek from "./pages/KrachtGrafiek";

function App() {
const [pagina, setPagina] = useState("dashboard");

const knopStyle = (naam) => ({
fontSize: "28px",
padding: "10px",
minWidth: "60px",
backgroundColor:
pagina === naam
? "#22c55e"
: "#374151",
color: "white",
border: "none",
borderRadius: "12px",
});

return (
<div
style={{
padding: "20px",
paddingBottom: "120px",
backgroundColor: "#111827",
color: "white",
minHeight: "100vh",
}}
>
{pagina === "dashboard" && <Dashboard />}
{pagina === "trainingen" && <Trainingen />}
{pagina === "historie" && <Historie />}
{pagina === "records" && <Records />}
{pagina === "voortgang" && <Voortgang />}
{pagina === "kracht" && <KrachtGrafiek />}

```
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
      paddingBottom: "45px",

      backgroundColor: "#1f2937",
      borderTop: "1px solid #374151",

      boxShadow:
        "0 -2px 6px rgba(0,0,0,0.20)",

      zIndex: 1000,
    }}
  >
    <button
      onClick={() => setPagina("dashboard")}
      style={knopStyle("dashboard")}
    >
      📊
    </button>

    <button
      onClick={() => setPagina("trainingen")}
      style={knopStyle("trainingen")}
    >
      🏋️
    </button>

    <button
      onClick={() => setPagina("historie")}
      style={knopStyle("historie")}
    >
      📜
    </button>

    <button
      onClick={() => setPagina("records")}
      style={knopStyle("records")}
    >
      🏆
    </button>

    <button
      onClick={() => setPagina("voortgang")}
      style={knopStyle("voortgang")}
    >
      📈
    </button>

    <button
      onClick={() => setPagina("kracht")}
      style={knopStyle("kracht")}
    >
      💪
    </button>
  </div>
</div>

);
}

export default App;
