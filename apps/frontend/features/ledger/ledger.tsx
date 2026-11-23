"use client";

import { circleDate, circleLabel } from "../circles/api";
import { CircleReader } from "../circles/circle-reader";
import { scheduleHref } from "../schedule/components";
import { readLedger } from "./api";
import { LedgerHeading, LedgerLink, timestamp } from "./views";

export function Ledger() {
  return <div className="member-ledger">
    <LedgerHeading description="Your contributions, payout totals, and confirmed payment records." />
    <CircleReader path="/dashboard/ledger" read={readLedger}>{(circle, { ledger, summary }) => {
      const history = ledger.cycles.filter((cycle) => cycle.txHash)
        .sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? ""));
      return <>
        <div className="ledger-toolbar"><p>{circle.name} · {ledger.displayName} · Payout spot {ledger.payoutPosition}</p><LedgerLink href={scheduleHref(circle.id)}>View schedule</LedgerLink></div>
        <dl className="ledger-totals">{[
          ["Total contributed", `${ledger.totalContributed} USDC`],
          ["Outstanding balance", `${ledger.outstandingBalance} USDC`],
          ["Payouts received", `${ledger.totalPayoutsReceived} USDC`],
          ["Next payment deadline", ledger.nextPaymentDeadline ? circleDate(ledger.nextPaymentDeadline) : "No upcoming deadline"],
        ].map(([label, value]) => <div className="ledger-card" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>

        <section className="ledger-card ledger-table-panel" aria-labelledby="ledger-cycle-heading">
          <header className="ledger-section-header"><h2 id="ledger-cycle-heading">Contribution ledger</h2><span className="ledger-cycle-count">{ledger.cycles.length} cycles</span></header>
          {ledger.cycles.length ? <table className="ledger-table" role="table"><thead><tr>
            <th scope="col">Cycle / Due date</th><th scope="col">Expected</th><th scope="col">Paid</th><th scope="col">Status</th>
          </tr></thead><tbody>{ledger.cycles.map((cycle) => <tr key={cycle.cycleIndex}>
            <th scope="row">Cycle {cycle.cycleIndex} · {circleDate(cycle.dueDate)}</th>
            <td data-label="Expected">{cycle.expectedAmount} USDC</td><td data-label="Paid">{cycle.paidAmount} USDC</td>
            <td data-label="Status"><span className="ledger-status" data-status={cycle.status[0] + cycle.status.slice(1).toLowerCase()}>{circleLabel(cycle.status)}</span></td>
          </tr>)}</tbody></table> : <p className="ledger-history-note">No contribution cycles have been scheduled.</p>}
        </section>

        <section className="ledger-card ledger-table-panel" aria-labelledby="ledger-history-heading">
          <header className="ledger-section-header"><h2 id="ledger-history-heading">Confirmed contributions</h2></header>
          {history.length ? <table className="ledger-table" role="table"><thead><tr>
            <th scope="col">Contribution</th><th scope="col">Paid at · UTC</th><th scope="col">Amount</th><th scope="col">Transaction</th>
          </tr></thead><tbody>{history.map((cycle) => <tr key={cycle.cycleIndex}>
            <th scope="row">Cycle {cycle.cycleIndex}</th>
            <td data-label="Paid at">{cycle.paidAt ? timestamp(new Date(cycle.paidAt)) : "—"}</td>
            <td data-label="Amount">{cycle.paidAmount} USDC</td>
            <td data-label="Transaction"><details><summary>View hash</summary><code className="dash-wallet-address">{cycle.txHash}</code></details></td>
          </tr>)}</tbody></table> : <p className="ledger-history-note">No confirmed contributions for this circle yet.</p>}
        </section>

        <section className="ledger-card ledger-banner" aria-labelledby="ledger-group-heading">
          <h2 id="ledger-group-heading">Group ledger summary</h2>
          <dl className="ledger-totals">{[
            ["Total collected", summary.totalCollected],
            ["Payouts disbursed", summary.totalPayoutsDisbursed],
            ...(summary.totalWithdrawn === undefined ? [] : [["Withdrawals executed", summary.totalWithdrawn]]),
            ["Available group balance", summary.availableBalance],
          ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value} USDC</dd></div>)}</dl>
        </section>
      </>;
    }}</CircleReader>
  </div>;
}
