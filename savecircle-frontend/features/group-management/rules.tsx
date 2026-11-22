import { useRef, useState } from "react";
import { DashboardDialog } from "../dashboard/controls";
import { usdc } from "../landing/plan";
import type { PayoutView } from "../payouts/model";
import { dateLabel, fullDate, monthName, paymentDeadline, previewToday } from "../schedule/model";
import { cycleRecipient } from "../schedule/pool";
import { GroupFacts, GroupLink } from "./components";
import { groupHref, groupPath, organizer, proposalReference } from "./model";
import type { ScheduleProposal } from "./records";

const rulesHref = groupHref("rules");
const nextDeadline = (date: Date) => `${dateLabel(date)}, 23:59 UTC`;
const defaultReason = "Give members two extra days to complete their monthly contributions without changing the agreed due date.";

export function Rules({ vm, proposal }: { vm: PayoutView; proposal?: ScheduleProposal }) {
  const { circle, plan, pool, next } = vm;
  return <div className="gm-columns">
    <div className="gm-stack">
      <section className="gm-card"><h2>Current agreed rules</h2><GroupFacts rows={[
        ["Savings model", "Fixed monthly contributions · Rotating payouts"],
        ["Members / acceptance", `${pool.people.length} active members · ${pool.people.length} accepted the rules`],
        ["Contribution per member", `${usdc(plan.amount)} each month`],
        ["Contribution dates", `${new Intl.ListFormat("en").format(plan.cycles.map(cycle => dateLabel(cycle.due)))}, 2025`],
        ["Payment deadline", `${circle.grace} days after due date · 23:59 UTC`],
        ["Cycle payout target", `${usdc(pool.target)} · ${circle.members} × ${usdc(plan.amount)}`],
        ["Full-round savings target", `${usdc(pool.target * plan.cycles.length)} across ${plan.cycles.length} cycles`],
        ["Protected action threshold", `${circle.approvals} of ${circle.members} distinct eligible members`],
      ]} /></section>
      <section className="gm-card"><h2>Agreed payout order</h2><GroupFacts rows={plan.cycles.map(cycle => [
        `Cycle ${cycle.number} · ${monthName(cycle.due)}`, `${cycleRecipient(circle, cycle.number, pool.people)} · ${usdc(pool.target)}`,
      ])} /></section>
    </div>
    <div className="gm-stack">
      {next && <aside className="gm-card gm-soft"><span className="gm-eyebrow">Next contribution</span>
        <h2>{dateLabel(next.due, { month: "long", day: "numeric" })}</h2>
        <strong>{usdc(plan.amount)} per member<br />Deadline: {nextDeadline(next.deadline)}</strong>
        <p>Each wallet authorizes its own contribution.</p>
      </aside>}
      <GroupLink href={groupHref("rules", { view: "proposal" })} primary>{proposal ? "View schedule proposal" : "Propose rule change"}</GroupLink>
      <p>Proposed changes require group approval before they can take effect.</p>
      <GroupLink href="/dashboard/schedule">View contribution schedule</GroupLink>
    </div>
  </div>;
}

