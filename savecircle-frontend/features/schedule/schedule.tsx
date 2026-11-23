"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useWalletSession } from "@/lib/wallet-session";
import { circleDate, circleLabel } from "../circles/api";
import { CircleReader } from "../circles/circle-reader";
import { ledgerHref } from "../ledger/model";
import { readSchedule, type ScheduleCycle } from "./api";
import { Calendar } from "./calendar";
import { Contribute } from "./contribute";
import { Action, Badge, Heading, scheduleHref } from "./components";

export function CycleStatus({ status }: { status: string }) {
  return <Badge tone={status === "OVERDUE" ? "red" : status === "PENDING" ? "amber" : status === "UPCOMING" ? "neutral" : "green"}>{circleLabel(status)}</Badge>;
}

function CycleList({ cycles }: { cycles: ScheduleCycle[] }) {
  const [filter, setFilter] = useState("");
  const statuses = [...new Set(cycles.map(({ status }) => status))];
  const matches = cycles.filter(({ status }) => !filter || status === filter);
  return <section className="schedule-card schedule-table" aria-label="Circle cycles">
    <div className="schedule-filters" aria-label="Filter cycles">
      {["", ...statuses].map((status) => <button key={status} type="button" aria-pressed={filter === status} onClick={() => setFilter(status)}>{status ? circleLabel(status) : "All cycles"}</button>)}
    </div>
    {matches.length ? <table role="table">
      <thead><tr>{["Cycle / Due date", "Pool target", "Collected", "Status", "Scheduled recipient"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
      <tbody>{matches.map((cycle) => <tr key={cycle.cycleIndex} data-status={cycle.status === "OVERDUE" ? "Overdue" : undefined}>
        <th scope="row">Cycle {cycle.cycleIndex} · {circleDate(cycle.dueDate)}</th>
        <td data-label="Pool target">{cycle.targetAmount} USDC</td>
        <td data-label="Collected">{cycle.collectedAmount} USDC</td>
        <td data-label="Status"><CycleStatus status={cycle.status} /></td>
        <td data-label="Scheduled recipient">{cycle.recipientName}</td>
      </tr>)}</tbody>
    </table> : <p className="schedule-no-results">No cycles in this view.</p>}
  </section>;
}

export function Schedule() {
  const session = useWalletSession();
  const calendar = useSearchParams().get("view") === "calendar";
  return <div className="schedule">
    <Heading eyebrow="Your contributions" title="Contribution schedule" description="Circle cycles and your unpaid contributions. All dates are in UTC." />
    <CircleReader path="/dashboard/schedule" read={readSchedule}>{(circle, { cycles, obligations }, refresh) => <>
      <div className="schedule-toolbar">
        <p>{circle.name} · {circleLabel(circle.paymentFrequency)} · {circle.contributionAmount} USDC per member</p>
        <nav className="schedule-views" aria-label="Schedule view">
          <Action href={scheduleHref(circle.id)} tone={calendar ? "outline" : "primary"}>List</Action>
          <Action href={scheduleHref(circle.id, undefined, undefined, "calendar")} tone={calendar ? "primary" : "outline"}>Calendar</Action>
        </nav>
        <Action href={ledgerHref(circle.id)}>View my ledger</Action>
      </div>
      <section className="schedule-card schedule-upcoming">
        <h2>Your unpaid contributions</h2>
        {obligations.length > 0 && circle.onChainGroupId == null && <p>Register this circle on Stellar Testnet before contributing. <Action href={`/dashboard/circles?id=${encodeURIComponent(circle.id)}`}>View circle</Action></p>}
        {obligations.length > 0 && circle.onChainGroupId != null && <Action href={`/dashboard/group-management?circle=${encodeURIComponent(circle.id)}`}>Check Stellar membership</Action>}
        {obligations.length ? <ul>{obligations.map((item) => <li key={item.cycleIndex}>
          <strong>{circleDate(item.dueDate)}</strong><p>Cycle {item.cycleIndex}</p><strong>{item.amount} USDC</strong>
          <Badge tone={item.status === "OVERDUE" ? "red" : "neutral"}>{item.status === "OVERDUE" ? "Overdue" : "Scheduled"}</Badge>
          {session && circle.onChainGroupId != null && <Contribute circle={circle} session={session} cycleIndex={item.cycleIndex} amount={item.amount} refresh={refresh} />}
        </li>)}</ul> : <p>You have no unpaid contributions for this circle.</p>}
      </section>
      {calendar ? <Calendar cycles={cycles} /> : <CycleList cycles={cycles} />}
    </>}</CircleReader>
  </div>;
}
