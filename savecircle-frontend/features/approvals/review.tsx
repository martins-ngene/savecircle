import { member } from "../dashboard/model";
import { usdc } from "../landing/plan";
import type { PayoutView } from "../payouts/model";
import { monthYear } from "../schedule/model";
import { ApprovalHeading, ApprovalLink, ApprovalNote, ApprovalTransaction, approvalsHref, Facts, noraWallet } from "./components";
import { approvalReference, requestId, type WithdrawalRequest } from "./request";

export function MemberApprovals({ vm, request, requester = false }: { vm: PayoutView; request: WithdrawalRequest; requester?: boolean }) {
  const { circle, approvals, pool } = vm;
  const times = ["09:50", "09:54", "10:05"];
  return <ul className="approval-members">
    {pool.people.map((name, index) => {
      const checked = index < 2 ? request.otherApprovals : index === 2 && request.vote === "confirmed";
      const you = index === (requester ? 3 : 2);
      return <li key={name}>
        <strong>{name}{you ? " · You" : ""}</strong>
        <span data-approved={checked || undefined}>{checked ? `Approved · ${times[index]}` : approvals >= circle.approvals ? "Threshold met" : you && !requester ? "Awaiting your approval" : "Awaiting"}</span>
      </li>;
    })}
  </ul>;
}

export function ReviewApproval({ vm, request, declined, start, retry, confirm }: {
  vm: PayoutView; request: WithdrawalRequest; declined: boolean; start: () => void; retry: () => void; confirm: () => void;
}) {
  const { cycle, plan, circle, pool, approvals, available, status } = vm;
  const threshold = `${approvals} of ${circle.approvals} required approvals`;
  const description = `${requestId} · ${circle.name}`;
  const amount = usdc(vm.amount);
  const summary = `${amount} → ${pool.recipient}`;
  const cycleText = `Cycle ${cycle.number} · ${monthYear(cycle.due)}`;

  if (request.vote === "confirmed") return <>
    <ApprovalHeading title="Approval recorded" description={description} />
    <div className="approval-grid">
      <div className="approval-stack">
        <article className="approval-card approval-lime">
          <span className="approval-eyebrow">Your approval is confirmed</span>
          <h2>{approvals >= circle.approvals ? "The request has enough approvals." : "Your vote has been counted."}</h2>
          <strong>{threshold} · {approvals} of {circle.members} members</strong>
          <p>{summary}<br />{cycleText}</p>
        </article>
        <section className="approval-card">
          <h2>Confirmed approvals</h2>
          <MemberApprovals vm={vm} request={request} />
          <Facts rows={[
            ["Approval transaction", `${approvalReference} · Confirmed`],
            ["Request status", status === "paid" ? "Executed" : status === "pending" ? "Release pending" : status === "ready" ? "Approved · Awaiting release" : "Awaiting additional approvals"],
            ["Group funds", usdc(available)],
          ]} />
        </section>
      </div>
      <div className="approval-stack">
        <ApprovalLink href={approvalsHref} tone="green">Back to my review queue</ApprovalLink>
        <ApprovalTransaction reference={approvalReference} />
        <button type="button" className="approval-button" disabled>Your approval is already recorded</button>
        <ApprovalNote title="Release requires a separate signature."><p>An authorized member can release the payout once funding, recipient eligibility and the approval threshold are verified.</p></ApprovalNote>
      </div>
    </div>
  </>;

  if (request.vote === "pending" || declined) {
    const pending = request.vote === "pending";
    return <>
      <ApprovalHeading title={pending ? "Recording your approval" : "Approval not submitted"} description={description} />
      <div className="approval-grid">
        <div className="approval-stack">
          <article className={pending ? "approval-card approval-amber" : "approval-card"}>
            <span className={pending ? "approval-eyebrow" : "approval-eyebrow approval-error"}>{pending ? "Approval confirmation pending" : "Wallet request declined"}</span>
            <h2>{pending ? "Your preview wallet signed the approval." : "The request is still open for your review."}</h2>
            <p>{pending ? `Approval for ${summary} will count after you confirm its status.` : "You declined the signature. You can review the request again when you’re ready."}</p>
            {pending && <strong>{threshold} still confirmed</strong>}
          </article>
          <section className="approval-card">
            <Facts rows={pending ? [
              ["Approving wallet", `Nora O. · ${noraWallet}`],
              ["Action", `Approve request ${requestId}`],
              ["Submitted at", "Aug 5, 2025 · 10:04 UTC"],
              ["Approval transaction", approvalReference],
              ["Network", "Stellar Testnet preview"],
              ["Request status", "Awaiting approval confirmation"],
            ] : [
              ["Request", `${summary} · Cycle ${cycle.number}`],
              ["Confirmed approvals", threshold],
              ["Your approval", "Awaiting review"],
              ["Group funds", usdc(available)],
            ]} />
          </section>
        </div>
        <div className="approval-stack">
          <button type="button" className="approval-button" data-tone="green" onClick={pending ? confirm : retry}>{pending ? "Check approval status" : "Review request again"}</button>
          {pending && <ApprovalTransaction reference={approvalReference} />}
          <ApprovalLink href={approvalsHref}>Back to approvals</ApprovalLink>
          <ApprovalNote title={pending ? "Your vote is awaiting confirmation." : "The circle’s request is still active."}>
            <p>{pending ? "You can leave this page and check the status when you return." : "Return with the registered preview wallet to review the amount and recipient again."}</p>
          </ApprovalNote>
        </div>
      </div>
    </>;
  }

  return <>
    <ApprovalHeading title="Review request" description={description} />
    <div><ApprovalLink href={approvalsHref}>← Back to approvals</ApprovalLink></div>
    <div className="approval-grid">
      <section className="approval-card approval-stack">
        <div className="approval-card approval-note">
          <span className="approval-eyebrow">Scheduled cycle payout</span>
          <h2 className="approval-amount">{amount}</h2>
          <strong>To {pool.recipient} · Cycle {cycle.number} of {plan.cycles.length}</strong>
        </div>
        <Facts rows={[
          ["Recipient wallet", `${noraWallet} · Your registered wallet`],
          ["Requested by", `${member.name} · ${member.wallet}`],
          ["Created at", "Aug 5, 2025 · 09:45 UTC"],
          ["Cycle funding", `${usdc(pool.collected)} of ${usdc(pool.target)} funded`],
          ["Available group funds", usdc(available)],
          ["Approval requirement", `${circle.approvals} of ${circle.members} distinct members`],
          ["Reason visible to members", request.reason],
        ]} />
      </section>
      <div className="approval-stack">
        <section className="approval-card">
          <h2>{threshold}</h2>
          <MemberApprovals vm={vm} request={request} />
          <p>Your registered preview wallet is eligible to approve this request.</p>
        </section>
        <button type="button" className="approval-button" data-tone="green" aria-haspopup="dialog" onClick={start}>Approve in wallet</button>
        <ApprovalLink href={approvalsHref}>Not now</ApprovalLink>
        <ApprovalNote title="This signature records your approval."><p>You’re authorizing this amount for the scheduled recipient. An authorized member signs separately to release the payout.</p></ApprovalNote>
      </div>
    </div>
  </>;
}
