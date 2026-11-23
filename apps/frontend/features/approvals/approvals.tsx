"use client";

import { Address, StrKey } from "@stellar/stellar-sdk";
import { useCallback, useState, type FormEvent } from "react";
import { getBlockchainConfig, invokeSoroban } from "@/lib/stellar";
import { useWalletSession } from "@/lib/wallet-session";
import { getCircleDetails, type CircleDetails } from "../circles/api";
import { CircleReader } from "../circles/circle-reader";
import { shortWallet } from "../invitations/model";
import { contractStatus, displayUsdc, isActiveMember, readChainCircle, uint, type ChainWithdrawal } from "../payouts/contract-state";
import { CircleTransactionStatus, useCircleTransaction } from "../payouts/use-circle-transaction";
import { useChainState } from "../payouts/use-chain-state";
import { Facts } from "./components";

const pageSize = 20;
const statuses: Record<number, string> = {
  [contractStatus.pendingWithdrawal]: "Pending",
  [contractStatus.approvedWithdrawal]: "Approved",
  [contractStatus.executedWithdrawal]: "Executed",
  [contractStatus.rejectedWithdrawal]: "Rejected",
};

function readApprovalCircle(id: string, _token: string, signal: AbortSignal) {
  return getCircleDetails(id, signal);
}

export function Approvals() {
  const session = useWalletSession();
  return <div className="approval-workspace">
    <header className="approval-heading"><h1>Withdrawal approvals</h1><p>Request, review, and execute protected withdrawals on Stellar Testnet.</p></header>
    <CircleReader path="/dashboard/approvals" read={readApprovalCircle}>{(_, circle) => <>
      <h2>{circle.name}</h2>
      {circle.onChainGroupId == null
        ? <p role="status">Link this circle to Stellar Testnet in My Circles to enable withdrawals.</p>
        : session && <LinkedApprovals circle={circle} groupId={circle.onChainGroupId} wallet={session.walletAddress} />}
    </>}</CircleReader>
  </div>;
}

async function readRequests(chain: Awaited<ReturnType<typeof readChainCircle>>, wallet: string, endAt?: number) {
  const counterKey = chain.key("NextWithdrawalId");
  const counter = await chain.read([counterKey]);
  const nextId = counter<number>(counterKey);
  if (nextId == null) throw new Error("The withdrawal counter is unavailable on Stellar Testnet.");
  const end = Math.min(endAt ?? nextId - 1, nextId - 1);
  const start = Math.max(1, end - pageSize + 1);
  const ids = Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => end - index);
  if (!ids.length) return { requests: [], missing: 0, previousEnd: 0 };

  const address = Address.fromString(wallet).toScVal();
  const requestKeys = ids.map((id) => chain.key("Withdrawal", uint(id)));
  const voteKeys = ids.map((id) => chain.key("WithdrawalApproval", uint(id), address));
  const records = await chain.read([...requestKeys, ...voteKeys]);
  const requests = requestKeys.flatMap((key, index) => {
    const request = records<ChainWithdrawal>(key);
    return request ? [{ request, voted: records<boolean>(voteKeys[index]) === true }] : [];
  });
  return { requests, missing: ids.length - requests.length, previousEnd: start - 1 };
}

