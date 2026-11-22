import { useState } from "react";
import { member } from "../dashboard/model";
import { usdc } from "../landing/plan";
import { monthName, monthYear } from "../schedule/model";
import { compactUSDC, PayoutFacts, PayoutHeading, PayoutLink, payoutTimestamp, PayoutTotals, PayoutTransaction } from "./components";
import { augustReference, type PayoutView } from "./model";
import type { ReleaseEvent } from "./release";

export function PayoutFlow({ vm, back, showBack, update }: { vm: PayoutView; back: string; showBack: boolean; update: (event: ReleaseEvent) => void }) {
  const [step, setStep] = useState<"review" | "wallet" | "declined">("review");
  const { circle, cycle, pool, approvals, plan, amount, history, available, release, status } = vm;
  const phase = status === "pending" || status === "paid" ? status : step;
  const context = `${circle.name} · Cycle ${cycle.number} · ${monthYear(cycle.due)}`;
  const recipientWallet = pool.recipient === "Nora O." ? "GBNR…8L2Q" : pool.recipient === member.name ? member.wallet : "Registered preview wallet";
  const value = usdc(amount);
  const authorizer = `${member.name} · ${member.wallet}`;
  const funding = `${compactUSDC(pool.collected)} / ${compactUSDC(pool.target)} USDC`;
  const titles = {
    review: ["Review approved payout", "Verify the recipient and cycle before authorizing the group’s release."],
    wallet: ["Authorize payout in your wallet", "Review the simulated release request and choose a wallet response."],
    pending: ["Confirming the payout", "Your preview wallet approved the release. Confirmation is pending."],
    paid: ["Payout completed", `${pool.recipient} received the ${monthName(cycle.due)} payout in this preview.`],
    declined: ["Payout was not submitted", "The wallet request was declined before signing."],
  };

  return <>
    {showBack && <PayoutLink href={back}>← Back to payouts</PayoutLink>}
    <PayoutHeading title={titles[phase][0]} description={titles[phase][1]} eyebrow={`${circle.name} / Cycle ${cycle.number}`} />
    {phase === "paid" && <PayoutTotals vm={vm} />}
    <section className="payout-card payout-stack payout-flow-card" aria-label={titles[phase][0]}>
      {(phase === "review" || phase === "wallet") && <>
        <div className="payout-summary payout-stack payout-soft">
          <span className="payout-eyebrow payout-olive">{phase === "review" ? "All release conditions met" : "Wallet preview"}</span>
          <strong className="payout-amount">{value}</strong>
          <h3>From the circle contract → {pool.recipient}’s registered wallet</h3>
        </div>
        <PayoutFacts rows={[
          ["Savings circle", circle.name], ["Scheduled recipient", `${pool.recipient} · Position ${cycle.number} of ${plan.cycles.length}`],
          ["Recipient wallet", `${recipientWallet} · Registered and active`], ["Payout cycle", `Cycle ${cycle.number} · ${monthYear(cycle.due)}`],
          ["Cycle funding", `${funding} · Complete`], ["Confirmed approvals", `${approvals} of ${circle.members} · ${new Intl.ListFormat("en-US").format(pool.people.slice(0, approvals))}`],
          ["Available group balance", usdc(available)], ["Authorizing wallet", `${authorizer} · Authorized preview wallet`],
          ["Network / token", "Stellar Testnet preview · Testnet USDC"], ["Network fee", "Wallet would show the final fee in XLM"],
        ]} />
        <div className="payout-actions">
          {phase === "review" ? <>
            <button className="payout-button" data-tone="green" onClick={() => setStep("wallet")}>Continue to wallet →</button>
            <PayoutLink href={back} tone="soft">Cancel</PayoutLink>
          </> : <>
            <button className="payout-button" data-tone="green" onClick={() => update("submit")}>Approve preview release</button>
            <button className="payout-button" data-tone="soft" onClick={() => setStep("declined")}>Decline wallet request</button>
          </>}
        </div>
        <p>The payout comes from group funds. This preview simulates authorization and submission.</p>
      </>}
      {phase === "pending" && release && <>
        <div className="payout-summary payout-stack payout-amber">
          <span className="payout-eyebrow payout-brown">Transaction submitted</span><strong className="payout-result-amount">{value} → {pool.recipient}</strong>
          <h3>Check this release before submitting another.</h3>
          <ol><li>Wallet authorization approved</li><li>Transaction submission simulated</li><li>Confirmation in progress</li></ol>
        </div>
        <PayoutFacts rows={[
          ["Savings circle / cycle", context], ["Submitted at", `${payoutTimestamp(release.submitted)} UTC`],
          ["Transaction hash", augustReference], ["Recipient", `${pool.recipient} · ${recipientWallet}`], ["Status", "Pending confirmation"],
        ]} />
        <div className="payout-actions">
          <button className="payout-button" data-tone="green" onClick={() => update("confirm")}>Check payout status</button>
          <PayoutTransaction hash={augustReference} />
        </div>
      </>}
      {phase === "paid" && release && <>
        <div className="payout-summary payout-stack payout-lime">
          <span className="payout-eyebrow">Confirmed · Cycle {cycle.number} paid</span>
          <strong className="payout-result-amount">{value} sent to {pool.recipient}</strong>
          <p>{payoutTimestamp(release.confirmed ?? release.submitted)} UTC · This cycle has been released.</p>
        </div>
        <PayoutFacts rows={[
          ["Recipient wallet", `${recipientWallet} · Registered and active`],
          ["Savings circle / cycle", `${circle.name} · Cycle ${cycle.number} of ${plan.cycles.length} · ${monthYear(cycle.due)}`],
          ["Funding / approvals", `${funding} funded · ${approvals} of ${circle.members} members approved`],
          ["Authorized by", authorizer], ["Transaction hash", augustReference], ["Network", "Stellar Testnet preview · Testnet USDC"],
        ]} />
        <PayoutTransaction hash={augustReference} />
      </>}
      {phase === "declined" && <>
        <span className="payout-eyebrow payout-red">Wallet request declined</span>
        <h2 className="payout-result-amount">No group funds moved.</h2>
        <p>The wallet declined the request before submission. You can review the payout again.</p>
        <PayoutFacts rows={[
          ["Intended payout", `${value} · ${pool.recipient} · Cycle ${cycle.number}`],
          ["Transaction hash", "None"], ["Available group funds", usdc(available)],
          ["Completed cycle payouts", String(history.length)], ["Approvals", `${approvals} of ${circle.members} recorded`],
        ]} />
        <div className="payout-actions">
          <button className="payout-button" data-tone="green" onClick={() => setStep("review")}>Review payout again</button>
          <PayoutLink href={back} tone="soft">Back to eligible payout</PayoutLink>
        </div>
      </>}
    </section>
    {phase !== "paid" && <aside className={phase === "review" || phase === "wallet" ? "payout-note payout-stack" : "payout-stack"}>
      <h3>{phase === "pending" ? "Accounting updates after confirmation" : phase === "declined" ? "Review eligibility before retrying" : "Release conditions are checked again"}</h3>
      <p>{phase === "pending" ? `The group has ${usdc(available)} available while this payout is pending.` : "The preview rechecks funding, approvals and prior execution before submission."}</p>
    </aside>}
  </>;
}
