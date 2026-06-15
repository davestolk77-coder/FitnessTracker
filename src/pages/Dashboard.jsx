import { useState, useEffect } from "react";

function Dashboard() {
  const [gewicht, setGewicht] = useState("");
  const [laatsteTraining, setLaatsteTraining] = useState("Geen");
  const [aantalTrainingen, setAantalTrainingen] = useState(0);

  useEffect(() => {
    const opgeslagenGewicht =
      localStorage.getItem("huidigGewicht");

    if (opgeslagenGewicht) {
      setGewicht(opgeslagenGewicht);
    }

    const historie =
      JSON.parse(
        localStorage.getItem("trainingHistorie")
      ) || [];

    setAantalTrainingen(historie.length);

    if (historie.length > 0) {
      const laatste =
        historie[historie.length - 1];

      setLaatsteTraining(
        laatste.training
      );
    }
  }, []);

 const opslaanGewicht = () => {
  localStorage.setItem(
    "huidigGewicht",
    gewicht
  );

  const gewichtHistorie =
    JSON.parse(
      localStorage.getItem("gewichtHistorie")
    ) || [];

  gewichtHistorie.push({
    datum: new Date().toISOString(),
    gewicht: Number(gewicht),
  });

  localStorage.setItem(
    "gewichtHistorie",
    JSON.stringify(gewichtHistorie)
  );

  alert("Gewicht opgeslagen!");
};

  return (
    <div>
      <h1>📊 Dashboard</h1>

      <h3>Huidig Gewicht</h3>

      <input
        type="number"
        step="0.1"
        value={gewicht}
        onChange={(e) =>
          setGewicht(e.target.value)
        }
      />

      <button
        onClick={opslaanGewicht}
        style={{ marginLeft: "10px" }}
      >
        Opslaan
      </button>

      <hr />

      <h3>Laatste Training</h3>
      <p>{laatsteTraining}</p>

      <h3>Totaal Trainingen</h3>
      <p>{aantalTrainingen}</p>
    </div>
  );
}

export default Dashboard;