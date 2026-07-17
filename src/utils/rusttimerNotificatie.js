export const RUSTTIMER_NOTIFICATIE_KEY = "fitnessTrackerRusttimerNotificatie";
export const RUSTTIMER_NOTIFICATIE_TITEL = "⏱️ Rusttijd voorbij";
export const RUSTTIMER_NOTIFICATIE_TEKST = "Je kunt beginnen aan je volgende set.";

export function leesRusttimerNotificatieInstelling(opslag = globalThis.localStorage) {
  return opslag?.getItem(RUSTTIMER_NOTIFICATIE_KEY) === "true";
}

export function bewaarRusttimerNotificatieInstelling(ingeschakeld, opslag = globalThis.localStorage) {
  opslag?.setItem(RUSTTIMER_NOTIFICATIE_KEY, String(Boolean(ingeschakeld)));
  return Boolean(ingeschakeld);
}

export function ondersteuntRusttimerNotificaties(notificatieApi = globalThis.Notification) {
  return typeof notificatieApi !== "undefined" && typeof notificatieApi.requestPermission === "function";
}

export async function vraagRusttimerNotificatieToestemming(notificatieApi = globalThis.Notification) {
  if (!ondersteuntRusttimerNotificaties(notificatieApi)) return "unsupported";
  if (notificatieApi.permission === "granted") return "granted";
  if (notificatieApi.permission === "denied") return "denied";
  try {
    return await notificatieApi.requestPermission();
  } catch {
    return "denied";
  }
}

async function toonRusttimerNotificatie() {
  const opties = { body: RUSTTIMER_NOTIFICATIE_TEKST, tag: "fitnessTracker-rusttimer", renotify: false };
  const registratie = await globalThis.navigator?.serviceWorker?.getRegistration?.();
  if (registratie?.showNotification) {
    await registratie.showNotification(RUSTTIMER_NOTIFICATIE_TITEL, opties);
    return;
  }
  new globalThis.Notification(RUSTTIMER_NOTIFICATIE_TITEL, opties);
}

export function maakRusttimerNotificatieBewaker(toonNotificatie = toonRusttimerNotificatie, notificatieApi = globalThis.Notification) {
  let gewapend = false;
  let getoond = false;
  return {
    start() {
      gewapend = true;
      getoond = false;
    },
    annuleer() {
      gewapend = false;
    },
    meld(ingeschakeld = true) {
      if (!gewapend || getoond || !ingeschakeld || notificatieApi?.permission !== "granted") return false;
      gewapend = false;
      getoond = true;
      void Promise.resolve(toonNotificatie()).catch(() => {});
      return true;
    },
  };
}
