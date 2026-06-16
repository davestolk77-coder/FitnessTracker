import { useEffect, useState } from "react";
import { theme } from "../styles/theme";

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
      Object.keys(
        training.oefeningen || {}
      ).forEach((oefening) => {
        uniekeOefeningen.add(oefening);
      });
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
        training.oefeningen?.[
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
      <h1 style={theme.title}>
        💪 Krachtontwikkeling
      </h1>

      <div style={theme.card}>
        <select
          value={gekozenOefening}
          onChange={(e) =>
            setGekozenOefening(
              e.target.value
            )
          }
          style={{
            ...theme.input,
            width: "100%",
            marginBottom: "20px",
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
          <p
            style={{
              color:
                theme.colors.text,
            }}
          >
            Geen gegevens gevonden.
          </p>
        ) : (
          <div
            style={{
              width: "100%",
              height: 350,
            }}
          >
            <ResponsiveContainer>
              <LineChart data={data}>
                <CartesianGrid
                  stroke="#4b5563"
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="training"
                  stroke="#d1d5db"
                />

                <YAxis
                  stroke="#d1d5db"
                />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="gewicht"
                  stroke="#22c55e"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default KrachtGrafiek;