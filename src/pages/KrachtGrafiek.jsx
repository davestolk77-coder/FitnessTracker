import { useEffect, useState } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function KrachtGrafiek() {
  const [data, setData] = useState([]);
  const [oefeningen, setOefeningen] = useState([]);
  const [gekozenOefening, setGekozenOefening] =
    useState("");

  useEffect(() => {
    const historie =
      JSON.parse(
        localStorage.getItem("trainingHistorie")
      ) || [];

    const uniekeOefeningen = new Set();

    historie.forEach((training) => {
      Object.keys(training.oefeningen).forEach(
        (oefening) => {
          uniekeOefeningen.add(oefening);
        }
      );
    });

    const lijst =
      Array.from(uniekeOefeningen);

    setOefeningen(lijst);

    if (lijst.length > 0) {
      setGekozenOefening(lijst[0]);
    }
  }, []);

  useEffect(() => {
    if (!gekozenOefening) return;

    const historie =
      JSON.parse(
        localStorage.getItem("trainingHistorie")
      ) || [];

    const grafiekData = [];

    historie.forEach((training, index) => {
      const oefening =
        training.oefeningen[
          gekozenOefening
        ];

      if (oefening) {
        let hoogsteGewicht = 0;

        Object.values(oefening).forEach(
          (setData) => {
            const gewicht = Number(
              setData.gewicht || 0
            );

            if (gewicht > hoogsteGewicht) {
              hoogsteGewicht = gewicht;
            }
          }
        );

        grafiekData.push({
          training: index + 1,
          gewicht: hoogsteGewicht,
        });
      }
    });

    setData(grafiekData);
  }, [gekozenOefening]);

  return (
    <div>
      <h1>💪 Krachtontwikkeling</h1>

      <select
        value={gekozenOefening}
        onChange={(e) =>
          setGekozenOefening(
            e.target.value
          )
        }
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "20px",
          fontSize: "16px",
        }}
      >
        {oefeningen.map((oefening) => (
          <option
            key={oefening}
            value={oefening}
          >
            {oefening}
          </option>
        ))}
      </select>

      {data.length === 0 ? (
        <p>Geen gegevens gevonden.</p>
      ) : (
        <div
          style={{
            width: "100%",
            height: 300,
          }}
        >
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis dataKey="training" />

              <YAxis />

              <Tooltip />

              <Line
                type="monotone"
                dataKey="gewicht"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default KrachtGrafiek;