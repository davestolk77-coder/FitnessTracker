import { useEffect, useRef } from "react";
import { Card, DangerButton, SecondaryButton } from "./ui";

export function StopTrainingModal({ bezig, onDoorgaan, onStoppen, triggerRef }) {
  const doorgaanKnop = useRef(null);
  const onDoorgaanRef = useRef(onDoorgaan);
  const bezigRef = useRef(bezig);

  useEffect(() => {
    onDoorgaanRef.current = onDoorgaan;
    bezigRef.current = bezig;
  }, [bezig, onDoorgaan]);

  useEffect(() => {
    const vorigOverflow = document.body.style.overflow;
    const terugNaar = triggerRef.current || document.activeElement;
    const focusFrame = window.requestAnimationFrame(() => doorgaanKnop.current?.focus());

    document.body.style.overflow = "hidden";

    const bijToets = (event) => {
      if (event.key === "Escape" && !bezigRef.current) {
        event.preventDefault();
        onDoorgaanRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const knoppen = [...document.querySelectorAll("[data-stop-training-dialog] button:not(:disabled)")];
      if (knoppen.length === 0) return;
      const eerste = knoppen[0];
      const laatste = knoppen.at(-1);
      if (event.shiftKey && document.activeElement === eerste) {
        event.preventDefault();
        laatste.focus();
      } else if (!event.shiftKey && document.activeElement === laatste) {
        event.preventDefault();
        eerste.focus();
      }
    };

    document.addEventListener("keydown", bijToets);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", bijToets);
      document.body.style.overflow = vorigOverflow;
      if (terugNaar instanceof HTMLElement && terugNaar.isConnected) terugNaar.focus();
    };
  }, [triggerRef]);

  return (
    <div className="confirmation-backdrop stop-training-backdrop" role="presentation">
      <Card
        className="confirmation-dialog stop-training-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stop-training-titel"
        aria-describedby="stop-training-uitleg"
        data-stop-training-dialog
      >
        <h2 id="stop-training-titel">Training stoppen?</h2>
        <div id="stop-training-uitleg" className="stop-training-dialog__copy">
          <p>Weet je zeker dat je deze training wilt stoppen?</p>
          <p>Je huidige trainingsgegevens worden verwijderd.</p>
        </div>
        <div className="confirmation-dialog__actions">
          <SecondaryButton ref={doorgaanKnop} disabled={bezig} onClick={onDoorgaan}>Doorgaan met trainen</SecondaryButton>
          <DangerButton disabled={bezig} onClick={onStoppen}>{bezig ? "Training stoppen…" : "Training stoppen"}</DangerButton>
        </div>
      </Card>
    </div>
  );
}
