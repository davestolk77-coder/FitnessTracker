const MOBIELE_USER_AGENT = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;

export function isIOSOfIPadOS(navigatorLike = globalThis.navigator) {
  if (!navigatorLike) return false;

  const userAgent = navigatorLike.userAgent || "";
  const iOSUserAgent = /iPhone|iPad|iPod/i.test(userAgent);
  const iPadOSAlsMac = navigatorLike.platform === "MacIntel" && navigatorLike.maxTouchPoints > 1;
  return iOSUserAgent || iPadOSAlsMac;
}

export function isMobieleBrowser(navigatorLike = globalThis.navigator) {
  if (!navigatorLike) return false;
  return navigatorLike.userAgentData?.mobile === true
    || isIOSOfIPadOS(navigatorLike)
    || MOBIELE_USER_AGENT.test(navigatorLike.userAgent || "");
}

export function kiesGoogleLoginMethode(navigatorLike = globalThis.navigator) {
  return isMobieleBrowser(navigatorLike) ? "redirect" : "popup";
}

export function maakEenmaligeAsyncTaak(taak) {
  let resultaat;
  return () => {
    if (!resultaat) resultaat = Promise.resolve().then(taak);
    return resultaat;
  };
}

export function wachtOpAuthInitialisatie(redirectAfhandeling, eersteAuthState) {
  return Promise.all([redirectAfhandeling, eersteAuthState]);
}

export function firebaseAuthFoutcode(error) {
  return typeof error?.code === "string" && error.code ? error.code : "auth/unknown";
}

export function voegFirebaseFoutcodeToe(bericht, error) {
  return `${bericht} (${firebaseAuthFoutcode(error)})`;
}

export function maakAuthDiagnose(error, { origin = "onbekend", authDomain = "onbekend", methode = "onbekend", fase = "onbekend" } = {}) {
  return {
    fase,
    methode,
    code: firebaseAuthFoutcode(error),
    message: error?.message || "Onbekende Firebase Auth-fout",
    customData: error?.customData || null,
    origin,
    authDomain,
  };
}
