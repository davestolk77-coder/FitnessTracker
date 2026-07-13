const DEVICE_ID_KEY = "fitnessDeviceId";

export function getDeviceId() {
  const bestaand = localStorage.getItem(DEVICE_ID_KEY);
  if (bestaand) return bestaand;
  const deviceId = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

export function maakCloudOperatie(entity, actie) {
  return {
    deviceId: getDeviceId(),
    operationId: crypto.randomUUID(),
    entity,
    actie,
  };
}

export function isZelfdeOperation(data, operation) {
  return Boolean(data?.operationId && data.operationId === operation.operationId);
}

function developmentLog(operation, actie = operation.actie) {
  console.debug("[FitnessTracker sync]", {
    deviceId: operation.deviceId,
    operationId: operation.operationId,
    entity: operation.entity,
    actie,
  });
}

export const logCloudOperatie = import.meta.env?.DEV ? developmentLog : () => {};
