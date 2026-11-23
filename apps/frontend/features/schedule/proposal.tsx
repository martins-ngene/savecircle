import { useState } from "react";
import type { SavedCircle } from "../circles/model";
import type { ScheduleProposal } from "../group-management/records";
import { usdc } from "../landing/plan";
import { Action, Badge, Facts, Heading } from "./components";
import { dateLabel, fullDate, monthName, paymentDeadline, type Cycle } from "./model";
import { updateSchedulePreview } from "./storage";

export function Proposal({ circle, cycles, today, proposal, back }: { circle: SavedCircle; cycles: Cycle[]; today: Date; proposal?: ScheduleProposal; back: string }) {
  const upcoming = cycles.filter(cycle => cycle.due > today && cycle.status === "Upcoming");
  const [number, setNumber] = useState(proposal?.cycle ?? upcoming[0]?.number ?? 0);
  const [days, setDays] = useState(proposal?.days ?? circle.grace + 2);
  const [reason, setReason] = useState(proposal?.reason ?? (circle.id === "surulere" ? "Give members two extra days to complete their monthly contributions without changing the agreed due date." : ""));
  const selected = (proposal ? cycles : upcoming).find(cycle => cycle.number === number);
  const approvals = `${circle.approvals} of ${circle.members}`;
  const windows = [1, 2, 3, 4, 5, 6, 7, 10, 14, days].filter(value => value > circle.grace);
  const options = [...new Set(windows)].sort((a, b) => a - b);

  return <>
    <Heading eyebrow="Your contributions" title="Propose a schedule change" description={`${circle.name} · Financial rule changes require group approval.`} />
    <div className="schedule-toolbar"><Badge>{circle.id === "surulere" ? "ORGANIZER · KELECHI M." : "ORGANIZER PREVIEW"}</Badge>
      <p>Changes apply only after {approvals} members approve.</p><Action href={back}>← Schedule</Action>
    </div>
    <div className="schedule-columns">
      <form className="schedule-card schedule-payment schedule-stack" onSubmit={event => {
        event.preventDefault();
        if (!selected || !reason.trim() || proposal) return;
        updateSchedulePreview(circle.id, preview => preview.proposal ? preview : { ...preview, proposal: { cycle: number, days, reason: reason.trim() } });
      }}>
        <h2>Extend the payment window</h2>
        <Facts rows={[["Contribution amount", usdc(Math.round(Number(circle.amount) * 100))], ["Payment frequency", circle.frequency], ["Current payment window", `${circle.grace} days after the due date`]]} />
        {proposal && <div className="schedule-card schedule-soft" role="status"><strong>{proposal.phase === "registering" ? "Registration pending" : "Pending approval"}</strong>{proposal.phase === "registering" ? <Action href="/dashboard/group-management?tab=rules&view=proposal">Check proposal status →</Action> : <p>Your preview proposal was submitted for group approval.</p>}</div>}
        {!selected ? <p>No future cycles are available for a payment window extension.</p> : <>
          <label htmlFor="schedule-proposal-cycle">Apply from</label>
          <select id="schedule-proposal-cycle" value={number} onChange={event => setNumber(Number(event.target.value))} disabled={!!proposal}>
            {(proposal ? [selected] : upcoming).map(cycle => <option key={cycle.number} value={cycle.number}>Cycle {cycle.number} · {fullDate(cycle.due)}</option>)}
          </select>
          <label htmlFor="schedule-proposal-days">New payment window</label>
          <select id="schedule-proposal-days" value={days} onChange={event => setDays(Number(event.target.value))} disabled={!!proposal}>
            {options.map(value => <option key={value} value={value}>{value} days after the due date</option>)}
          </select>
          <label htmlFor="schedule-proposal-reason">Reason for change</label>
          <textarea id="schedule-proposal-reason" value={reason} onChange={event => setReason(event.target.value)} required readOnly={!!proposal} maxLength={500} />
          <p>This reason will be visible to all circle members.</p>
          {!proposal && <div className="schedule-actions"><button className="schedule-button primary" disabled={!reason.trim()} type="submit">Submit for group approval</button><Action href={back}>Cancel</Action></div>}
          <p>Organizer preview · No wallet signature or payment is required to try it.</p>
        </>}
      </form>
      <div className="schedule-stack">
        {selected && <section className="schedule-card schedule-dark schedule-stack">
          <h2>What would change?</h2><p>{monthName(selected.due)} deadline</p>
          <strong className="schedule-amount schedule-highlight">{dateLabel(selected.deadline)} → {dateLabel(paymentDeadline(selected.due, days))}</strong>
          <p>The proposed window gives members {days} days after {dateLabel(selected.due)} to contribute.</p>
        </section>}
        <section className="schedule-card schedule-stack"><Badge>{approvals.toUpperCase()} APPROVALS</Badge><h3>Group approval required</h3>
          <p>Members can review the new deadline and reason. The current rules remain in force until approval is complete.</p><strong>After submission · Pending approval</strong>
        </section>
      </div>
    </div>
  </>;
}
