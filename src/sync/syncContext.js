import { createContext, useContext } from "react";

export const SyncContext = createContext(null);

export function useCloudSync() {
  const context = useContext(SyncContext);
  if (!context) throw new Error("useCloudSync moet binnen SyncProvider worden gebruikt.");
  return context;
}
