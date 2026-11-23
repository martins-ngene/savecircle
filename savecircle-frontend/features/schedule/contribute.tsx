"use client";

import { useRef, useState } from "react";
import { usePendingTransaction } from "@/lib/pending-transaction";
import { getBlockchainConfig, getTransactionStatus, invokeSoroban, readSoroban } from "@/lib/stellar";
import type { WalletSession } from "@/lib/wallet-session";
import type { ApiCircle } from "../circles/api";

export function Contribute({ circle, session, cycleIndex, amount, refresh }: {
  circle: ApiCircle; session: WalletSession; cycleIndex: number; amount: string; refresh: () => void;
}) {
  const pending = usePendingTransaction(`contribution:${circle.id}:${cycleIndex}:${session.walletAddress}`);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  async function submit() {
    const groupId = circle.onChainGroupId;
    if (groupId == null || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setStatus("");
    setError("");
    try {
      if (pending.hash) {
        const lookup = await getTransactionStatus(pending.hash);
        if (lookup.status === "FAILED") {
          pending.save("");
          throw new Error("Stellar rejected the transaction. You can review a new contribution.");
        }
        setStatus(lookup.status);
        if (lookup.status === "SUCCESS") refresh();
        return;
      }
      const [config, group, member] = await Promise.all([
        getBlockchainConfig(),
        readSoroban(session.walletAddress, { method: "get_group", groupId }) as Promise<{ organizer: string; usdc_token: string; total_members: number } | null>,
        readSoroban(session.walletAddress, { method: "get_member", groupId, member: session.walletAddress }) as Promise<{ status: number; rules_accepted: boolean; rotation_position: number } | null>,
      ]);
      if (!group || group.organizer !== circle.organizerWallet || group.usdc_token !== config.usdcTokenId || group.total_members !== circle.totalMembers) {
        throw new Error("The linked Stellar group does not match this circle.");
      }
      const position = circle.members.find((item) => item.walletAddress === session.walletAddress)?.rotationPosition;
      if (!member || member.status !== 2 || !member.rules_accepted || member.rotation_position !== position) {
        throw new Error("Activate your matching Stellar membership in Group Management before contributing.");
      }
      const result = await invokeSoroban(session.walletAddress, {
        method: "contribute",
        groupId,
        cycleIndex,
        amount,
      }, { onSubmitted: pending.save });
      setStatus(result.status);
      if (result.status === "SUCCESS") refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process the contribution.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  if (pending.hash) return <div className="schedule-stack">
    <p role="status">{status === "SUCCESS" ? "Confirmed on Stellar. Refresh the schedule to check whether the ledger has indexed it." : "Check confirmation before retrying this contribution."}</p>
    <code className="dash-wallet-address">{pending.hash}</code>
    <div className="schedule-actions">
      <button type="button" className="schedule-button outline" disabled={busy} onClick={submit}>{busy ? "Checking…" : "Check confirmation"}</button>
      <button type="button" className="schedule-button outline" disabled={busy} onClick={refresh}>Refresh records</button>
    </div>
    {error && <p role="alert" className="schedule-red">{error}</p>}
  </div>;

  return <div className="schedule-stack">
    {review ? <>
      <p>Sign a transfer of {amount} USDC to {circle.name} for cycle {cycleIndex} on Stellar Testnet.</p>
      <div className="schedule-actions">
        <button type="button" className="schedule-button primary" disabled={busy} onClick={submit}>{busy ? "Waiting for Freighter…" : "Sign contribution"}</button>
        <button type="button" className="schedule-button outline" disabled={busy} onClick={() => setReview(false)}>Cancel</button>
      </div>
    </> : <button type="button" className="schedule-button outline" onClick={() => setReview(true)}>Review contribution</button>}
    {error && <p role="alert" className="schedule-red">{error}</p>}
  </div>;
}
