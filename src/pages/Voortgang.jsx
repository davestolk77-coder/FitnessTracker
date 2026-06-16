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

function Voortgang() {
  const [metingen, setMetingen] = useState([]);

  useEffect(() => {
    const historie =
      JSON.parse(
        localStorage.getItem("gewichtHistorie")
      ) || [];

    const grafiekData = historie.map(
      (meting) => ({
        datum: new Date(
          meting.datum
        ).toLocaleDateString("nl-NL"),
        gewicht: meting.gewicht,
      })
    );

    setMetingen(grafiekData);
  }, []);

  return (
    <div>
      <h1 style={theme.title}>
        📈 Voortgang
      </h1>

      {metingen.length === 0 ? (
        <div style={theme.card}>
          <p
            style={{
              color: theme.colors.text,
              margin: 0,
            }}
          >
            Nog geen metingen gevonden.
          </p>
        </div>
      ) : (
        <>
          <div style={theme.card}>
            <div
              style={{
                width: "100%",
                height: 350,
              }}
            >
              <ResponsiveContainer>
                <LineChart data={metingen}>
                  <CartesianGrid
                    stroke="#4b5563"
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="datum"
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
          </div>

          <div style={theme.card}>
            <h2
              style={{
                color:
                  theme.colors.primary,
                textAlign: "center",
                margin: 0,
              }}
            >
              ⚖️ Laatste gewicht
            </h2>

            <div
              style={{
                color:
                  theme.colors.text,
                fontSize: "36px",
                fontWeight: "bold",
                textAlign: "center",
                marginTop: "15px",
              }}
            >
              {
                metingen[
                  metingen.length - 1
                ].gewicht
              }{" "}
              kg
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Voortgang;