import Link from "next/link";
import { Fragment } from "react";
import { usdc } from "../landing/plan";
import type { PayoutView } from "../payouts/model";
import { dateLabel, monthYear } from "../schedule/model";
import { GroupFacts, GroupLink, GroupStats, GroupTable } from "./components";
import { exitDate, groupHref, type GroupMember } from "./model";

const filters = ["All", "Active", "Invited", "Inactive", "Exited"];

export function Members({ vm, members, filter }: { vm: PayoutView; members: GroupMember[]; filter: string }) {
  const active = members.length;
  const empty = ["Invited", "Inactive", "Exited"].includes(filter);
  const filtersNav = <nav className="gm-filters" aria-label="Filter members by status">
    {filters.map(name => <Link key={name} href={groupHref("members", name === "All" ? {} : { filter: name.toLowerCase() })}
      className="gm-button" aria-current={filter === name ? "page" : undefined}>{name} {name === "All" || name === "Active" ? active : 0}</Link>)}
  </nav>;
  if (empty) return <>
    {filtersNav}
    <section className="gm-card">
      <span className="gm-eyebrow">No {filter.toLowerCase()} members</span>
      <h2>All {active} registered members are active.</h2>
      <p>Ada’s exit request is pending. Membership changes require an authorized decision.</p>
      <div><GroupLink href={groupHref("members", { filter: "active" })} primary>Show active members</GroupLink></div>
    </section>
  </>;

  return <>
    <GroupStats items={[
      ["Active members", `${active} of ${vm.circle.members}`, "Circle places are filled"],
      [`Cycle ${vm.cycle.number} collected`, usdc(vm.pool.collected), `${vm.pool.paidMembers} of ${active} members paid`],
      ["Rules accepted", `${active} of ${vm.circle.members}`, "Registered wallets verified in preview"],
      ["Exit requests", "1 pending", "Awaiting eligibility review"],
    ]} />
    <section className="gm-card">
      {filtersNav}
      <GroupTable label="Member directory" layout="members" headers={["Member / role", "Registered wallet", "Status", "This cycle", "Payout position", ""]} rows={members.map(person => ({
        key: person.id,
        cells: [
          <Fragment key="member"><strong>{person.name}</strong><small>{person.role}{person.isAda ? " · Exit requested" : ""}</small></Fragment>,
          person.wallet, <strong key="status" className="gm-positive">Active</strong>,
          <Fragment key="contribution"><strong>{usdc(person.current.paid)}</strong><small>{person.current.late ? "Paid late · Now settled" : person.current.status === "Paid" ? "Paid · Confirmed" : person.current.status}</small></Fragment>,
          `Cycle ${person.position} · ${person.turnLabel}`,
          <Link key="details" href={groupHref("members", { member: person.id })} aria-label={`View details for ${person.name}`}>View details →</Link>,
        ],
      }))} />
    </section>
    <aside className="gm-card gm-soft"><h3>Pending exits keep their place in the circle.</h3><p>Contribution status and membership status are tracked separately. Refunds require eligibility checks and group authorization.</p></aside>
  </>;
}

export function MemberDetails({ person, vm }: { person: GroupMember; vm: PayoutView }) {
  return <div className="gm-columns">
    <div className="gm-stack">
      <section className="gm-card">
        <span className="gm-eyebrow">Active member · Registered wallet</span><h2>{person.name}</h2>
        <GroupFacts rows={[
          ["Wallet", person.wallet], ["Role / membership", `${person.role} · Active`],
          ["Group rules", "Accepted before participation"], ["Payout position", `${person.position} of ${vm.circle.members} · ${monthYear(person.turn.due)}`],
          ["Exit status", person.isAda ? "Requested · Pending eligibility review" : "Active"],
        ]} />
      </section>
      <GroupStats items={[["Historical contributions", usdc(person.contributed)], ["Payouts received", usdc(person.received)]]} />
      <section className="gm-card">
        <h2>Contribution obligations</h2>
        <GroupTable label="Contribution obligations" headers={["Cycle / due", "Expected", "Paid", "Status"]} rows={person.obligations.map(cycle => ({
          key: String(cycle.number), cells: [
            `${cycle.number} · ${dateLabel(cycle.due)}`, usdc(vm.plan.amount), usdc(cycle.paid),
            cycle.late ? <span className="gm-positive">Completed late</span> : cycle.status === "Paid" ? <span className="gm-positive">Completed</span> : cycle.status,
          ],
        }))} />
        <p>Overdue to date {usdc(person.overdue)} · Future commitments {usdc(person.future)}</p>
      </section>
    </div>
    <div className="gm-stack">
      {person.isAda && <>
        <aside className="gm-card gm-soft"><h2>Exit requested</h2><p>EX-001 · {exitDate}</p>
          <p>Ada stays active while her remaining contribution obligations are reviewed.</p>
          <strong>Currently authorized refund {usdc(0)}</strong>
        </aside>
        <GroupLink href={groupHref("exits")} primary>Review exit request</GroupLink>
      </>}
      <GroupLink href={groupHref("members")}>Back to members</GroupLink>
    </div>
  </div>;
}
