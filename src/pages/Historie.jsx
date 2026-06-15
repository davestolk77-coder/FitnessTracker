import { useEffect, useState } from "react";

function Historie() {
  const [trainingen, setTrainingen] = useState([]);

  useEffect(() => {
    const opgeslagenTrainingen =
      JSON.parse(
        localStorage.getItem("trainingHistorie")
      ) || [];

    setTrainingen(opgeslagenTrainingen);
  }, []);

  return (
    <div>
      <h1>📜 Historie</h1>

      {trainingen.length === 0 ? (
        <p>Geen trainingen gevonden.</p>
      ) : (
        trainingen
          .slice()
          .reverse()
          .map((training, index) => (
            <div
              key={index}
              style={{
                border: "1px solid #ccc",
                padding: "15px",
                marginBottom: "20px",
                borderRadius: "10px",
                backgroundColor: "white",
              }}
            >
              <h3>{training.training}</h3>

              <p>
                <strong>Datum:</strong>{" "}
                {new Date(
                  training.datum
                ).toLocaleString("nl-NL")}
              </p>

              {Object.entries(
                training.oefeningen
              ).map(([oefening, sets]) => (
                <div
                  key={oefening}
                  style={{
                    marginBottom: "15px",
                  }}
                >
                  <strong>{oefening}</strong>

                  {Object.entries(sets).map(
                    ([setNr, setData]) => (
                      <div key={setNr}>
                        Set {setNr}:{" "}
                        {setData.gewicht} kg ×{" "}
                        {setData.reps}
                      </div>
                    )
                  )}
                </div>
              ))}

              {training.cardio && (
                <div
                  style={{
                    marginTop: "20px",
                    padding: "15px",
                    borderTop:
                      "1px solid #ddd",
                  }}
                >
                  <h4>🏃 Cardio</h4>

                  <div>
                    <strong>Type:</strong>{" "}
                    {training.cardio.type}
                  </div>

                  {training.cardio.tijd && (
                    <div>
                      <strong>Tijd:</strong>{" "}
                      {training.cardio.tijd} min
                    </div>
                  )}

                  {training.cardio.afstand && (
                    <div>
                      <strong>Afstand:</strong>{" "}
                      {training.cardio.afstand} km
                    </div>
                  )}

                  {training.cardio.snelheid && (
                    <div>
                      <strong>Snelheid:</strong>{" "}
                      {training.cardio.snelheid}
                      {" "}km/u
                    </div>
                  )}

                  {training.cardio.helling && (
                    <div>
                      <strong>Helling:</strong>{" "}
                      {training.cardio.helling}
                      {" "}%
                    </div>
                  )}

                  {training.cardio.niveau && (
                    <div>
                      <strong>Niveau:</strong>{" "}
                      {training.cardio.niveau}
                    </div>
                  )}

                  {training.cardio.weerstand && (
                    <div>
                      <strong>Weerstand:</strong>{" "}
                      {training.cardio.weerstand}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
      )}
    </div>
  );
}

export default Historie;