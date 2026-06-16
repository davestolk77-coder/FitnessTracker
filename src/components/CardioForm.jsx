import { useState } from "react";
import { theme } from "../styles/theme";

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
    <div style={theme.card}>
      <h2
        style={{
          color: theme.colors.primary,
          marginTop: 0,
        }}
      >
        🏃 Cardio
      </h2>

      <label
        style={{
          color: theme.colors.text,
        }}
      >
        Type
      </label>

      <select
        value={type}
        onChange={(e) =>
          wijzigType(e.target.value)
        }
        style={{
          ...theme.input,
          width: "100%",
          marginTop: "5px",
          marginBottom: "15px",
        }}
      >
        <option>Loopband</option>
        <option>Crosstrainer</option>
        <option>Fiets</option>
      </select>

      <label
        style={{
          color: theme.colors.text,
        }}
      >
        Tijd (minuten)
      </label>

      <input
        type="number"
        onChange={(e) =>
          wijzigVeld("tijd", e.target.value)
        }
        style={{
          ...theme.input,
          width: "100%",
          marginTop: "5px",
          marginBottom: "15px",
        }}
      />

      {type === "Loopband" && (
        <>
          <label
            style={{
              color: theme.colors.text,
            }}
          >
            Afstand (km)
          </label>

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
              ...theme.input,
              width: "100%",
              marginTop: "5px",
              marginBottom: "15px",
            }}
          />

          <label
            style={{
              color: theme.colors.text,
            }}
          >
            Snelheid (km/u)
          </label>

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
              ...theme.input,
              width: "100%",
              marginTop: "5px",
              marginBottom: "15px",
            }}
          />

          <label
            style={{
              color: theme.colors.text,
            }}
          >
            Helling (%)
          </label>

          <input
            type="number"
            onChange={(e) =>
              wijzigVeld(
                "helling",
                e.target.value
              )
            }
            style={{
              ...theme.input,
              width: "100%",
              marginTop: "5px",
            }}
          />
        </>
      )}

      {type === "Crosstrainer" && (
        <>
          <label
            style={{
              color: theme.colors.text,
            }}
          >
            Niveau
          </label>

          <input
            type="number"
            onChange={(e) =>
              wijzigVeld(
                "niveau",
                e.target.value
              )
            }
            style={{
              ...theme.input,
              width: "100%",
              marginTop: "5px",
            }}
          />
        </>
      )}

      {type === "Fiets" && (
        <>
          <label
            style={{
              color: theme.colors.text,
            }}
          >
            Afstand (km)
          </label>

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
              ...theme.input,
              width: "100%",
              marginTop: "5px",
              marginBottom: "15px",
            }}
          />

          <label
            style={{
              color: theme.colors.text,
            }}
          >
            Weerstand
          </label>

          <input
            type="number"
            onChange={(e) =>
              wijzigVeld(
                "weerstand",
                e.target.value
              )
            }
            style={{
              ...theme.input,
              width: "100%",
              marginTop: "5px",
            }}
          />
        </>
      )}
    </div>
  );
}

export default CardioForm;