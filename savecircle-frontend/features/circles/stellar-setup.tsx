"use client";

import { useRef, useState } from "react";
import { usePendingTransaction } from "@/lib/pending-transaction";
import { getTransactionStatus, invokeSoroban } from "@/lib/stellar";
import type { WalletSession } from "@/lib/wallet-session";
import { linkCircleOnChain, type CircleDetails } from "./api";

export function StellarSetup({ circle, session, onLinked }: {
  circle: CircleDetails; session: WalletSession; onLinked: (circle: CircleDetails) => void;
}) {
  const transaction = usePendingTransaction(`create:${circle.id}:${session.walletAddress}`);
  const [recoveryHash, setRecoveryHash] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  async function register() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const submitted = transaction.hash || recoveryHash.trim();
      if (submitted) {
        const status = await getTransactionStatus(submitted);
        if (status.status === "FAILED") {
          transaction.save("");
          setRecoveryHash("");
          setRecovering(false);
          throw new Error("Stellar rejected the group creation. You can start a new registration.");
        }
        if (status.status !== "SUCCESS") {
          setMessage("Waiting for Stellar confirmation. Check the same transaction again before starting a new registration.");
          return;
        }
        onLinked(await linkCircleOnChain(circle.id, session.accessToken, submitted));
        transaction.save("");
        return;
      }

      const result = await invokeSoroban(session.walletAddress, {
        method: "create_group",
        name: circle.name,
        contributionAmount: circle.contributionAmount,
        totalMembers: circle.totalMembers,
        cycleDurationLedgers: circle.cycleDurationDays * 17_280,
        approvalThreshold: circle.approvalThreshold,
      }, { onSubmitted: transaction.save });
      if (result.status === "SUCCESS") {
        onLinked(await linkCircleOnChain(circle.id, session.accessToken, result.hash));
        transaction.save("");
      } else {
        setMessage("Registration was submitted. Check the transaction again to finish linking the circle.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register the circle on Stellar.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <section className="dash-card circle-card">
    <h2>Register on Stellar Testnet</h2>
    <p>Sign the group creation transaction with the organizer wallet, then register member positions in Group Management.</p>
    {transaction.hash && <p className="dash-wallet-address">Transaction <code>{transaction.hash}</code></p>}
    <button type="button" className="button primary" onClick={register} disabled={busy || (recovering && !/^[a-fA-F0-9]{64}$/.test(recoveryHash.trim()))}>
      {busy ? "Checking Stellar…" : transaction.hash || recovering ? "Check and link transaction" : "Register with Freighter"}
    </button>
    {!transaction.hash && <button type="button" className="dash-link" disabled={busy} onClick={() => { setRecovering(!recovering); setRecoveryHash(""); }}>
      {recovering ? "Back to wallet registration" : "Link an existing creation transaction"}
    </button>}
    {recovering && !transaction.hash && <label className="circle-field"><strong>Creation transaction hash</strong><input value={recoveryHash} onChange={(event) => setRecoveryHash(event.target.value)} maxLength={64} disabled={busy} /></label>}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
