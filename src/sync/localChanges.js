const listeners = new Set();

export function meldLokaleWijziging(wijziging) {
  listeners.forEach((listener) => listener(wijziging));
}

export function volgLokaleWijzigingen(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