function LinkedApprovals({ circle, groupId, wallet }: { circle: CircleDetails; groupId: number; wallet: string }) {
  const [end, setEnd] = useState<number>();
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState(wallet);
  const [formError, setFormError] = useState("");
  const load = useCallback(async (signal: AbortSignal) => {
    const config = await getBlockchainConfig(signal);
    const chain = await readChainCircle(config, groupId, circle.organizerWallet, wallet);
    const page = await readRequests(chain, wallet, end);
    return { ...chain, ...page };
  }, [circle.organizerWallet, end, groupId, wallet]);
  const { record, error, loading, refresh } = useChainState(load);
  const transaction = useCircleTransaction(wallet, groupId, "withdrawal", refresh);
  const disabled = loading || !!error || transaction.locked;
  const active = isActiveMember(record?.member);

  function requestWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active || disabled || !record) return;
    const requested = amount.trim();
    const destination = recipient.trim();
    const parts = /^(\d{1,21})(?:\.(\d{1,7}))?$/.exec(requested);
    if (!parts) { setFormError("Enter a positive USDC amount with up to seven decimal places."); return; }
    const units = BigInt(parts[1] + (parts[2] ?? "").padEnd(7, "0"));
    if (units <= 0 || units > record.accounting.available_balance) {
      setFormError("Enter a positive amount no greater than the available group funds.");
      return;
    }
    if (!StrKey.isValidEd25519PublicKey(destination) && !StrKey.isValidContract(destination)) {
      setFormError("Enter a valid Stellar account or contract address.");
      return;
    }
    setFormError("");
    setEnd(undefined);
    void transaction.submit((onSubmitted) => invokeSoroban(wallet, {
      method: "request_withdrawal", groupId, amount: requested, recipient: destination,
    }, { onSubmitted }));
  }

  if (!record && loading) return <p role="status">Checking Stellar Testnet withdrawal records…</p>;
  return <>
    {error && <p role="alert">{error}</p>}
    <button type="button" className="button outline" disabled={loading || transaction.busy} onClick={refresh}>Refresh withdrawals</button>
    <CircleTransactionStatus transaction={transaction} />
    {record && <>
      <section className="approval-card approval-note"><h3>Contract accounting</h3><Facts rows={[
        ["Available group funds", displayUsdc(record.accounting.available_balance)],
        ["Approvals required", record.group.approval_threshold],
      ]} /></section>
      {!active && <p role="status">Your linked wallet must be an active on-chain member to submit withdrawal actions.</p>}
      {active && <form className="approval-card approval-withdrawal-form" onSubmit={requestWithdrawal}>
        <h3>Request a withdrawal</h3>
        <label>Amount in USDC <input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
        <label>Recipient address <input required value={recipient} onChange={(event) => setRecipient(event.target.value)} /></label>
        <p>Your signed request counts as the first approval.</p>
        {formError && <p role="alert">{formError}</p>}
        <button className="approval-button" data-tone="green" type="submit" disabled={disabled || record.accounting.available_balance <= 0}>Sign withdrawal request</button>
      </form>}
      <section className="approval-card">
        <h3>Withdrawal requests</h3>
        {record.missing > 0 && <p role="status">{record.missing} withdrawal records are unavailable in this RPC page.</p>}
        {!record.requests.length && !record.missing && <p>No withdrawal requests have been submitted.</p>}
        <div className="approval-stack">{record.requests.map(({ request, voted }) => (
          <article className="approval-card approval-note" key={request.request_id}>
            <h3>Request {request.request_id} · {statuses[request.status] ?? "Unknown status"}</h3>
            <Facts rows={[
              ["Amount", displayUsdc(request.amount)], ["Recipient", request.recipient],
              ["Requested by", request.requester === wallet ? "You" : shortWallet(request.requester)],
              ["Approvals", `${request.approval_count} of ${record.group.approval_threshold}`],
            ]} />
            {voted && <p>You approved this request.</p>}
            {active && request.status === contractStatus.pendingWithdrawal && !voted &&
              <button className="approval-button" data-tone="green" type="button" disabled={disabled}
                onClick={() => void transaction.submit((onSubmitted) => invokeSoroban(wallet, {
                  method: "approve_withdrawal", groupId, requestId: request.request_id,
                }, { onSubmitted }))}>Approve withdrawal</button>}
            {active && request.status === contractStatus.approvedWithdrawal && record.accounting.available_balance >= request.amount &&
              <button className="approval-button" data-tone="green" type="button" disabled={disabled}
                onClick={() => void transaction.submit((onSubmitted) => invokeSoroban(wallet, {
                  method: "execute_withdrawal", groupId, requestId: request.request_id,
                }, { onSubmitted }))}>Execute withdrawal</button>}
          </article>
        ))}</div>
        <div className="approval-stack">
          {record.previousEnd > 0 && <button type="button" className="button outline" disabled={loading} onClick={() => { refresh(); setEnd(record.previousEnd); }}>Older requests</button>}
          {end !== undefined && <button type="button" className="button outline" disabled={loading} onClick={() => { refresh(); setEnd(undefined); }}>Latest requests</button>}
        </div>
      </section>
    </>}
  </>;
}
