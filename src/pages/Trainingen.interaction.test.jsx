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

function AppOnderTest() {
  return (
    <ToastContext.Provider value={{ showToast: vi.fn(), hideToast: vi.fn() }}>
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
    localStorage.setItem("fitnessCloudMigrationVersion:test-user", "1");
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
    const gewicht = document.getElementById("Chest Press-1-kg");
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
    expect(document.getElementById("Chest Press-1-kg").value).toBe("80");
  });

  it("laadt een laatst opgeslagen A-oefening automatisch in Vrije training", async () => {
    localStorage.setItem("trainingHistorie", JSON.stringify([{
      trainingId: "oude-a-training",
      training: TRAINING_A,
      trainingSchemaId: "training-a",
      datum: "2026-07-13T10:00:00.000Z",
      oefeningen: { "Chest Press": { 1: { gewicht: "77", reps: "9" } } },
      cardio: {},
    }]));

    render(<AppOnderTest />);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: /Chest Press/ }));

    expect(document.getElementById("Chest Press-1-kg").value).toBe("77");
    expect(document.getElementById("Chest Press-1-reps").value).toBe("9");
    expect(screen.getByText("Vrije training")).not.toBeNull();
  });
});
