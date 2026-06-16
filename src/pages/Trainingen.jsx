import { useState, useEffect } from "react";
import { trainingen } from "../data/trainingen";
import CardioForm from "../components/CardioForm";
import { theme } from "../styles/theme";

function Trainingen() {
  const [training, setTraining] = useState(null);
  const [gegevens, setGegevens] = useState({});
  const [timer, setTimer] = useState(0);
  const [melding, setMelding] = useState(false);
  const [cardio, setCardio] = useState({});

  const haalVorigeSetOp = (oefening, setNummer) => {
    const historie =
      JSON.parse(
        localStorage.getItem("trainingHistorie")
      ) || [];

    for (let i = historie.length - 1; i >= 0; i--) {
      const trainingData = historie[i];

      if (
        trainingData.oefeningen[oefening] &&
        trainingData.oefeningen[oefening][setNummer]
      ) {
        return trainingData.oefeningen[oefening][setNummer];
      }
    }

    return null;
  };

  const gebruikVorigeTraining = (oefening) => {
    const historie =
      JSON.parse(
        localStorage.getItem("trainingHistorie")
      ) || [];

    for (let i = historie.length - 1; i >= 0; i--) {
      const trainingData = historie[i];

      if (trainingData.oefeningen[oefening]) {
        setGegevens((vorige) => ({
          ...vorige,
          [oefening]:
            trainingData.oefeningen[oefening],
        }));

        return;
      }
    }

    alert("Geen eerdere training gevonden.");
  };

  const haalRecordOp = (oefening) => {
    const historie =
      JSON.parse(
        localStorage.getItem("trainingHistorie")
      ) || [];

    let record = 0;

    historie.forEach((training) => {
      if (training.oefeningen[oefening]) {
        Object.values(
          training.oefeningen[oefening]
        ).forEach((setData) => {
          const gewicht = Number(
            setData.gewicht || 0
          );

          if (gewicht > record) {
            record = gewicht;
          }
        });
      }
    });

    return record;
  };

  const wijzigSet = (
    oefening,
    setNummer,
    veld,
    waarde
  ) => {
    setGegevens((vorige) => ({
      ...vorige,

      [oefening]: {
        ...vorige[oefening],

        [setNummer]: {
          ...vorige[oefening]?.[setNummer],

          [veld]: waarde,
        },
      },
    }));
  };

useEffect(() => {
  if (timer <= 0) {
    if (timer === 0) {
     const audio = new Audio("/ping.mp3");

audio.volume = 1;

audio.play().catch((err) => {
  console.log("Geluid geblokkeerd", err);
});

      audio.play().catch(() => {});
      setMelding(true);

setTimeout(() => {
  setMelding(false);
}, 5000);
    }

    return;
  }

  const interval = setInterval(() => {
    setTimer((vorige) => vorige - 1);
  }, 1000);

  return () => clearInterval(interval);
}, [timer]);

  if (!training) {
    return (
      <div>
        <h1 style={theme.title}>
  🏋️ Trainingen
</h1>

        {Object.keys(trainingen).map((naam) => (
          <div key={naam}>
            <button
              onClick={() => setTraining(naam)}
              style={{...theme.button,
              width: "100%",
              marginBottom: "10px",
}}
            >
              {naam}
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
  onClick={() => setTraining(null)}
  style={{
    ...theme.smallButton,
    marginBottom: "20px",
  }}
>
        ← Terug
      </button>

     <h1 style={theme.title}>
  {training}
</h1>

      {melding && (
  <div style={theme.successCard}>
    ✅ Rusttijd voorbij!
  </div>
)}

      {trainingen[training].map((oefening) => (
        <div
          key={oefening}
          style={theme.exerciseCard}
        >
          <h3
  style={{
    color: theme.colors.text,
    marginTop: 0,
  }}
>
  {oefening}
</h3>

          <div
            style={{
              fontSize: "14px",
              marginBottom: "10px",
              fontWeight: "bold",
              color: "#d97706",
            }}
          >
            🏆 Record: {haalRecordOp(oefening)} kg
          </div>

          <div
  style={{
    marginBottom: "15px",
  }}
>
  <button
    onClick={() =>
      gebruikVorigeTraining(oefening)
    }
    style={{
      marginBottom: "10px",
      padding: "8px",
      fontSize: "12px",
      marginRight: "10px",
    }}
  >
    📋 Gebruik vorige training
  </button>

  <br />

  <button
    onClick={() => setTimer(30)}
    style={{
      padding: "8px",
      marginRight: "5px",
    }}
  >
    30s
  </button>

  <button
    onClick={() => setTimer(60)}
    style={{
      padding: "8px",
      marginRight: "5px",
    }}
  >
    60s
  </button>

  <button
    onClick={() => setTimer(90)}
    style={{
      padding: "8px",
      marginRight: "10px",
    }}
  >
    90s
  </button>

  {timer > 0 ? (
    <span
      style={{
        fontSize: "20px",
        fontWeight: "bold",
        color: "#2563eb",
        marginLeft: "10px",
      }}
    >
      ⏱️ {timer}s
    </span>
  ) : (
    <span
      style={{
        color: "green",
        fontWeight: "bold",
        marginLeft: "10px",
      }}
    >
      ✅ Klaar
    </span>
  )}
</div>

          {[1, 2, 3].map((setNummer) => {
            const vorigeSet =
              haalVorigeSetOp(
                oefening,
                setNummer
              );

            return (
              <div key={setNummer}>
                {vorigeSet && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      marginBottom: "5px",
                    }}
                  >
                    Vorige set {setNummer}:{" "}
                    {vorigeSet.gewicht} kg ×{" "}
                    {vorigeSet.reps}
                  </div>
                )}

                <div
                  style={theme.setCard}
                >
                  <div
                    style={{
                      fontWeight: "bold",
                      marginBottom: "8px",
                    }}
                  >
                    Set {setNummer}
                  </div>

                  <div
                    style={{
                      marginBottom: "8px",
                    }}
                  >
                    <label>Kg</label>
                    <br />

                    <input
                      type="number"
                      placeholder="Kg"
                      value={
                        gegevens[oefening]?.[
                          setNummer
                        ]?.gewicht || ""
                      }
                      onChange={(e) =>
                        wijzigSet(
                          oefening,
                          setNummer,
                          "gewicht",
                          e.target.value
                        )
                      }
                      style={{
  ...theme.input,
  width: "100%",
  boxSizing: "border-box",
}}
                    />
                  </div>

                  <div>
                    <label>Reps</label>
                    <br />

                    <input
                      type="number"
                      placeholder="Reps"
                      value={
                        gegevens[oefening]?.[
                          setNummer
                        ]?.reps || ""
                      }
                      onChange={(e) =>
                        wijzigSet(
                          oefening,
                          setNummer,
                          "reps",
                          e.target.value
                        )
                      }
                      style={{
                        width: "100%",
                        padding: "10px",
                        fontSize: "16px",
                        boxSizing:
                          "border-box",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
<CardioForm
  onCardioChange={(data) =>
    setCardio(data)
  }
/>
      <button
        onClick={() => {
        const trainingData = {
  datum: new Date().toISOString(),
  training: training,
  oefeningen: gegevens,
  cardio: cardio,
};

          const bestaandeTrainingen =
            JSON.parse(
              localStorage.getItem(
                "trainingHistorie"
              )
            ) || [];

          bestaandeTrainingen.push(
            trainingData
          );

          localStorage.setItem(
            "trainingHistorie",
            JSON.stringify(
              bestaandeTrainingen
            )
          );

          alert("Training opgeslagen!");
        }}
        style={{
  ...theme.button,
  width: "100%",
  marginTop: "20px",
}}
      >
        Training Opslaan
      </button>
    </div>
  );
}

export default Trainingen;