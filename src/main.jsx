import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

console.log("main.jsx gestart");

function normaliseerFout(fout, fallbackMessage = "Onbekende fout") {
  if (fout instanceof Error) return fout;
  if (fout && typeof fout === "object") {
    const error = new Error(fout.message || fallbackMessage);
    error.name = fout.name || "Error";
    error.stack = fout.stack || error.stack;
    return error;
  }
  return new Error(typeof fout === "string" ? fout : fallbackMessage);
}

function toonGlobaleFout(fout) {
  const error = normaliseerFout(fout);
  console.error("FitnessTracker kon niet starten", error);
  const overlay = document.createElement("pre");
  overlay.id = "fitness-debug-overlay";
  overlay.style.cssText = "position:fixed;z-index:2147483647;inset:0;margin:0;padding:16px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;color:#fff;background:#7f1d1d;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;";
  overlay.textContent = [
    "FitnessTracker startfout",
    "",
    `Error name: ${error.name || "Error"}`,
    `Error message: ${error.message || "Onbekende fout"}`,
    "Stacktrace:",
    error.stack || "Geen stacktrace beschikbaar",
    "",
    `Browser userAgent: ${navigator.userAgent}`,
    `location.href: ${location.href}`,
  ].join("\n");
  document.body.replaceChildren(overlay);
}

window.onerror = (message, source, lineno, colno, error) => {
  toonGlobaleFout(error || new Error(`${message} (${source || "onbekende bron"}:${lineno || 0}:${colno || 0})`));
  return false;
};

window.onunhandledrejection = (event) => {
  toonGlobaleFout(event.reason || new Error("Onbehandelde Promise-afwijzing"));
};

Promise.all([
  import("./App.jsx"),
  import("./components/ToastProvider.jsx"),
  import("./auth/AuthProvider.jsx"),
  import("./auth/AuthGate.jsx"),
  import("./sync/SyncProvider.jsx"),
]).then(([appModule, toastModule, authModule, authGateModule, syncModule]) => {
  const App = appModule.default;
  const { ToastProvider } = toastModule;
  const { AuthProvider } = authModule;
  const { AuthGate } = authGateModule;
  const { SyncProvider } = syncModule;
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Root-element #root ontbreekt");
  const root = createRoot(rootElement, { onUncaughtError: toonGlobaleFout, onRecoverableError: (error) => console.error("Herstelbare React-fout", error) });
  console.log("React root aangemaakt");
  root.render(
    <StrictMode>
      <ToastProvider>
        <AuthProvider>
          <SyncProvider>
            <AuthGate><App /></AuthGate>
          </SyncProvider>
        </AuthProvider>
      </ToastProvider>
    </StrictMode>,
  );
}).catch(toonGlobaleFout);
