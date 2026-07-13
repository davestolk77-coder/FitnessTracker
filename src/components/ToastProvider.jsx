import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToastContext } from "../utils/toastContext";
const standaardDuur = { success: 1100, info: 1400, error: 3600 };

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const teller = useRef(0);

  const showToast = useCallback((bericht, type = "info", opties = {}) => {
    teller.current += 1;
    setToast({ id: teller.current, bericht, type, duur: opties.persistent ? null : (opties.duration ?? standaardDuur[type] ?? standaardDuur.info) });
  }, []);

  const verbergToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast?.duur) return undefined;
    const timer = setTimeout(verbergToast, toast.duur);
    return () => clearTimeout(timer);
  }, [toast, verbergToast]);

  const contextWaarde = useMemo(() => ({ showToast, hideToast: verbergToast }), [showToast, verbergToast]);

  return (
    <ToastContext.Provider value={contextWaarde}>
      {children}
      <div className="toast-region" aria-live={toast?.type === "error" ? "assertive" : "polite"} aria-atomic="true">
        {toast && <div key={toast.id} className={`toast toast--${toast.type}`} role={toast.type === "error" ? "alert" : "status"}>{toast.bericht}</div>}
      </div>
    </ToastContext.Provider>
  );
}
