import { useState } from "react";

function CardioForm({ onCardioChange }) {
  const [type, setType] = useState("Loopband");
  const [gegevens, setGegevens] = useState({});

  const wijzigVeld = (veld, waarde) => {
    const nieuweGegevens = {
      ...gegevens,
      [veld]: waarde,
    };

    setGegevens(nieuweGegevens);

    onCardioChange({
      type,
      ...nieuweGegevens,
    });
  };

  const wijzigType = (nieuwType) => {
    setType(nieuwType);

    setGegevens({});

    onCardioChange({
      type: nieuwType,
    });
  };

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "16px",
        padding: "20px",
        marginTop: "20px",
        backgroundColor: "#f9f9f9",
      }}
    >
      <h3>🏃 Cardio</h3>

      <label>Type</label>
      <br />

      <select
        value={type}
        onChange={(e) =>
          wijzigType(e.target.value)
        }
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "15px",
        }}
      >
        <option>Loopband</option>
        <option>Crosstrainer</option>
        <option>Fiets</option>
      </select>

      <label>Tijd (minuten)</label>
      <br />

      <input
        type="number"
        onChange={(e) =>
          wijzigVeld("tijd", e.target.value)
        }
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "15px",
        }}
      />

      {type === "Loopband" && (
        <>
          <label>Afstand (km)</label>
          <br />

          <input
            type="number"
            step="0.1"
            onChange={(e) =>
              wijzigVeld(
                "afstand",
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "15px",
            }}
          />

          <label>Snelheid (km/u)</label>
          <br />

          <input
            type="number"
            step="0.1"
            onChange={(e) =>
              wijzigVeld(
                "snelheid",
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "15px",
            }}
          />

          <label>Helling (%)</label>
          <br />

          <input
            type="number"
            onChange={(e) =>
              wijzigVeld(
                "helling",
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding: "10px",
            }}
          />
        </>
      )}

      {type === "Crosstrainer" && (
        <>
          <label>Niveau</label>
          <br />

          <input
            type="number"
            onChange={(e) =>
              wijzigVeld(
                "niveau",
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding: "10px",
            }}
          />
        </>
      )}

      {type === "Fiets" && (
        <>
          <label>Afstand (km)</label>
          <br />

          <input
            type="number"
            step="0.1"
            onChange={(e) =>
              wijzigVeld(
                "afstand",
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "15px",
            }}
          />

          <label>Weerstand</label>
          <br />

          <input
            type="number"
            onChange={(e) =>
              wijzigVeld(
                "weerstand",
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding: "10px",
            }}
          />
        </>
      )}
    </div>
  );
}

export default CardioForm;