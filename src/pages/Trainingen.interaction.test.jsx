// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../auth/authContext";
import { ToastContext } from "../utils/toastContext";
import { SyncProvider } from "../sync/SyncProvider";
import Trainingen from "./Trainingen";
import { TRAINING_A } from "../data/trainingen";

vi.mock("../sync/cloudSync", () => ({
  startCloudListeners: vi.fn(() => () => {}),
  syncActieveTraining: vi.fn(async () => "active-synced"),
  syncAlleLokaleData: vi.fn(async () => undefined),
  syncHistorieTraining: vi.fn(async () => undefined),
  syncInstellingen: vi.fn(async () => undefined),
  syncProfiel: vi.fn(async () => undefined),
  verwijderCloudActieveTraining: vi.fn(async () => undefined),
  verwijderCloudHistorieTraining: vi.fn(async () => undefined),
  voerVeiligeCloudMigratieUit: vi.fn(() => new Promise((resolve) => setTimeout(() => resolve(null), 1000))),
  voltooiTrainingMetCloudVerificatie: vi.fn(async () => true),
}));

function AppOnderTest({ showToast = vi.fn() }) {
  return (
    <ToastContext.Provider value={{ showToast, hideToast: vi.fn() }}>
      <AuthContext.Provider value={{ currentUser: { uid: "test-user" }, signOutUser: vi.fn() }}>
        <SyncProvider>
          <Trainingen initialTraining={TRAINING_A} onTrainingClosed={vi.fn()} />
        </SyncProvider>
      </AuthContext.Provider>
    </ToastContext.Provider>
  );
}

describe("actieve oefening tijdens autosave", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("fitnessCloudMigrationVersion:test-user", "2");
    vi.stubGlobal("scrollTo", vi.fn());
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("blijft zichtbaar na invoer, debounce en een online sync-event", async () => {
    render(<AppOnderTest />);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: /Chest Press/ }));
    const gewicht = document.getElementById("Chest Press-1-lb");
    fireEvent.change(gewicht, { target: { value: "80" } });
    localStorage.removeItem("fitnessCloudMigrationVersion:test-user");

    await act(async () => {
      vi.advanceTimersByTime(1000);
      window.dispatchEvent(new Event("online"));
      await Promise.resolve();
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });

    expect(screen.getByRole("heading", { name: "Chest Press", level: 1 })).not.toBeNull();
    expect(screen.queryByRole("heading", { name: TRAINING_A, level: 1 })).toBeNull();
    expect(document.getElementById("Chest Press-1-lb").value).toBe("80");
  });

  it("overschrijft actieve invoer pas na expliciet herstellen uit oude A-historie", async () => {
    localStorage.setItem("trainingHistorie", JSON.stringify([{
      trainingId: "oude-a-training",
      training: TRAINING_A,
      trainingSchemaId: "training-a",
      datum: "2026-07-13T10:00:00.000Z",
      oefeningen: { "Chest Press": { 1: { gewicht: "80", reps: "9" } } },
      cardio: {},
      weightUnit: "lb",
      weightUnitVersion: 1,
    }]));

    render(<AppOnderTest />);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: /Chest Press/ }));
    expect(document.getElementById("Chest Press-1-lb").value).toBe("");
    fireEvent.change(document.getElementById("Chest Press-1-lb"), { target: { value: "100" } });
    expect(document.getElementById("Chest Press-1-lb").value).toBe("100");
    fireEvent.click(screen.getByRole("button", { name: "Herstel vorige waarde" }));
    expect(document.getElementById("Chest Press-1-lb").value).toBe("80");
    expect(document.getElementById("Chest Press-1-reps").value).toBe("9");
    expect(screen.getByText("Vrije training")).not.toBeNull();
  });

  it("noemt de oefening wanneer geen eerdere waarden bestaan", async () => {
    const showToast = vi.fn();
    render(<AppOnderTest showToast={showToast} />);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: /Chest Press/ }));
    fireEvent.click(screen.getByRole("button", { name: "Herstel vorige waarde" }));
    expect(showToast).toHaveBeenCalledWith("Geen eerdere waarden voor Chest Press gevonden.", "info");
  });

  it("koppelt maximaal één rusttimer aan de gekozen set en ondersteunt stoppen en herstarten", async () => {
    const showToast = vi.fn();
    render(<AppOnderTest showToast={showToast} />);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: /Chest Press/ }));

    fireEvent.click(screen.getByRole("button", { name: "Start rusttimer van set 1" }));
    expect(screen.getByRole("button", { name: "Stop rusttimer van set 1" }).textContent).toContain("60s");
    expect(screen.getByRole("button", { name: "Start rusttimer van set 2" }).textContent).toBe("Rust 60s");

    fireEvent.click(screen.getByRole("button", { name: "Start rusttimer van set 2" }));
    expect(screen.queryByRole("button", { name: "Stop rusttimer van set 1" })).toBeNull();
    expect(screen.getByRole("button", { name: "Stop rusttimer van set 2" }).textContent).toContain("60s");

    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(showToast).toHaveBeenCalledWith("Rusttijd voorbij — je kunt weer verder", "info", { duration: 3500 });
    expect(screen.getByRole("button", { name: "Start rusttimer van set 2" }).textContent).toBe("Opnieuw 60s");

    fireEvent.click(screen.getByRole("button", { name: "Start rusttimer van set 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Stop rusttimer van set 2" }));
    expect(screen.getByRole("button", { name: "Start rusttimer van set 2" }).textContent).toBe("Opnieuw 60s");
  });

  it("vraagt notificatierechten pas bij inschakelen en bewaart verleende toestemming", async () => {
    const requestPermission = vi.fn(async () => "granted");
    vi.stubGlobal("Notification", { permission: "default", requestPermission });
    render(<AppOnderTest />);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: /Chest Press/ }));

    const instelling = screen.getByLabelText("Melding bij afloop");
    expect(requestPermission).not.toHaveBeenCalled();
    fireEvent.click(instelling);
    await act(async () => { await Promise.resolve(); });

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(instelling.checked).toBe(true);
    expect(localStorage.getItem("fitnessTrackerRusttimerNotificatie")).toBe("true");
  });

  it("laat de notificatie-instelling uit bij geweigerde toestemming", async () => {
    const showToast = vi.fn();
    vi.stubGlobal("Notification", { permission: "default", requestPermission: vi.fn(async () => "denied") });
    render(<AppOnderTest showToast={showToast} />);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: /Chest Press/ }));

    const instelling = screen.getByLabelText("Melding bij afloop");
    fireEvent.click(instelling);
    await act(async () => { await Promise.resolve(); });

    expect(instelling.checked).toBe(false);
    expect(localStorage.getItem("fitnessTrackerRusttimerNotificatie")).toBe("false");
    expect(showToast).toHaveBeenCalledWith("Toestemming voor systeemnotificaties is niet verleend.", "info");
  });
});