export function ProposalDraft({ vm, submit }: { vm: PayoutView; submit: (draft: ScheduleProposal) => void }) {
  const current = vm.circle.grace;
  const future = vm.plan.cycles.filter(cycle => cycle.status === "Upcoming" && cycle.due > previewToday);
  const [cycle, setCycle] = useState(future[0]?.number);
  const [days, setDays] = useState(current + 2);
  const [reason, setReason] = useState(defaultReason);
  const wallet = useRef<HTMLDialogElement>(null);
  const selected = future.find(item => item.number === cycle);
  if (!selected) return <section className="gm-card"><h2>There are no upcoming cycles to change.</h2><div><GroupLink href={rulesHref}>Back to rules</GroupLink></div></section>;
  return <div className="gm-columns">
    <form className="gm-card" onSubmit={event => { event.preventDefault(); if (reason.trim()) wallet.current?.showModal(); }}>
      <h2>Extend the payment window</h2><p>The proposed extension applies to a future cycle.</p>
      <GroupFacts rows={[
        ["Contribution amount", usdc(vm.plan.amount)], ["Frequency / due date", "Monthly · First of each month"],
        ["Approval threshold", `${vm.circle.approvals} of ${vm.circle.members}`],
      ]} />
      <label className="gm-field">Apply from<select value={selected.number} onChange={event => setCycle(Number(event.target.value))}>
        {future.map(item => <option key={item.number} value={item.number}>Cycle {item.number} · {fullDate(item.due)}</option>)}
      </select></label>
      <label className="gm-field">New payment window<select value={days} onChange={event => setDays(Number(event.target.value))}>
        {[4, 5, 6, 7, 10, 14].map(value => <option key={value} value={value}>{value} days after the due date</option>)}
      </select></label>
      <label className="gm-field">Reason visible to all members<textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={500} rows={3} required /></label>
      <button className="gm-button" data-primary aria-haspopup="dialog" disabled={!reason.trim()}>Submit for group approval</button>
      <GroupLink href={rulesHref}>Cancel proposal</GroupLink>
    </form>
    <div className="gm-stack">
      <aside className="gm-card gm-dark"><span className="gm-eyebrow">Proposed {monthName(selected.due)} deadline</span>
        <h2>{dateLabel(selected.deadline)} → {dateLabel(paymentDeadline(selected.due, days))}</h2>
        <p>With group approval, members would have {days} days after {dateLabel(selected.due)} to contribute.</p>
      </aside>
      <aside className="gm-card gm-soft"><h2>{vm.circle.approvals} of {vm.circle.members} approvals required</h2><p>Each vote must come from a distinct eligible member wallet.</p></aside>
    </div>
    <dialog className="wallet-dialog" ref={wallet} aria-labelledby="proposal-wallet-title">
      <h2 id="proposal-wallet-title">Stellar Testnet preview wallet</h2><p>Sign the proposal for a {days}-day payment window from Cycle {selected.number}.</p>
      <div className="gm-stack">
        <button type="button" className="gm-button" data-primary onClick={() => { wallet.current?.close(); submit({ cycle: selected.number, days, reason }); }}>Sign preview proposal</button>
        <button type="button" className="gm-button" onClick={() => wallet.current?.close()}>Decline signature</button>
      </div>
    </dialog>
  </div>;
}

export function ProposalStatus({ vm, proposal, confirm }: { vm: PayoutView; proposal: ScheduleProposal; confirm: () => void }) {
  const selected = vm.plan.cycles.find(cycle => cycle.number === proposal.cycle);
  const pending = proposal.phase === "registering";
  const transaction = <DashboardDialog className="gm-button" title="Preview proposal transaction" label="View transaction details ↗">
    <GroupFacts rows={[["Reference", proposalReference], ["Network", "Stellar Testnet preview"]]} />
  </DashboardDialog>;
  return <div className="gm-columns">
    <section className={`gm-card${pending ? " gm-amber" : ""}`}>
      <span className="gm-eyebrow">{pending ? "Proposal registration pending" : "SC-004 · Pending group approval"}</span>
      <h2>{pending ? "Your proposal is being confirmed." : "Extend the payment window"}</h2>
      <GroupFacts rows={[
        ["Current / proposed window", `${vm.circle.grace} days → ${proposal.days} days`],
        ["Intended first cycle", selected ? `Cycle ${selected.number} · ${fullDate(selected.due)}` : `Cycle ${proposal.cycle}`],
        ["Proposed first deadline", selected ? nextDeadline(paymentDeadline(selected.due, proposal.days)) : "—"],
        ["Reason", proposal.reason], ["Submitted by", `${organizer.name} · ${organizer.wallet}`],
        [pending ? "Submitted at" : "Registered at", `Aug 5, 2025 · ${pending ? "10:08" : "10:09"} UTC`],
        ["Transaction reference", `${proposalReference} · ${pending ? "Pending" : "Confirmed"}`],
      ]} />
      {pending ? <><button className="gm-button" data-primary onClick={confirm}>Check proposal status</button>{transaction}</> : <>
        <h2>0 of {vm.circle.approvals} required approvals</h2>
        <GroupFacts rows={vm.pool.people.map(name => [name, "Awaiting approval"])} />
      </>}
    </section>
    <div className="gm-stack">
      <aside className={`gm-card ${pending ? "gm-soft" : "gm-amber"}`}><span className="gm-eyebrow">{pending ? "Current rules" : "Awaiting group approval"}</span>
        <h2>The {vm.circle.grace}-day rule still applies.</h2>
        {selected && <p>Current {monthName(selected.due)} deadline: {nextDeadline(selected.deadline)}.</p>}
        <p>Group approval requires {vm.circle.approvals} distinct member votes.</p>
      </aside>
      <GroupLink href={pending ? rulesHref : groupPath} primary>{pending ? "Back to rules" : "Back to group members"}</GroupLink>
      {!pending && transaction}
    </div>
  </div>;
}
