function sessieId(sessie) {
  return String(sessie?.sessionId || sessie?.trainingId || "");
}

export function moetCloudActieveTrainingToepassen(lokaal, cloud, { cloudIsNieuwer = false } = {}) {
  if (!cloud) return false;
  if (!lokaal) return true;
  if (sessieId(lokaal) !== sessieId(cloud)) return cloudIsNieuwer;
  return Number(cloud.syncGeneration || 0) > Number(lokaal.syncGeneration || 0);
}
