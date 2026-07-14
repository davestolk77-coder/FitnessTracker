import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { auth, firebaseConfig, googleProvider } from "../firebase/firebase";
import { useToast } from "../utils/toastContext";
import { AuthContext } from "./authContext";
import {
  kiesGoogleLoginMethode,
  maakAuthDiagnose,
  maakEenmaligeAsyncTaak,
  voegFirebaseFoutcodeToe,
  wachtOpAuthInitialisatie,
} from "./authStrategy";

const GEANNULEERDE_POPUP_CODES = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
]);

function foutmeldingVoor(error) {
  let bericht;
  switch (error?.code) {
    case "auth/unauthorized-domain":
      bericht = "Inloggen is voor dit domein nog niet toegestaan in Firebase.";
      break;
    case "auth/operation-not-allowed":
      bericht = "Google-inloggen is nog niet ingeschakeld in Firebase.";
      break;
    case "auth/operation-not-supported-in-this-environment":
      bericht = "Deze browser kan de huidige Google-loginmethode niet starten.";
      break;
    case "auth/network-request-failed":
      bericht = "Inloggen lukt niet door een netwerkprobleem. Probeer het opnieuw.";
      break;
    case "auth/account-exists-with-different-credential":
      bericht = "Voor dit e-mailadres bestaat al een account met een andere inlogmethode.";
      break;
    default:
      bericht = "Inloggen met Google is niet gelukt. Probeer het opnieuw.";
  }
  return voegFirebaseFoutcodeToe(bericht, error);
}

function logAuthFout(fase, error, methode) {
  if (!import.meta.env.DEV) return;
  console.error("[Firebase Auth]", maakAuthDiagnose(error, {
    fase,
    methode,
    origin: globalThis.location?.origin || "onbekend",
    authDomain: firebaseConfig.authDomain,
  }));
}

const bereidAuthenticatieVoor = maakEenmaligeAsyncTaak(async () => {
  let persistentieFout = null;
  let redirectFout = null;
  let redirectResultaat = null;

  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    persistentieFout = error;
  }

  try {
    redirectResultaat = await getRedirectResult(auth);
  } catch (error) {
    redirectFout = error;
    logAuthFout("redirect-resultaat", error, "redirect");
  }

  return { persistentieFout, redirectFout, redirectResultaat };
});

export function AuthProvider({ children }) {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [actieBezig, setActieBezig] = useState(false);
  const loginActieBezig = useRef(false);

  useEffect(() => {
    let actief = true;
    let eersteAuthStateAfgehandeld = false;
    let laatsteUser = null;
    let resolveEersteAuthState;
    let rejectEersteAuthState;
    const eersteAuthState = new Promise((resolve, reject) => {
      resolveEersteAuthState = resolve;
      rejectEersteAuthState = reject;
    });

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        laatsteUser = user;
        resolveEersteAuthState();
        if (actief && eersteAuthStateAfgehandeld) setCurrentUser(user);
      },
      (error) => {
        if (!eersteAuthStateAfgehandeld) {
          rejectEersteAuthState(error);
          return;
        }
        if (!actief) return;
        const bericht = foutmeldingVoor(error);
        setAuthError(bericht);
        showToast(bericht, "error");
      },
    );

    wachtOpAuthInitialisatie(bereidAuthenticatieVoor(), eersteAuthState)
      .then(([{ persistentieFout, redirectFout, redirectResultaat }]) => {
        if (!actief) return;

        if (persistentieFout) {
          const bericht = "Je kunt inloggen, maar de sessie kan mogelijk niet op dit apparaat worden onthouden.";
          setAuthError(bericht);
          showToast(bericht, "error");
        }

        if (redirectFout && !GEANNULEERDE_POPUP_CODES.has(redirectFout.code)) {
          const bericht = foutmeldingVoor(redirectFout);
          setAuthError(bericht);
          showToast(bericht, "error");
        } else if (redirectResultaat?.user) {
          setAuthError("");
          showToast("Ingelogd met Google", "success");
        }

        eersteAuthStateAfgehandeld = true;
        setCurrentUser(laatsteUser);
        setLoading(false);
      })
      .catch((error) => {
        if (!actief) return;
        const bericht = foutmeldingVoor(error);
        setAuthError(bericht);
        setLoading(false);
        showToast(bericht, "error");
      });

    return () => {
      actief = false;
      unsubscribe();
    };
  }, [showToast]);

  const signInWithGoogle = useCallback(async () => {
    if (loginActieBezig.current) return;
    loginActieBezig.current = true;
    setActieBezig(true);
    setAuthError("");

    const methode = kiesGoogleLoginMethode();
    try {
      await setPersistence(auth, browserLocalPersistence);

      if (methode === "redirect") {
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      try {
        await signInWithPopup(auth, googleProvider);
      } catch (error) {
        if (error?.code === "auth/popup-blocked") {
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        throw error;
      }
    } catch (error) {
      if (GEANNULEERDE_POPUP_CODES.has(error?.code)) return;
      logAuthFout("login-start", error, methode);
      const bericht = foutmeldingVoor(error);
      setAuthError(bericht);
      showToast(bericht, "error");
    } finally {
      loginActieBezig.current = false;
      setActieBezig(false);
    }
  }, [showToast]);

  const signOutUser = useCallback(async () => {
    setActieBezig(true);
    setAuthError("");
    try {
      await signOut(auth);
      showToast("Uitgelogd", "success");
    } catch {
      const bericht = "Uitloggen is niet gelukt. Probeer het opnieuw.";
      setAuthError(bericht);
      showToast(bericht, "error");
    } finally {
      setActieBezig(false);
    }
  }, [showToast]);

  const waarde = useMemo(() => ({
    currentUser,
    loading,
    signInWithGoogle,
    signOutUser,
    authError,
    actieBezig,
  }), [currentUser, loading, signInWithGoogle, signOutUser, authError, actieBezig]);

  return <AuthContext.Provider value={waarde}>{children}</AuthContext.Provider>;
}
