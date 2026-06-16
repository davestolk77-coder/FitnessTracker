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
     <h1
  style={{
    textAlign: "center",
    marginBottom: "30px",
    color: "#22c55e",
  }}
>
  📊 Dashboard
</h1>

      <div
        style={{
          backgroundColor: "#1f2937",
          padding: "20px",
          borderRadius: "16px",
          marginBottom: "20px",
        }}
      >
        <h3
          style={{
            marginTop: 0,
            color: "#d1d5db",
          }}
        >
          Huidig Gewicht
        </h3>

        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >
          <input
            type="number"
            step="0.1"
            value={gewicht}
            onChange={(e) =>
              setGewicht(e.target.value)
            }
            style={{
              flex: 1,
              padding: "12px",
              fontSize: "16px",
              borderRadius: "10px",
              border: "1px solid #374151",
              backgroundColor: "#374151",
              color: "white",
            }}
          />

          <button
            onClick={opslaanGewicht}
            style={{
              backgroundColor: "#22c55e",
              color: "white",
              border: "none",
              borderRadius: "10px",
              padding: "12px 20px",
              fontWeight: "bold",
            }}
          >
            Opslaan
          </button>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#1f2937",
          padding: "20px",
          borderRadius: "16px",
          marginBottom: "20px",
          textAlign: "center",
        }}
      >
        <h3
          style={{
            color: "#d1d5db",
          }}
        >
          Laatste Training
        </h3>

        <p
          style={{
            fontSize: "20px",
            fontWeight: "bold",
          }}
        >
          {laatsteTraining}
        </p>
      </div>

      <div
        style={{
          backgroundColor: "#1f2937",
          padding: "20px",
          borderRadius: "16px",
          textAlign: "center",
        }}
      >
        <h3
          style={{
            color: "#d1d5db",
          }}
        >
          Totaal Trainingen
        </h3>

        <p
          style={{
            fontSize: "32px",
            fontWeight: "bold",
            color: "#22c55e",
          }}
        >
          {aantalTrainingen}
        </p>
      </div>
    </div>
  );
}

export default Dashboard;