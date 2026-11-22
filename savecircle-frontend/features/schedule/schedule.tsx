"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { sampleCircles, type SavedCircle } from "../circles/model";
import { useSavedCircles } from "../circles/storage";
import { ledgerHref } from "../ledger/model";
import { usdc } from "../landing/plan";
import { Calendar } from "./calendar";
import { Action, Badge, Heading, StatusBadge, Totals, scheduleHref } from "./components";
import { buildSchedule, canPay, dateLabel, fullDate, monthName, monthYear, previewToday, referenceCircle, type Status } from "./model";
import { Contribution, PaymentFlow } from "./payment";
import { Proposal } from "./proposal";
import { useSchedulePreview } from "./storage";

function EmptySchedule() {
  return <>
    <Heading eyebrow="Your contributions" title="Contribution schedule" description="Every contribution has a place. Start with your first circle." />
    <Totals expected={0} paid={0} outstanding={0} expectedNote="No active contributions" paidNote="No active contributions" outstandingNote="No active contributions" />
    <section className="schedule-card schedule-empty">
      <div><Badge>LET’S GET STARTED</Badge><h2>Your schedule starts with a circle.</h2>
        <p>Join a savings circle or create one with people you trust. Your due dates, payment reminders and contribution history will appear here.</p>
        <div className="schedule-actions"><Action href="/connect" tone="primary">Join a circle</Action><Action href="/dashboard/circles/create">Create a circle</Action></div>
      </div>
      <ol>{[
        ["Agree on your plan", "Accept the amount, frequency and group rules."],
        ["See what’s due", "Track each cycle and its payment deadline."],
        ["Pay with your wallet", "Authorize each USDC payment yourself."],
      ].map(([title, body], index) => <li key={title}><Badge>0{index + 1}</Badge><h3>{title}</h3><p>{body}</p></li>)}</ol>
    </section>
    <p>Already joined? Make sure the connected wallet matches the wallet registered in your circle.</p>
  </>;
}

type Plan = ReturnType<typeof buildSchedule>;

