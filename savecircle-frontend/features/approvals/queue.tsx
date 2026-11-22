import Link from "next/link";
import { formatAmount } from "../dashboard/model";
import { usdc } from "../landing/plan";
import { payoutTimestamp } from "../payouts/components";
import type { PayoutView } from "../payouts/model";
import { monthYear } from "../schedule/model";
import { ApprovalHeading, ApprovalLink, ApprovalNote, approvalHref, approvalsHref } from "./components";
import { requestId, type WithdrawalRequest } from "./request";

export function ApprovalQueue({ vm, request, completed, canCreate, refresh }: {
  vm: PayoutView; request?: WithdrawalRequest; completed: boolean; canCreate: boolean; refresh: () => void;
}) {
  const { circle, pool, cycle, history, available, approvals, status } = vm;
  const needsReview = Number(status === "approvals" && request?.phase === "open" && !request.vote);
  const figures = [
    ["Your reviews", needsReview, needsReview ? "Request awaiting you" : "Requests awaiting you"],
    ["Group funds", formatAmount(available / 100), "USDC · Held in the circle pool"],
    ["Approval threshold", `${circle.approvals} of ${circle.members}`, "Distinct registered wallets"],
    ["Completed requests", history.length, `${usdc(vm.totalPaid)} released`],
  ];
  return <>
    <ApprovalHeading title="Withdrawals & approvals" eyebrow="Your review queue" description={`${circle.name} · ${circle.members} active members`} />
    <nav className="approval-tabs" aria-label="Request status">
      <Link href={approvalsHref} aria-current={completed ? undefined : "page"}>Needs review {needsReview}</Link>
      <Link href={approvalsHref + "?tab=completed"} aria-current={completed ? "page" : undefined}>Completed {history.length}</Link>
    </nav>
    <dl className="approval-stats">
      {figures.map(([label, value, detail]) => <div className="approval-card" key={label}><dt>{label}</dt><dd>{value}</dd><dd>{detail}</dd></div>)}
    </dl>
    {!completed && <div className="approval-grid">
      <div className="approval-stack">
        {needsReview ? <article className="approval-card approval-dark">
          <span className="approval-eyebrow">{requestId} · Scheduled payout</span>
          <h2 className="approval-amount">{usdc(vm.amount)}</h2>
          <strong>{pool.recipient} · To your registered wallet</strong>
          <p>Cycle {cycle.number} · {monthYear(cycle.due)}<br />Requested by Ada Okafor</p>
          <h3>{approvals} of {circle.approvals} required approvals</h3>
          <p>{request?.otherApprovals ? "Kelechi M. and Timi I. have approved. Your review is next." : "Your review is open."}</p>
          <ApprovalLink href={approvalHref("review")} tone="lime">Review request</ApprovalLink>
          <p className="approval-caption">Approval records your vote. Payout release requires a separate signature.</p>
        </article> : <article className="approval-card approval-note">
          <span className="approval-eyebrow">{request?.vote === "confirmed" ? "You’re caught up" : "Review queue"}</span>
          <h2 className="approval-amount">0 requests to review</h2>
          <p>{status === "paid" ? "The scheduled payout is complete." : request?.vote === "pending" ? "Your approval is awaiting confirmation." : request?.vote === "confirmed" ? "Your approval appears in Recently reviewed." : status === "pending" ? "The payout is awaiting confirmation." : status === "ready" ? "The payout has enough confirmed approvals." : request?.phase === "registering" ? "The request is awaiting registration." : "The review queue opens once the cycle is funded."}</p>
          {request?.phase === "registering" && <ApprovalLink href={approvalHref("request")} tone="green">Check request status</ApprovalLink>}
          {request?.vote === "pending" && <ApprovalLink href={approvalHref("review")} tone="green">Check approval status</ApprovalLink>}
          {(status === "pending" || status === "paid") && <ApprovalLink href="/dashboard/payouts">View payout</ApprovalLink>}
          {!request?.vote && status === "ready" && <ApprovalLink href={approvalHref("ready")} tone="green">View approved request</ApprovalLink>}
          {status === "funding" && <ApprovalLink href="/dashboard/schedule" tone="green">View contribution schedule</ApprovalLink>}
        </article>}
        {request?.vote === "confirmed" && <section className="approval-stack">
          <h2>Recently reviewed</h2>
          <article className="approval-card">
            <span className="approval-eyebrow">{requestId} · {status === "paid" ? "Executed" : status === "pending" ? "Release pending" : status === "ready" ? "Approved" : "Awaiting member approvals"}</span>
            <h3 className="approval-amount">{usdc(vm.amount)} → {pool.recipient}</h3>
            <p>Cycle {cycle.number} · {monthYear(cycle.due)}<br />You approved Aug 5 at 10:05 UTC.</p>
            <ApprovalLink href={approvalHref("review")} tone="soft">View my recorded approval</ApprovalLink>
          </article>
        </section>}
      </div>
      <div className="approval-stack">
        <ApprovalNote title={`${circle.approvals} distinct members. One protected release.`}>
          <p>Each eligible wallet can approve once. Confirmed votes count toward the circle’s threshold. An authorized member signs a separate transaction to release the funds.</p>
        </ApprovalNote>
        {(canCreate || status === "funding") && <ApprovalLink href={approvalHref("new")}>Preview a new withdrawal request</ApprovalLink>}
        {request?.phase === "open" && (status === "approvals" || status === "ready") && <ApprovalLink href={approvalHref(status === "ready" ? "ready" : "request")}>View requester status</ApprovalLink>}
        {request?.vote === "confirmed" && <button type="button" className="approval-button" data-tone="green" onClick={refresh}>Check for new requests</button>}
      </div>
    </div>}
    <section className="approval-stack" aria-labelledby="completed-requests">
      <h2 id="completed-requests">Completed requests</h2>
      <ul className="approval-history">{history.map(item => <li className="approval-card" key={item.number}>
        <span>WR-{String(item.number).padStart(3, "0")} · Executed</span>
        <strong>{item.recipient} · Cycle {item.number}</strong>
        <span>{usdc(item.amount)} · {item.number === cycle.number ? approvals : circle.approvals} of {circle.members} approved</span>
        <time dateTime={item.date}>{payoutTimestamp(item.date)} UTC</time>
      </li>)}</ul>
    </section>
  </>;
}
