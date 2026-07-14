export function maakEenmaligeUitvoerder() {
  let bezig = false;

  return async (actie) => {
    if (bezig) return false;
    bezig = true;
    try {
      await actie();
      return true;
    } finally {
      bezig = false;
    }
  };
}
