"use client";

import { useRef, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import { getTransactionStatus } from "@/lib/stellar";

type Submission = { hash: string; status: "SUCCESS" | "PENDING" };
type Submit = (onSubmitted: (hash: string) => void) => Promise<Submission>;

export function useCircleTransaction(wallet: string, groupId: number, operation: "payout" | "withdrawal", onConfirmed: () => void) {
  const key = `savecircle:pending:${apiBaseUrl}:${wallet}:${groupId}:${operation}`;
  const [pending, setPending] = useState<string | null>(() => {
    try {
      const hash = sessionStorage.getItem(key);
      return hash && /^[a-f0-9]{64}$/i.test(hash) ? hash : null;
    } catch {
      return null;
    }
  });
  const [confirmed, setConfirmed] = useState<string>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  function changePending(hash: string | null) {
    setPending(hash);
    try {
      if (hash) sessionStorage.setItem(key, hash);
      else sessionStorage.removeItem(key);
    } catch {
      // Keep the submission locked for the current view if storage is unavailable.
    }
  }

  function confirm(hash: string) {
    changePending(null);
    setConfirmed(hash);
    onConfirmed();
  }

  async function run(action: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The wallet transaction could not be completed.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  return {
    pending, confirmed, error, busy, locked: busy || !!pending,
    submit(action: Submit) {
      if (pending) return;
      return run(async () => {
        setConfirmed(undefined);
        const result = await action(changePending);
        if (result.status === "SUCCESS") confirm(result.hash);
        else changePending(result.hash);
      });
    },
    checkStatus() {
      if (!pending) return;
      return run(async () => {
        const result = await getTransactionStatus(pending);
        if (result.success) confirm(pending);
        else if (result.status === "FAILED") {
          changePending(null);
          setError("The transaction failed on Stellar Testnet. Refresh the records before trying again.");
          onConfirmed();
        }
      });
    },
  };
}

export function CircleTransactionStatus({ transaction }: { transaction: ReturnType<typeof useCircleTransaction> }) {
  return <>
    {transaction.error && <p role="alert">{transaction.error}</p>}
    {transaction.pending && <div role="status">
      <p>Awaiting confirmation on Stellar Testnet.</p>
      <code className="dash-wallet-address">{transaction.pending}</code>
      <button className="button outline" type="button" disabled={transaction.busy} onClick={() => void transaction.checkStatus()}>Check transaction status</button>
    </div>}
    {transaction.confirmed && <div role="status">
      <p>Transaction confirmed on Stellar Testnet.</p>
      <code className="dash-wallet-address">{transaction.confirmed}</code>
    </div>}
  </>;
}
