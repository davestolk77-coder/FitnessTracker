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
import { auth, googleProvider } from "../firebase/firebase";
import { useToast } from "../utils/toastContext";
import { AuthContext } from "./authContext";
import {
  kiesGoogleLoginMethode,
  maakEenmaligeAsyncTaak,
  wachtOpAuthInitialisatie,
} from "./authStrategy";

const GEANNULEERDE_POPUP_CODES = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
]);

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

    try {
      await setPersistence(auth, browserLocalPersistence);

      if (kiesGoogleLoginMethode() === "redirect") {
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
