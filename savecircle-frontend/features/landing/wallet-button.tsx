"use client";

import { useRef } from "react";

export function WalletButton() {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" className="button outline" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>Connect wallet</button>
      <dialog ref={dialog} className="wallet-dialog" aria-label="Connect wallet">
        <h2>Connect wallet</h2>
        <p>Wallet connection is reserved for the SaveCircle app. You can explore the savings planner here without a wallet.</p>
        <form method="dialog"><button className="button primary">Close</button></form>
      </dialog>
    </>
  );
}
