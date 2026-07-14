export const RUSTTIMER_GELUID_KEY = "fitnessTrackerRusttimerGeluid";

let audioContext = null;

export function leesRusttimerGeluidInstelling(opslag = globalThis.localStorage) {
  return opslag?.getItem(RUSTTIMER_GELUID_KEY) !== "false";
}

export function bewaarRusttimerGeluidInstelling(ingeschakeld, opslag = globalThis.localStorage) {
  opslag?.setItem(RUSTTIMER_GELUID_KEY, String(Boolean(ingeschakeld)));
  return Boolean(ingeschakeld);
}

function verkrijgAudioContext() {
  const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContext) return null;
  if (!audioContext || audioContext.state === "closed") audioContext = new AudioContext();
  return audioContext;
}

export async function ontgrendelRusttimerAudio() {
  try {
    const context = verkrijgAudioContext();
    if (!context) return false;
    if (context.state === "suspended") await context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, context.currentTime);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.01);
    return true;
  } catch { return false; }
}

export function speelRusttimerSignaal() {
  try {
    const context = verkrijgAudioContext();
    if (!context || context.state !== "running") return false;
    [0, 0.18].forEach((vertraging) => {
      const start = context.currentTime + vertraging;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.13);
    });
    return true;
  } catch { return false; }
}

export function maakRusttimerAlarmBewaker(speelSignaal) {
  let gewapend = false;
  return {
    start() { gewapend = true; },
    annuleer() { gewapend = false; },
    tik(vorigeWaarde, geluidAan = true) {
      if (vorigeWaarde !== 1 || !gewapend) return false;
      gewapend = false;
      if (geluidAan) speelSignaal?.();
      return true;
    },
  };
}

// Apple Watch-feedback hoort later via Web Push: notificatietoestemming,
// PushSubscription en een server-side push op het eindtijdstip. iOS kan die
// melding vervolgens naar een gekoppelde Apple Watch doorsturen.
