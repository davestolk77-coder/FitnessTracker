import { useCallback, useEffect, useMemo, useState } from "react";
import {
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase/firebase";
import { useToast } from "../utils/toastContext";
import { AuthContext } from "./authContext";

const GEANNULEERDE_POPUP_CODES = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
]);

let authVoorbereiding;

function foutmeldingVoor(error) {
  switch (error?.code) {
    case "auth/unauthorized-domain":
      return "Inloggen is voor dit domein nog niet toegestaan in Firebase.";
    case "auth/operation-not-allowed":
      return "Google-inloggen is nog niet ingeschakeld in Firebase.";
    case "auth/network-request-failed":
      return "Inloggen lukt niet door een netwerkprobleem. Probeer het opnieuw.";
    case "auth/account-exists-with-different-credential":
      return "Voor dit e-mailadres bestaat al een account met een andere inlogmethode.";
    default:
      return "Inloggen met Google is niet gelukt. Probeer het opnieuw.";
  }
}

function bereidAuthenticatieVoor() {
  if (!authVoorbereiding) {
    authVoorbereiding = (async () => {
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
      }

      return { persistentieFout, redirectFout, redirectResultaat };
    })();
  }

  return authVoorbereiding;
}

function gebruiktRedirectLogin() {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const kleinScherm = window.matchMedia("(max-width: 768px)").matches;
  const grovePointer = window.matchMedia("(pointer: coarse)").matches;
  const heeftTouch = window.navigator.maxTouchPoints > 0;
  return standalone || (kleinScherm && grovePointer && heeftTouch);
}

export function AuthProvider({ children }) {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [actieBezig, setActieBezig] = useState(false);

  useEffect(() => {
    let actief = true;
    let unsubscribe = () => {};

    bereidAuthenticatieVoor()
      .then(({ persistentieFout, redirectFout, redirectResultaat }) => {
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

        unsubscribe = onAuthStateChanged(
          auth,
          (user) => {
            if (!actief) return;
            setCurrentUser(user);
            setLoading(false);
          },
          (error) => {
            if (!actief) return;
            const bericht = foutmeldingVoor(error);
            setAuthError(bericht);
            setLoading(false);
            showToast(bericht, "error");
          },
        );
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
    setActieBezig(true);
    setAuthError("");

    try {
      await setPersistence(auth, browserLocalPersistence);

      if (gebruiktRedirectLogin()) {
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
      const bericht = foutmeldingVoor(error);
      setAuthError(bericht);
      showToast(bericht, "error");
    } finally {
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
