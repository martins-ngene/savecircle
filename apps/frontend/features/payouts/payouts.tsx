"use client";

import { Address } from "@stellar/stellar-sdk";
import Link from "next/link";
import { useCallback } from "react";
import { getBlockchainConfig, invokeSoroban } from "@/lib/stellar";
import { useWalletSession } from "@/lib/wallet-session";
import { circleDate, circleLabel, type ApiCircle } from "../circles/api";
import { CircleReader } from "../circles/circle-reader";
import { shortWallet } from "../invitations/model";
import { getGroupSchedule } from "../schedule/api";
import { PayoutFacts, PayoutHeading } from "./components";
import { contractStatus, displayUsdc, isActiveMember, readChainCircle, uint, type ChainCycle, type ChainMember } from "./contract-state";
import { CircleTransactionStatus, useCircleTransaction } from "./use-circle-transaction";
import { useChainState } from "./use-chain-state";

type Schedule = Awaited<ReturnType<typeof getGroupSchedule>>;

export function Payouts() {
  const session = useWalletSession();
  return <div className="payout-workspace">
    <PayoutHeading description="Review cycle funding, payout recipients, and completed releases." />
    <CircleReader path="/dashboard/payouts" read={readPayoutSchedule}>{(circle, schedule) => <>
      <h2>{circle.name}</h2>
      <div className="payout-actions">
        <Link className="button outline" href={`/dashboard/schedule?circle=${encodeURIComponent(circle.id)}`}>View schedule</Link>
        <Link className="button outline" href={`/dashboard/ledger?circle=${encodeURIComponent(circle.id)}`}>View my ledger</Link>
      </div>
      {circle.onChainGroupId == null
        ? <><p role="status">Link this circle to Stellar Testnet in My Circles to enable payout releases.</p><IndexedCycles schedule={schedule} /></>
        : session && <LinkedPayouts circle={circle} groupId={circle.onChainGroupId} wallet={session.walletAddress} schedule={schedule} />}
    </>}</CircleReader>
  </div>;
}

function readPayoutSchedule(circleId: string, _token: string, signal: AbortSignal) {
  return getGroupSchedule(circleId, signal);
}

function IndexedCycles({ schedule }: { schedule: Schedule }) {
  return <section className="payout-card payout-stack"><h2>Cycle schedule</h2>
    {schedule.cycles.length ? <ul>{schedule.cycles.map((cycle) => <li key={cycle.cycleIndex}>
      Cycle {cycle.cycleIndex} · {circleDate(cycle.dueDate)} · {cycle.recipientName} · {circleLabel(cycle.status)}
    </li>)}</ul> : <p>No cycles have been scheduled.</p>}
  </section>;
}

function LinkedPayouts({ circle, groupId, wallet, schedule }: { circle: ApiCircle; groupId: number; wallet: string; schedule: Schedule }) {
  const load = useCallback(async (signal: AbortSignal) => {
    const config = await getBlockchainConfig(signal);
    const chain = await readChainCircle(config, groupId, circle.organizerWallet, wallet);
    if (chain.group.total_members !== circle.totalMembers) throw new Error("The linked group’s member limit differs from the circle record.");
    const keys = schedule.cycles.map((cycle) => chain.key("Cycle", uint(cycle.cycleIndex)));
    const records = keys.length ? await chain.read(keys) : undefined;
    const cycles = schedule.cycles.map((cycle, index) => ({ schedule: cycle, chain: records?.<ChainCycle>(keys[index]) }));
    const fundedRecipients = [...new Set(cycles.flatMap(({ chain }) => chain && chain.status !== contractStatus.paidCycle && chain.collected_amount >= chain.target_amount ? [chain.recipient] : []))];
    const recipientKeys = fundedRecipients.map((recipient) => chain.key("Member", Address.fromString(recipient).toScVal()));
    const recipients = recipientKeys.length ? await chain.read(recipientKeys) : undefined;
    const activeRecipients = new Set(fundedRecipients.filter((_, index) => isActiveMember(recipients?.<ChainMember>(recipientKeys[index]))));
    return { ...chain, cycles, activeRecipients };
  }, [circle.organizerWallet, circle.totalMembers, groupId, schedule.cycles, wallet]);

  const { record, error, loading, refresh } = useChainState(load);
  const transaction = useCircleTransaction(wallet, groupId, "payout", refresh);

  if (!record && loading) return <p role="status">Checking Stellar Testnet payout records…</p>;
  return <>
    {error && <p role="alert">{error}</p>}
    <div className="payout-actions"><button className="button outline" type="button" disabled={loading || transaction.busy} onClick={refresh}>Refresh payouts</button></div>
    <CircleTransactionStatus transaction={transaction} />
    {record && <>
      {!isActiveMember(record.member) && <p role="status">Your linked wallet must be an active on-chain member to release a payout.</p>}
      <section className="payout-card payout-stack"><h2>Contract accounting</h2><PayoutFacts rows={[
        ["Available group funds", displayUsdc(record.accounting.available_balance)],
        ["Total funds paid out", displayUsdc(record.accounting.total_funds_paid_out)],
      ]} /></section>
      <section className="payout-card payout-stack"><h2>Payout cycles</h2>
        {record.cycles.length ? <ol className="payout-cycle-grid">{record.cycles.map(({ schedule: cycle, chain }) => {
          const member = circle.members.find((item) => item.walletAddress === chain?.recipient);
          const paid = chain?.status === contractStatus.paidCycle;
          const recipient = chain && member?.rotationPosition === cycle.cycleIndex ? member.displayName || shortWallet(member.walletAddress) : "Unassigned";
          const funded = !!chain && chain.collected_amount >= chain.target_amount;
          const ready = chain && !paid && funded && recipient !== "Unassigned" && record.activeRecipients.has(chain.recipient) &&
            isActiveMember(record.member) && record.accounting.available_balance >= chain.target_amount;
          return <li className="payout-card payout-stack" key={cycle.cycleIndex}>
            <h3>Cycle {cycle.cycleIndex}</h3><p>{circleDate(cycle.dueDate)}</p>
            <PayoutFacts rows={[
              ["Recipient", recipient],
              ["Pool target", chain ? displayUsdc(chain.target_amount) : "Unavailable"],
              ["Collected", chain ? displayUsdc(chain.collected_amount) : "Unavailable"],
              ["Status", paid ? "Paid" : funded ? "Funded" : chain ? "Awaiting funding" : "Unavailable"],
            ]} />
            {ready && <button type="button" className="button primary" disabled={loading || !!error || transaction.locked}
              onClick={() => void transaction.submit((onSubmitted) => invokeSoroban(wallet, { method: "execute_payout", groupId, cycleIndex: cycle.cycleIndex }, { onSubmitted }))}>Release payout</button>}
          </li>;
        })}</ol> : <p>No cycles have been scheduled.</p>}
      </section>
    </>}
  </>;
}
