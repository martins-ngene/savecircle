import type { Metadata } from "next";
import Link from "next/link";
import { activity, circle, formatAmount, fundingPercent, journey, member, payments } from "@/features/dashboard/model";
import { Workspace } from "@/features/dashboard/workspace";
import { Icon } from "@/features/landing/icon";
import { scheduleHref } from "@/features/schedule/components";

export const metadata: Metadata = { title: "Dashboard | SaveCircle" };

function Stats() {
  const stats = [
    ["Total contributed", 1240, "USDC", "+200 this month", "wallet"],
    ["Upcoming payment", circle.contribution, "USDC", "Due in 4 days", "calendar"],
    ["Active circles", payments.length, "circles", "9 members total", "users"],
    ["Payouts received", 800, "USDC", "1 completed payout", "coin"],
  ] as const;
  return <dl className="dash-stats">{stats.map(([title, value, unit, detail, icon]) => (
    <div className="dash-card dash-stat" key={title}>
      <dt>{title}<span className={`dash-tile ${icon}`}><Icon name={icon} /></span></dt>
      <dd><strong>{unit === "USDC" ? formatAmount(value) : value}</strong> <small>{unit}</small></dd>
      <dd className="dash-stat-note">{detail}</dd>
    </div>
  ))}</dl>;
}

function FeaturedCircle() {
  return (
    <section className="dash-feature" id="circles" tabIndex={-1} aria-labelledby="circle-name">
      <div className="dash-feature-body">
        <div className="dash-circle-title"><span className="dash-tile">GC</span><div><h2 id="circle-name">{circle.name} <span className="dash-tag">Active</span></h2><p>Monthly · {circle.members} members · Cycle {circle.cycle} of {circle.members}</p></div></div>
        <div className="dash-funding">
          <div>
            <p>Current pool</p>
            <div className="dash-funding-total"><strong>{formatAmount(circle.pool)} <small>USDC</small></strong><span>{fundingPercent}% funded</span></div>
            <progress value={circle.pool} max={circle.target} aria-label="Growth Circle funding" />
            <div className="dash-funding-meta"><small>{circle.fundedMembers} of {circle.members} contributions received</small><small>{formatAmount(circle.target)} USDC target</small></div>
          </div>
          <div className="dash-recipient"><span className="eyebrow">Scheduled recipient</span><div><span className="dash-avatar peach">{member.initials}</span><div><strong>{member.name}</strong><small>Position {circle.cycle} of {circle.members}</small></div><Icon name="shield" /></div></div>
        </div>
      </div>
      <div className="dash-feature-footer">
        <div className="dash-member-stack" aria-label="Five circle members">{["AO", "KM", "TI", "NO", "EA"].map((name) => <span className="dash-avatar" key={name}>{name}</span>)}</div>
        <small>Waiting on your contribution</small>
        <Link className="button dash-lime" href={scheduleHref("growth", "pay", circle.cycle)}><Icon name="wallet" />Pay {circle.contribution} USDC</Link>
      </div>
    </section>
  );
}

function UpcomingPayments() {
  return (
    <section className="dash-card dash-panel" id="schedule" tabIndex={-1} aria-labelledby="payments-heading">
      <header className="dash-panel-header"><div><h2 id="payments-heading">Upcoming payments</h2><p>Your next obligations</p></div><Link className="dash-link" href="/dashboard/schedule">View schedule</Link></header>
      <ul className="dash-payments">{payments.map((item) => (
        <li key={item.name} className={item.dueSoon ? "due" : undefined}>
          <div className="dash-payment-title"><span className="dash-tile"><Icon name={item.dueSoon ? "calendar" : "clock"} /></span><div><strong>{item.name}</strong><small>{item.dueSoon ? item.detail : `${item.date} · ${item.amount} USDC`}</small></div>{item.dueSoon && <span className="dash-tag">Due soon</span>}</div>
          {item.dueSoon && <div className="dash-payment-total"><strong>{formatAmount(item.amount)} <small>USDC</small></strong><small>{item.date}</small></div>}
        </li>
      ))}</ul>
    </section>
  );
}

function Activity() {
  return (
    <section className="dash-card dash-activity" id="ledger" tabIndex={-1} aria-labelledby="activity-heading">
      <header className="dash-panel-header"><div><h2 id="activity-heading">Recent activity</h2><p>Sample on-chain history</p></div></header>
      <table><caption className="dash-visually-hidden">Sample circle activity</caption><thead><tr>{["Activity", "Date", "Transaction", "Amount"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{activity.map((item, index) => (
          <tr key={item.hash} id={`activity-${index}`} tabIndex={-1}>
            <td><div className="dash-activity-title"><span className={`dash-avatar activity-${index}`}><Icon name={item.amount === null ? "users" : "arrow"} /></span><div><strong>{item.title}</strong><small>{item.detail}</small></div></div></td>
            <td>{item.date}</td><td><code>{item.hash}</code></td>
            <td className={item.amount !== null && item.amount > 0 ? "dash-positive" : undefined}>{item.amount === null ? "—" : <><strong>{item.amount > 0 ? "+" : ""}{formatAmount(item.amount)}</strong> <small>USDC</small></>}</td>
          </tr>
        ))}</tbody>
      </table>
    </section>
  );
}

function PayoutJourney() {
  return (
    <section className="dash-card dash-panel" id="payouts" tabIndex={-1} aria-labelledby="payout-heading">
      <header className="dash-panel-header"><div><h2 id="payout-heading">Payout journey</h2><p>{circle.name}</p></div><span className="dash-tag">Cycle {circle.cycle}</span></header>
      <ol className="dash-journey">{journey.slice(0, 4).map(({ name, detail }, index) => {
        const cycle = index + 1;
        return <li key={name}><span className="dash-avatar" data-cycle={cycle < circle.cycle ? "completed" : cycle === circle.cycle ? "current" : "upcoming"}>{cycle < circle.cycle ? <Icon name="check" /> : cycle}</span><div><strong>{name}</strong><small>{detail}</small></div><small>Cycle {cycle}</small></li>;
      })}</ol>
      <Link className="button outline dash-schedule-button" href="/dashboard/payouts?circle=growth">View payout schedule</Link>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <Workspace current="overview">
          <div className="dash-overview">
            <div><div className="eyebrow"><Icon name="sparkle" />Circle overview</div><h1>Good morning, Ada.</h1><p>Your circles are on track. One contribution is due this week.</p></div>
            <div className="dash-actions">
              <Link className="button outline" href="/connect"><Icon name="link" />Join circle</Link>
              <Link className="button primary" href="/dashboard/circles/create"><Icon name="plus" />Create circle</Link>
            </div>
          </div>
          <Stats />
          <div className="dash-columns"><FeaturedCircle /><UpcomingPayments /></div>
          <div className="dash-columns dash-lower"><Activity /><PayoutJourney /></div>
    </Workspace>
  );
}
