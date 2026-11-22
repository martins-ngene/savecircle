import { useState } from "react";
import type { SavedCircle } from "../circles/model";
import { DashboardDialog } from "../dashboard/controls";
import { member } from "../dashboard/model";
import { ledgerHref } from "../ledger/model";
import { usdc } from "../landing/plan";
import { Action, Badge, Facts, Heading, StatusBadge, scheduleHref } from "./components";
import { buildSchedule, canPay, dateLabel, fullDate, monthName, monthYear, type Cycle } from "./model";
import { contributionPool } from "./pool";
import { updateSchedulePreview } from "./storage";

type Plan = ReturnType<typeof buildSchedule>;
type Props = { circle: SavedCircle; cycle: Cycle; plan: Plan };
export function Contribution({ circle, cycle, plan, view }: Props & { view: string }) {
  const pool = contributionPool(circle, cycle, plan.amount);
  return <>
    <Heading eyebrow={`Schedule / ${circle.name}`} title={`${monthName(cycle.due)} contribution`}
      description={`Cycle ${cycle.number} of ${plan.cycles.length} · ${dateLabel(cycle.due)}–${cycle.end.getUTCMonth() === cycle.due.getUTCMonth() ? cycle.end.getUTCDate() + ", " + cycle.end.getUTCFullYear() : fullDate(cycle.end)} · ${circle.frequency}`}>
      <Action href={scheduleHref(circle.id, undefined, undefined, view)}>← Back to schedule</Action>
    </Heading>
    {cycle.status === "Overdue" && <section className="schedule-card schedule-alert">
      <h3>Your payment deadline has passed</h3><p>{usdc(plan.amount)} remains unpaid. Due {dateLabel(cycle.due)}. The payment window ended {dateLabel(cycle.deadline)} at 23:59 UTC.</p>
    </section>}
    <div className="schedule-columns">
      <div className="schedule-stack">
        <section className="schedule-card schedule-dark schedule-stack">
          <div className="schedule-month"><h3>Cycle pool</h3><Badge tone="lime">{pool.percent}% FUNDED</Badge></div>
          <strong className="schedule-amount">{usdc(pool.collected).replace(" USDC", "")} / {usdc(pool.target)}</strong>
          <progress value={pool.percent} max={100} aria-label="Cycle pool funding" />
          <p>{pool.paidMembers} of {circle.members} members have contributed.{pool.paidMembers === circle.members - 1 && cycle.paid === 0 && canPay(cycle) ? " Your payment completes the pool." : ""}</p>
        </section>
        <section className="schedule-card">
          <h2>Member contributions</h2><p>Expected: {usdc(plan.amount)} per member</p>
          <ul className="schedule-members">{pool.people.map(person => {
            const you = person === member.name;
            const status = you ? cycle.status : pool.otherPaid ? "Paid" : cycle.status === "Pending" || cycle.status === "Paid" ? "Due" : cycle.status;
            return <li key={person}><strong>{person}{person === pool.recipient ? " · Recipient" : ""}{you ? " · You" : ""}</strong><span>{usdc(status === "Paid" ? plan.amount : 0)}</span><StatusBadge status={status} /></li>;
          })}</ul>
        </section>
      </div>
      <div className="schedule-stack">
        <section className="schedule-card schedule-stack">
          <StatusBadge status={cycle.status} />
          <h2>Your contribution</h2><strong className="schedule-amount">{usdc(plan.amount)}</strong>
          <Facts rows={[["Expected", usdc(plan.amount)], ["Paid", usdc(cycle.paid)], ["Deadline", `${dateLabel(cycle.deadline)}, 23:59`]]} />
          {(canPay(cycle) || cycle.status === "Pending" || cycle.status === "Paid") && <Action tone="primary" href={scheduleHref(circle.id, cycle.status === "Paid" ? "receipt" : "pay", cycle.number, view)}>
            {cycle.status === "Paid" ? "View receipt →" : cycle.status === "Pending" ? "Check payment →" : `Pay ${plan.amount / 100} USDC →`}
          </Action>}
          <p>Preview wallet · {member.wallet}<br />Active member · Rules accepted</p>
        </section>
        <section className="schedule-card schedule-soft schedule-stack">
          <h3>{pool.recipient} receives this cycle</h3>
          <p>The {pool.target / 100} USDC payout stays locked until the pool is fully funded and {circle.approvals} of {circle.members} members approve.</p>
          {circle.id === "surulere" && <strong>Your payout · Cycle 4 · Sep 2025</strong>}
        </section>
      </div>
    </div>
  </>;
}

function Steps({ step }: { step: number }) {
  return <ol className="schedule-card schedule-steps" aria-label="Payment progress">
    {["Review payment", "Wallet approval", "Confirmation"].map((name, index) =>
      <li key={name} aria-current={step === index ? "step" : undefined} data-done={index < step}>
        <span aria-hidden="true">{index < step ? "✓" : index + 1}</span>{name}
      </li>)}
  </ol>;
}