function PaymentList({ circle, plan, toolbar }: { circle: SavedCircle; plan: Plan; toolbar: ReactNode }) {
  const [filter, setFilter] = useState("All payments");
  const overdue = plan.cycles.filter(cycle => cycle.status === "Overdue");
  const active = overdue[0] ?? plan.cycles.find(cycle => canPay(cycle) || cycle.status === "Pending");
  const dateWindow = plan.elapsed.length > 1 ? `${dateLabel(plan.elapsed[0].due, { month: "short" })}–${dateLabel(plan.elapsed.at(-1)!.due, { month: "short", year: "numeric" })}` : plan.elapsed[0] ? monthYear(plan.elapsed[0].due) : "";
  const filters = ["All payments", "Upcoming", "Paid", "Overdue", "Due", "Pending"];
  const counts = (status: string) => status === "All payments" ? plan.cycles.length : plan.cycles.filter(cycle => cycle.status === status).length;
  return <>
    <Totals {...plan} expectedNote={plan.elapsed.length > 1 ? `Cycles 1–${plan.elapsed.length} · ${dateWindow}` : dateWindow || "No contributions due yet"} paidNote={`${counts("Paid")} confirmed contribution${counts("Paid") === 1 ? "" : "s"}`}
      outstandingNote={overdue.length ? `${overdue.length} overdue contribution${overdue.length === 1 ? "" : "s"}` : plan.outstanding ? "Unconfirmed contributions" : "You’re caught up"} />
    {active && <section className="schedule-card schedule-dark schedule-hero">
      <div><Badge tone="lime">{active.status === "Pending" ? "AWAITING CONFIRMATION" : "ACTION NEEDED"}</Badge>
        <h2>{active.status === "Pending" ? "Your payment is on its way." : `Your ${monthName(active.due)} contribution is ${active.status.toLowerCase()}.`}</h2>
        <p>{circle.name} · Cycle {active.number} of {plan.cycles.length}</p><strong className="schedule-amount">{usdc(plan.amount)}</strong>
      </div>
      <div><strong>Due {dateLabel(active.due)} · Deadline {dateLabel(active.deadline)}, 23:59 UTC</strong>
        <Action tone="lime" href={scheduleHref(circle.id, "pay", active.number)}>{active.status === "Pending" ? "Check payment →" : "Pay contribution →"}</Action>
        <small>{active.status === "Pending" ? "Check confirmation before paying again." : "You approve this payment in your wallet."}</small>
      </div>
    </section>}
    {toolbar}
    <section className="schedule-card schedule-table" aria-label="Payments">
      <div className="schedule-filters" aria-label="Filter payments">
        {filters.filter(status => status === filter || !["Due", "Pending"].includes(status) || counts(status) > 0).map(status =>
          <button key={status} aria-pressed={filter === status} data-status={status} onClick={() => setFilter(status)}>{status} <span>{counts(status)}</span></button>)}
      </div>
      <table role="table">
        <caption className="dash-visually-hidden">Contribution payments</caption>
        <thead><tr>{["Cycle / Due date", "Expected", "Paid", "Status", "Deadline", "Action"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{plan.cycles.filter(cycle => filter === "All payments" || cycle.status === filter as Status).map(cycle => (
          <tr key={cycle.number} data-status={cycle.status}>
            <th scope="row"><Link href={scheduleHref(circle.id, "detail", cycle.number)}>Cycle {cycle.number} · {fullDate(cycle.due)}</Link></th>
            <td data-label="Expected">{usdc(plan.amount)}</td><td data-label="Paid">{usdc(cycle.paid)}</td>
            <td data-label="Status"><StatusBadge status={cycle.status} /></td><td data-label="Deadline">{dateLabel(cycle.deadline)}</td>
            <td><Link href={scheduleHref(circle.id, cycle.status === "Paid" ? "receipt" : canPay(cycle) || cycle.status === "Pending" ? "pay" : "detail", cycle.number)}>
              {cycle.status === "Paid" ? "View receipt ↗" : canPay(cycle) ? "Pay now →" : cycle.status === "Pending" ? "Check payment →" : "View details"}
            </Link></td>
          </tr>))}
        </tbody>
      </table>
      {counts(filter) === 0 && <p className="schedule-no-results" role="status">No payments in this view.</p>}
    </section>
  </>;
}

export function Schedule() {
  const params = useSearchParams();
  const router = useRouter();
  const circles = [referenceCircle, ...useSavedCircles(), ...sampleCircles];
  const requestedId = params.get("circle") ?? referenceCircle.id;
  const circle = circles.find(item => item.id === requestedId);
  const preview = useSchedulePreview(requestedId);
  const isSample = [referenceCircle, ...sampleCircles].some(item => item.id === requestedId);
  const today = isSample ? previewToday : new Date();
  const view = params.get("view") === "calendar" ? "calendar" : "list";
  const screen = params.get("screen");
  const fromLedger = params.get("from") === "ledger";
  if (!circle || params.get("empty") === "1") return <div className="schedule"><EmptySchedule /><Link className="schedule-inline" href={scheduleHref()}>Back to sample schedule</Link></div>;

  const plan = buildSchedule(circle, today, preview.payments ?? {});
  const cycle = plan.cycles.find(item => String(item.number) === params.get("cycle"));
  const back = scheduleHref(circle.id, undefined, undefined, view);
  const toolbar = <div className="schedule-toolbar">
    <select aria-label="Savings circle" value={circle.id} onChange={event => router.push(event.target.value ? scheduleHref(event.target.value, undefined, undefined, view) : "/dashboard/schedule?empty=1")}>
      {circles.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      <option value="">Empty schedule preview</option>
    </select>
    <p>{circle.frequency} · {circle.members} members · {plan.amount / 100} USDC per cycle</p>
    <nav className="schedule-views" aria-label="Schedule view">
      {["list", "calendar"].map(mode => <Link key={mode} className={`schedule-button ${mode === view ? "primary" : "outline"}`}
        href={scheduleHref(circle.id, undefined, undefined, mode)} aria-current={mode === view ? "page" : undefined}>{mode === "list" ? "List" : "Calendar"}</Link>)}
    </nav>
  </div>;
  return <div className="schedule">
    {screen === "rules" ? <Proposal key={circle.id} circle={circle} cycles={plan.cycles} today={today} proposal={preview.proposal} back={back} />
      : cycle && screen === "detail" ? <Contribution circle={circle} cycle={cycle} plan={plan} view={view} />
      : cycle && (screen === "pay" || screen === "receipt") && (canPay(cycle) || cycle.status === "Pending" || cycle.status === "Paid") ?
        <PaymentFlow key={`${circle.id}:${cycle.number}`} circle={circle} cycle={cycle} plan={plan} today={today} back={fromLedger ? ledgerHref(circle.id) : back} backLabel={fromLedger ? "Back to ledger" : "Back to schedule"} />
      : <>
        <Heading eyebrow={view === "calendar" ? "Plan ahead" : "Your contributions"}
          title={view === "calendar" ? "Your contribution calendar" : "Contribution schedule"}
          description={view === "calendar" ? "Due dates, payment deadlines and upcoming cycles in one place." : "Keep every payment in view. All dates shown in UTC."}>
          <Action href={scheduleHref(circle.id, "rules", undefined, view)}>Schedule rules</Action>
        </Heading>
        {view === "calendar" ? <>{toolbar}<Calendar key={circle.id} circle={circle} cycles={plan.cycles} today={today} amount={plan.amount} /></> : <PaymentList key={circle.id} circle={circle} plan={plan} toolbar={toolbar} />}
      </>}
    <p className="schedule-preview-note">{isSample ? "Sample data · Preview date August 5, 2025" : "Circle preview · Saved in this browser"}</p>
  </div>;
}
