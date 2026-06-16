import { useEffect, useState } from "react";
import { theme } from "../styles/theme";

function Records() {
  const [records, setRecords] = useState({});

  useEffect(() => {
    const historie =
      JSON.parse(
        localStorage.getItem("trainingHistorie")
      ) || [];

    const nieuweRecords = {};

    historie.forEach((training) => {
      Object.entries(
        training.oefeningen || {}
      ).forEach(([oefening, sets]) => {
        Object.values(sets || {}).forEach(
          (setData) => {
            const gewicht = Number(
              setData.gewicht || 0
            );

            if (
              !nieuweRecords[oefening] ||
              gewicht > nieuweRecords[oefening]
            ) {
              nieuweRecords[oefening] = gewicht;
            }
          }
        );
      });
    });

    setRecords(nieuweRecords);
  }, []);

  return (
    <div>
      <h1 style={theme.title}>
        🏆 Persoonlijke Records
      </h1>

      {Object.keys(records).length === 0 ? (
        <div style={theme.card}>
          <p
            style={{
              color: theme.colors.text,
              margin: 0,
            }}
          >
            Nog geen records gevonden.
          </p>
        </div>
      ) : (
        Object.entries(records)
          .sort((a, b) =>
            a[0].localeCompare(b[0])
          )
          .map(([oefening, gewicht]) => (
            <div
              key={oefening}
              style={theme.card}
            >
              <div
                style={{
                  color:
                    theme.colors.text,
                  fontSize: "18px",
                  fontWeight: "bold",
                  marginBottom: "10px",
                }}
              >
                {oefening}
              </div>

              <div
                style={{
                  color:
                    theme.colors.primary,
                  fontSize: "22px",
                  fontWeight: "bold",
                }}
              >
                🏆 {gewicht} kg
              </div>
            </div>
          ))
      )}
    </div>
  );
}

export default Records;