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
      <h1>📈 Voortgang</h1>

      {metingen.length === 0 ? (
        <p>Nog geen metingen gevonden.</p>
      ) : (
        <>
          <div
            style={{
              width: "100%",
              height: 300,
            }}
          >
            <ResponsiveContainer>
              <LineChart data={metingen}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="datum" />

                <YAxis />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="gewicht"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h2>
            Laatste gewicht:
            {" "}
            {
              metingen[
                metingen.length - 1
              ].gewicht
            }
            {" "}kg
          </h2>
        </>
      )}
    </div>
  );
}

export default Voortgang;