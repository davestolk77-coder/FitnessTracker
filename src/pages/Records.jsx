import { useEffect, useState } from "react";

function Records() {
  const [records, setRecords] = useState({});

  useEffect(() => {
    const historie =
      JSON.parse(
        localStorage.getItem("trainingHistorie")
      ) || [];

    const nieuweRecords = {};

    historie.forEach((training) => {
      Object.entries(training.oefeningen).forEach(
        ([oefening, sets]) => {
          Object.values(sets).forEach((setData) => {
            const gewicht = Number(
              setData.gewicht || 0
            );

            if (
              !nieuweRecords[oefening] ||
              gewicht > nieuweRecords[oefening]
            ) {
              nieuweRecords[oefening] = gewicht;
            }
          });
        }
      );
    });

    setRecords(nieuweRecords);
  }, []);

  return (
    <div>
      <h1>🏆 Persoonlijke Records</h1>

      {Object.keys(records).length === 0 ? (
        <p>Nog geen records gevonden.</p>
      ) : (
        Object.entries(records).map(
          ([oefening, gewicht]) => (
            <div
              key={oefening}
              style={{
                border: "1px solid #ccc",
                padding: "15px",
                marginBottom: "10px",
                borderRadius: "10px",
              }}
            >
              <strong>{oefening}</strong>

              <div>
                Beste gewicht: {gewicht} kg
              </div>
            </div>
          )
        )
      )}
    </div>
  );
}

export default Records;