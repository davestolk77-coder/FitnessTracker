import { createContext, useContext } from "react";

export const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast moet binnen ToastProvider worden gebruikt.");
  return context;
}
