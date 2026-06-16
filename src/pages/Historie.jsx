import { useEffect, useState } from "react";
import { theme } from "../styles/theme";

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
      <h1 style={theme.title}>
        📜 Historie
      </h1>

      {trainingen.length === 0 ? (
        <div style={theme.card}>
          <p
            style={{
              color: theme.colors.text,
              margin: 0,
            }}
          >
            Geen trainingen gevonden.
          </p>
        </div>
      ) : (
        trainingen
          .slice()
          .reverse()
          .map((training, index) => (
            <div
              key={index}
              style={theme.card}
            >
              <h2
                style={{
                  color: theme.colors.primary,
                  marginTop: 0,
                }}
              >
                {training.training}
              </h2>

              <p
                style={{
                  color:
                    theme.colors.textSecondary,
                }}
              >
                📅{" "}
                {new Date(
                  training.datum
                ).toLocaleString("nl-NL")}
              </p>

              {Object.entries(
                training.oefeningen || {}
              ).map(([oefening, sets]) => (
                <div
                  key={oefening}
                  style={{
                    backgroundColor:
                      theme.colors.surface,
                    padding: "12px",
                    borderRadius: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      color:
                        theme.colors.text,
                      fontWeight: "bold",
                      marginBottom: "8px",
                    }}
                  >
                    {oefening}
                  </div>

                  {Object.entries(
                    sets || {}
                  ).map(
                    ([setNr, setData]) => (
                      <div
                        key={setNr}
                        style={{
                          color:
                            theme.colors.textSecondary,
                          marginBottom: "4px",
                        }}
                      >
                        Set {setNr}:{" "}
                        {setData.gewicht} kg ×{" "}
                        {setData.reps}
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          ))
      )}
    </div>
  );
}

export default Historie;