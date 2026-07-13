import { PrimaryButton } from "../components/ui";
import { useAuth } from "./authContext";

export function AuthGate({ children }) {
  const { currentUser, loading, signInWithGoogle, authError, actieBezig } = useAuth();

  if (loading) {
    return (
      <main className="auth-shell auth-shell--loading" aria-busy="true">
        <div className="auth-loading" role="status">
          <span className="auth-spinner" aria-hidden="true" />
          <span>Inlogstatus controleren...</span>
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="auth-shell">
        <section className="card auth-card" aria-labelledby="login-title">
          <img className="auth-logo" src="/icons/icon-192.png" alt="FitnessTracker" width="112" height="112" />
          <div className="auth-card__copy">
            <span className="eyebrow">FitnessTracker</span>
            <h1 id="login-title">Welkom terug</h1>
            <p>Log in om je trainingen veilig te herstellen en automatisch met je Google-account te synchroniseren.</p>
          </div>
          <PrimaryButton className="button--full button--large google-login-button" onClick={signInWithGoogle} disabled={actieBezig}>
            <span className="google-mark" aria-hidden="true">G</span>
            {actieBezig ? "Inloggen openen..." : "Inloggen met Google"}
          </PrimaryButton>
          {authError && <p className="auth-error" role="alert">{authError}</p>}
          <p className="auth-privacy-note">FitnessTracker blijft offline bruikbaar en bewaart wijzigingen eerst lokaal.</p>
        </section>
      </main>
    );
  }

  return children;
}
