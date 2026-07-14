import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/authContext";
import { Card, PrimaryButton } from "../components/ui";
import { useToast } from "../utils/toastContext";
import {
  startCloudListeners,
  syncActieveTraining,
  syncAlleLokaleData,
  syncHistorieTraining,
  syncInstellingen,
  syncProfiel,
  verwijderCloudActieveTraining,
  verwijderCloudHistorieTraining,
  voerVeiligeCloudMigratieUit,
  voltooiTrainingMetCloudVerificatie,
} from "./cloudSync";
import { bindLokaleDataAanUid, controleerLokaleDataEigenaar, maakCloudMigratieBackup, normaliseerLokaleSyncDataEenmalig } from "./localCache";
import { volgLokaleWijzigingen } from "./localChanges";
import { getDeviceId } from "./syncIdentity";
import { SyncContext } from "./syncContext";

const STATUS_LABELS = {
  idle: "Alles gesynchroniseerd",
  syncing: "Synchroniseren...",
  offline: "Offline – wijzigingen lokaal bewaard",
  pending: "Wacht op synchronisatie",
  error: "Synchronisatiefout",
  migrating: "Cloudmigratie bezig",
  conflict: "Accountcontrole nodig",
};

export function SyncProvider({ children }) {
  console.log("SyncProvider gestart");
  const { currentUser, signOutUser } = useAuth();
  const uid = currentUser?.uid;
  const { showToast } = useToast();
  const [status, setStatus] = useState("idle");
  const [ready, setReady] = useState(true);
  const [blockingError, setBlockingError] = useState("");
  const activeTimer = useRef(null);
  const pendingRef = useRef(false);
  const gereedVoorUidRef = useRef(null);

  const voerUit = useCallback(async (actie, { stil = false } = {}) => {
    if (!uid) return null;
    if (!navigator.onLine) {
      pendingRef.current = true;
      setStatus("offline");
      return null;
    }
    setStatus("syncing");
    try {
      const resultaat = await actie();
      pendingRef.current = false;
      setStatus("idle");
      return resultaat;
    } catch (error) {
      pendingRef.current = true;
      setStatus(navigator.onLine ? "error" : "offline");
      if (!stil && navigator.onLine) showToast("Synchroniseren is niet gelukt. De lokale gegevens blijven veilig bewaard.", "error");
      throw error;
    }
  }, [uid, showToast]);

  useEffect(() => {
    if (!uid) return undefined;

    let actief = true;
    let stopListeners = () => {};
    let stopWijzigingen = () => {};
    const initialiseer = async () => {
      const isEersteInitialisatieVoorUid = gereedVoorUidRef.current !== uid;
      if (isEersteInitialisatieVoorUid) setReady(false);
      setBlockingError("");
      try {
        normaliseerLokaleSyncDataEenmalig(uid);
        controleerLokaleDataEigenaar(uid);
        maakCloudMigratieBackup(uid);
        bindLokaleDataAanUid(uid);
        getDeviceId();
        const eersteMigratie = localStorage.getItem(`fitnessCloudMigrationVersion:${uid}`) === null;
        setStatus(eersteMigratie ? "migrating" : "syncing");
        const resultaat = eersteMigratie
          ? await voerVeiligeCloudMigratieUit(uid, {
              onConflict: (bericht) => showToast(bericht, "info", { duration: 5000 }),
            })
          : null;
        if (!actief) return;
        stopListeners();
        stopListeners = startCloudListeners(uid, {
          onData: () => setStatus("idle"),
          onError: () => setStatus(navigator.onLine ? "error" : "offline"),
        });
        gereedVoorUidRef.current = uid;
        setReady(true);
        setStatus("idle");
        if (resultaat) showToast(`Cloudmigratie afgerond: ${resultaat.trainingen} training(en) veilig gesynchroniseerd`, "success");
      } catch (error) {
        if (!actief) return;
        if (error?.code === "sync/account-conflict") {
          setBlockingError(error.message);
          setStatus("conflict");
          setReady(false);
          return;
        }
        pendingRef.current = true;
        setStatus(navigator.onLine ? "error" : "offline");
        setReady(true);
      }
    };

    const verwerkWijziging = (wijziging) => {
      if (!wijziging) return;
      const uitvoeren = () => {
        switch (wijziging.type) {
          case "profile-upsert": return syncProfiel(uid);
          case "settings-upsert": return syncInstellingen(uid, wijziging.data);
          case "active-upsert": return syncActieveTraining(uid, wijziging.data);
          case "active-delete": return verwijderCloudActieveTraining(uid, wijziging.data);
          case "history-upsert": return syncHistorieTraining(uid, wijziging.data);
          case "history-delete": return verwijderCloudHistorieTraining(uid, wijziging.data.trainingId);
          case "full-sync": return syncAlleLokaleData(uid);
          default: return Promise.resolve();
        }
      };

      if (wijziging.type === "active-upsert" && !wijziging.urgent) {
        clearTimeout(activeTimer.current);
        activeTimer.current = setTimeout(() => voerUit(uitvoeren, { stil: true }).catch(() => {}), 1500);
        setStatus(navigator.onLine ? "pending" : "offline");
        return;
      }
      voerUit(uitvoeren, { stil: wijziging.type === "active-upsert" }).catch(() => {});
    };

    stopWijzigingen = volgLokaleWijzigingen(verwerkWijziging);
    const bijOnline = () => {
      pendingRef.current = true;
      voerUit(() => syncAlleLokaleData(uid), { stil: true }).catch(() => {});
    };
    const bijOffline = () => setStatus("offline");
    window.addEventListener("online", bijOnline);
    window.addEventListener("offline", bijOffline);
    initialiseer();

    return () => {
      actief = false;
      clearTimeout(activeTimer.current);
      stopListeners();
      stopWijzigingen();
      window.removeEventListener("online", bijOnline);
      window.removeEventListener("offline", bijOffline);
    };
  }, [uid, showToast, voerUit]);

  const voltooiTraining = useCallback(async (training, sessie) => {
    const resultaat = await voerUit(() => voltooiTrainingMetCloudVerificatie(uid, training, sessie));
    if (resultaat !== true) throw new Error("Training wacht nog op cloudsynchronisatie.");
    return true;
  }, [uid, voerUit]);

  const waarde = useMemo(() => ({
    status,
    statusLabel: STATUS_LABELS[status],
    ready,
    voltooiTraining,
  }), [status, ready, voltooiTraining]);

  if (currentUser && blockingError) {
    return (
      <SyncContext.Provider value={waarde}>
        <main className="sync-gate">
          <Card className="sync-gate__card">
            <h1>Accountcontrole nodig</h1>
            <p>{blockingError} Log uit en gebruik het account waaraan deze lokale cache is gekoppeld. Er is niets gewist of samengevoegd.</p>
            <PrimaryButton onClick={signOutUser}>Uitloggen</PrimaryButton>
          </Card>
        </main>
      </SyncContext.Provider>
    );
  }

  if (currentUser && !ready) {
    return (
      <SyncContext.Provider value={waarde}>
        <main className="sync-gate"><Card className="sync-gate__card"><h1>Gegevens herstellen</h1><p>{STATUS_LABELS[status]}</p></Card></main>
      </SyncContext.Provider>
    );
  }

  return <SyncContext.Provider value={waarde}>{children}</SyncContext.Provider>;
}