export function PaymentFlow({ circle, cycle, plan, today, back, backLabel = "Back to schedule" }: Props & { today: Date; back: string; backLabel?: string }) {
  const [phase, setPhase] = useState<"review" | "wallet" | "declined">("review");
  const state = cycle.status === "Paid" ? "paid" : cycle.status === "Pending" ? "pending" : phase;
  const pool = contributionPool(circle, cycle, plan.amount);
  const period = `Cycle ${cycle.number} · ${monthYear(cycle.due)}`;
  const amount = usdc(plan.amount);
  const next = plan.cycles.find(item => item.number > cycle.number && item.status === "Upcoming");
  const demoDate = cycle.payment ? new Date(cycle.payment.date) : cycle.due;
  const late = demoDate > cycle.deadline;
  const titles = {
    review: ["Review your contribution", "Check the group, cycle and wallet before you continue."],
    wallet: ["Approve in your wallet", "Review the simulated wallet request for this contribution."],
    declined: ["Payment not completed", "Your contribution is still outstanding. You can safely try again."],
    pending: ["Confirming your contribution", "Your preview wallet approved the payment. Check the demo confirmation status."],
    paid: ["Contribution received", "Your confirmed payment is recorded in this preview."],
  } as const;

  function updatePayment(nextState: "pending" | "paid") {
    updateSchedulePreview(circle.id, preview => {
      const previous = preview.payments?.[cycle.number];
      if ((nextState === "pending" && previous) || (nextState === "paid" && previous?.state !== "pending")) return preview;
      return { ...preview, payments: { ...preview.payments, [cycle.number]: { state: nextState, date: today.toISOString() } } };
    });
    setPhase("review");
  }

  const transactionDetails = <DashboardDialog className="schedule-button outline" title="Preview transaction" label="View transaction details ↗">
    <Facts rows={[["Savings circle", circle.name], ["Contribution cycle", period], ["Reference", "8f2a…c91d"], ["Network", "Stellar Testnet preview"]]} />
    <p>This sample reference is available only in the preview.</p>
  </DashboardDialog>;

  return <>
    <Heading eyebrow={`Schedule / ${circle.name}`} title={titles[state][0]} description={titles[state][1]}>
      <Action href={back}>← {backLabel}</Action>
    </Heading>
    <Steps step={state === "review" ? 0 : state === "paid" ? 3 : state === "pending" ? 2 : 1} />
    <div className="schedule-columns">
      <section className="schedule-card schedule-payment schedule-stack" aria-label={titles[state][0]}>
        {state === "review" && <>
          <Badge>FIXED CONTRIBUTION</Badge><strong className="schedule-amount schedule-amount-large">{amount}</strong><p>Simulated Testnet payment · No real money</p>
          <Facts rows={[
            ["Savings circle", circle.name], ["Contribution period", period], ["Due date", fullDate(cycle.due)],
            ["Payment deadline", `${dateLabel(cycle.deadline)}, 23:59 UTC · ${cycle.status}`], ["Destination", "Circle savings contract"],
          ]} />
          <h3>Paying from your registered wallet</h3>
          <Facts rows={[["Member", member.name], ["Wallet", `${member.wallet} · Preview`], ["Available balance", usdc(35_000)], ["Network fee", "Shown in wallet · XLM"]]} />
          <div className="schedule-card schedule-soft"><strong>You stay in control</strong><p>Each one-time contribution requires your wallet approval.</p></div>
          <button className="schedule-button primary" onClick={() => setPhase("wallet")}>Continue to wallet →</button>
          <p>Your wallet will show the final transaction details before signing.</p>
        </>}
        {state === "wallet" && <>
          <Badge>WALLET PREVIEW</Badge><h2>Approve {amount}</h2>
          <Facts rows={[["Savings circle", circle.name], ["Contribution cycle", period], ["Wallet", member.wallet], ["Network", "Stellar Testnet preview"]]} />
          <p>Choose a response to try the confirmation or declined screen.</p>
          <button className="schedule-button primary" onClick={() => updatePayment("pending")}>Approve preview payment</button>
          <button className="schedule-button outline" onClick={() => setPhase("declined")}>Decline wallet request</button>
        </>}
        {state === "declined" && <>
          <span className="schedule-result-icon schedule-alert" aria-hidden="true">×</span><Badge tone="red">NOT SUBMITTED</Badge>
          <h2>The wallet request was declined.</h2><p>The payment was not signed, so no transaction was sent to the network.</p>
          <div className="schedule-card schedule-soft"><strong>No funds moved. No network fee charged.</strong><p>Your balances and payment history have not changed.</p></div>
          <Facts rows={[["Savings circle", circle.name], ["Contribution cycle", period], ["Amount still due", amount], ["Transaction reference", "None · Not submitted"]]} />
          <button className="schedule-button primary" onClick={() => setPhase("review")}>Try again →</button><Action href={back}>{backLabel}</Action>
        </>}
        {state === "pending" && <>
          <span className="schedule-result-icon schedule-soft" aria-hidden="true">…</span><Badge tone="amber">AWAITING CONFIRMATION</Badge>
          <h2>Your payment is on its way.</h2><h3>{amount} · {circle.name}</h3>
          <p>You can leave this page and return to check confirmation in the preview.</p>
          <Facts rows={[["1. Wallet authorization", "Approved ✓"], ["2. Transaction submitted", "Simulated ✓"], ["3. Network confirmation", "In progress…"]]} />
          <Facts rows={[["Contribution cycle", period], ["Transaction reference", "8f2a…c91d · Demo"], ["Network", "Stellar Testnet preview"]]} />
          <div className="schedule-button schedule-neutral" role="status">Confirmation pending</div>
          <div className="schedule-result-actions"><button className="schedule-button outline" onClick={() => updatePayment("paid")}>Check status</button>{transactionDetails}</div>
        </>}
        {state === "paid" && <>
          <div className="schedule-card schedule-confirmed"><strong>✓ PAYMENT CONFIRMED</strong><strong className="schedule-amount schedule-amount-large">{amount}</strong>
            <h2>Thank you, Ada.{plan.outstanding === 0 ? " You’re caught up." : ""}</h2>
          </div>
          <Badge>{late ? "PAID LATE · NOW SETTLED" : "PAID"}</Badge>
          <Facts rows={[["Savings circle", circle.name], ["Contribution cycle", period], ["Paid on", cycle.payment ? `${fullDate(demoDate)} · ${demoDate.toISOString().slice(11, 16)} UTC` : `${fullDate(demoDate)} · Sample`],
            ["Paid by", `${member.name} · ${member.wallet}`], ["Transaction reference", cycle.payment ? "8f2a…c91d · Demo" : "Sample receipt"], ["Network", "Stellar Testnet preview"]]} />
          <Facts rows={[["Your paid contributions", `${usdc(plan.paid).replace(" USDC", "")} / ${usdc(plan.amount * plan.cycles.length)}`], ["Outstanding to date", usdc(plan.outstanding)]]} />
          <Action href={back} tone="primary">{backLabel}</Action>
          {cycle.payment && transactionDetails}
          {backLabel !== "Back to ledger" && <Action href={ledgerHref(circle.id, { receipt: String(cycle.number) })}>View ledger receipt →</Action>}
        </>}
      </section>
      <div className="schedule-stack">
        {(state === "review" || state === "wallet") && <>
          <section className="schedule-card schedule-dark schedule-stack">
            <h2>One step closer to a full pool</h2><strong className="schedule-highlight">{pool.collected / 100} / {pool.target / 100} USDC collected</strong>
            <p>{pool.paidMembers === circle.members - 1 ? `Your ${plan.amount / 100} USDC contribution completes this cycle’s funding.` : "Your contribution goes toward this cycle’s funding."}</p>
            <div>Recipient: {pool.recipient}.<br />Payout still needs group approvals.</div>
          </section>
          <section className="schedule-card schedule-stack"><h3>Ready to contribute</h3>
            <ul className="schedule-checklist">{["Active membership", "Group rules accepted", "Registered wallet matches", "Stellar Testnet preview"].map(item => <li key={item}>✓ {item}</li>)}</ul>
            <p>The contribution amount is fixed by the agreed circle rules.</p>
          </section>
        </>}
        {state === "declined" && <section className="schedule-card schedule-stack">
          <h3>Before you try again</h3><ol className="schedule-retry"><li>Keep your wallet unlocked.</li><li>Use the registered wallet {member.wallet} on Stellar Testnet.</li><li>Check the amount and approve the wallet request.</li></ol>
          <strong className="schedule-red">Payment status: {cycle.status}</strong><p>{amount} remains outstanding until a contribution is confirmed.</p>
        </section>}
        {state === "pending" && <>
          <section className="schedule-card schedule-amber schedule-stack"><h3>No need to pay again</h3><p>Check the status of this preview payment while confirmation is pending.</p></section>
          <section className="schedule-card schedule-stack"><h3>Until it’s confirmed</h3><Facts rows={[["Paid to date", usdc(plan.paid)], ["Outstanding", usdc(plan.outstanding)]]} /><p>Balances and contribution history update after confirmation.</p></section>
        </>}
        {state === "paid" && <>
          <section className="schedule-card schedule-dark schedule-stack"><Badge tone="lime">{pool.percent}% FUNDED</Badge><strong className="schedule-amount">{usdc(pool.collected)}</strong>
            <p>{pool.paidMembers === circle.members ? `All ${circle.members} members have contributed.` : `${pool.paidMembers} of ${circle.members} members have contributed.`}</p>
            <strong>{pool.recipient}’s payout requires {circle.approvals} of {circle.members} member approvals.</strong>
          </section>
          {next && <section className="schedule-card schedule-stack"><h3>Your next contribution</h3>
            <h2>{dateLabel(next.due, { month: "long", day: "numeric" })}</h2><p>{amount} · Cycle {next.number} of {plan.cycles.length}</p>
            {circle.id === "surulere" && next.number === 4 && <Badge>YOUR PAYOUT MONTH</Badge>}
            <p>You’ll approve your next payment separately.</p>
          </section>}
        </>}
      </div>
    </div>
  </>;
}
