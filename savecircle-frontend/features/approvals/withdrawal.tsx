import { member } from "../dashboard/model";
import { usdc } from "../landing/plan";
import { payoutHref, type PayoutView } from "../payouts/model";
import { monthName, monthYear } from "../schedule/model";
import { ApprovalHeading, ApprovalLink, ApprovalNote, ApprovalTransaction, approvalHref, approvalsHref, Facts, noraWallet } from "./components";
import { defaultReason, requestId, requestReference, type WithdrawalRequest } from "./request";
import { MemberApprovals } from "./review";

export function NewWithdrawal({ vm, eligible, start }: { vm: PayoutView; eligible: boolean; start: (reason: string) => void }) {
  const { circle, pool, cycle } = vm;
  return <>
    <ApprovalHeading title="Request a withdrawal" eyebrow={`${circle.name} / New request`} description="Propose a protected release from the circle pool." role="Authorized member" />
    <form className="approval-grid" onSubmit={event => {
      event.preventDefault();
      const reason = new FormData(event.currentTarget).get("reason");
      if (eligible && typeof reason === "string" && reason.trim()) start(reason);
    }}>
      <div className="approval-card approval-form">
        <div><strong>Savings circle</strong><p>{circle.name}</p></div>
        <div><strong>Withdrawal type</strong><p>Scheduled rotating payout</p></div>
        <div className="approval-full"><strong>Amount · Testnet USDC</strong><p>{usdc(vm.amount)} · Fixed by circle rules</p></div>
        <div><strong>Recipient</strong><p>{pool.recipient} · Position {cycle.number} of {circle.members}</p></div>
        <div><strong>Recipient wallet</strong><p>{noraWallet} · Registered wallet</p></div>
        <label className="approval-full"><strong>Reason visible to members</strong><textarea name="reason" defaultValue={defaultReason} maxLength={240} required rows={3} /></label>
        <div className="approval-full"><strong>Required approvals</strong><p>{circle.approvals} of {circle.members} distinct eligible members</p></div>
      </div>
      <div className="approval-stack">
        <article className="approval-card approval-dark">
          <span className="approval-eyebrow">{eligible ? "Eligible scheduled release" : "Scheduled release"}</span>
          <h2 className="approval-amount">{usdc(vm.amount)}</h2>
          <strong>Cycle {cycle.number} · {monthName(cycle.due)} · {pool.recipient}</strong>
          <p>{usdc(pool.collected)} of {usdc(pool.target)} funded</p>
        </article>
        <button className="approval-button" data-tone="green" aria-haspopup="dialog" disabled={!eligible}>Submit request in wallet</button>
        {!eligible && <ApprovalLink href="/dashboard/schedule">View contribution schedule</ApprovalLink>}
        <ApprovalLink href={approvalHref("eligibility")}>Why can’t I withdraw my contributions?</ApprovalLink>
        <ApprovalNote title="This signature creates a request."><p>Members can approve once registration is confirmed. An authorized member signs separately to release the payout.</p></ApprovalNote>
        <ApprovalLink href={approvalsHref}>Back to approvals</ApprovalLink>
      </div>
    </form>
  </>;
}

export function WithdrawalStatus({ vm, request, advance }: { vm: PayoutView; request: WithdrawalRequest; advance: () => void }) {
  const { circle, pool, approvals, cycle, available, status } = vm;
  const registering = request.phase === "registering";
  const ready = status === "ready";
  const threshold = `${approvals} of ${circle.approvals} required approvals`;
  return <>
    <ApprovalHeading
      title={registering ? "Creating your request" : ready ? "Approved and ready" : "Request created"}
      description={registering ? `${circle.name} · Cycle ${cycle.number} · ${monthYear(cycle.due)}` : `${requestId} · ${circle.name}`}
      role={ready ? "Authorized executor" : "Requester"}
    />
    <div className="approval-grid">
      <div className="approval-stack">
        <article className={`approval-card ${registering ? "approval-amber" : ready ? "approval-lime" : "approval-dark"}`}>
          <span className="approval-eyebrow">{registering ? "Awaiting network confirmation" : ready ? threshold : "Awaiting member approvals"}</span>
          <h2 className="approval-amount">{usdc(vm.amount)}</h2>
          <strong>{registering ? "Proposed release to" : "Scheduled recipient"} {pool.recipient}</strong>
          <p>{noraWallet} · Cycle {cycle.number} · {monthYear(cycle.due)}</p>
          {!registering && !ready && <h3>{threshold}</h3>}
        </article>
        <section className="approval-card">
          {registering ? <Facts rows={[
            ["Request transaction", requestReference],
            ["Submitted at", "Aug 5, 2025 · 09:44 UTC"],
            ["Request status", "Registration pending"],
            ["Approval collection", "Opens after request confirmation"],
          ]} /> : <>
            <h2>{ready ? "Confirmed member approvals" : "Member approval progress"}</h2>
            <MemberApprovals vm={vm} request={request} requester />
            <Facts rows={[
              ["Cycle funding", `${usdc(pool.collected)} of ${usdc(pool.target)} funded`],
              ["Available group funds", usdc(available)],
              ...(ready ? [["Recipient eligibility", "Registered and active"], ["Execution permission", `Authorized wallet · ${member.wallet}`]] as [string, string][] : []),
            ]} />
          </>}
        </section>
      </div>
      <div className="approval-stack">
        {ready ? <ApprovalLink href={payoutHref(circle.id, "release")} tone="green">Review payout release</ApprovalLink> : <>
          {registering || !request.otherApprovals ? <button type="button" className="approval-button" data-tone="green" onClick={advance}>{registering ? "Check request status" : "Refresh approval status"}</button> : <ApprovalLink href={approvalHref("review")} tone="green">{request.vote ? "View approval status" : "Review as Nora O."}</ApprovalLink>}
          {!registering && <button type="button" className="approval-button" disabled>Release unavailable · {approvals} of {circle.approvals} approvals</button>}
        </>}
        <ApprovalTransaction reference={requestReference} />
        <ApprovalNote title={ready ? "A separate wallet signature releases the funds." : registering ? "Your request is awaiting confirmation." : "The circle is collecting approvals."}>
          <p>{ready ? "Payout review checks funding, the recipient, approval records and prior execution before release." : registering ? "You can leave this page and check this request when you return." : request.otherApprovals ? "Each confirmed approval counts once." : "Refresh to load the other members’ preview votes."}</p>
        </ApprovalNote>
        <ApprovalLink href={approvalsHref}>Back to approvals</ApprovalLink>
      </div>
    </div>
  </>;
}

export function WithdrawalEligibility({ vm, back }: { vm: PayoutView; back: string }) {
  return <>
    <ApprovalHeading title="Your contributions are held in the circle pool" eyebrow="Withdrawal eligibility" description={`${vm.circle.name} · Rotating savings model`} role="Active member" />
    <dl className="approval-stats approval-eligibility-stats">
      {[
        ["Your historical contributions", usdc(vm.plan.paid), "Confirmed contributions"],
        ["Available group funds", usdc(vm.available), `Circle funds for Cycle ${vm.cycle.number}`],
        ["Your personal withdrawable amount", usdc(0), "Personal withdrawal requires separate authorization"],
      ].map(([label, value, caption]) => <div className="approval-card" key={label}><dt>{label}</dt><dd>{value}</dd><dd>{caption}</dd></div>)}
    </dl>
    <div className="approval-grid">
      <ApprovalNote title={vm.next ? `Your turn is Cycle ${vm.next.number} · ${monthName(vm.next.due)}.` : "See the payout plan for your scheduled turn."}>
        <p>The agreed payout order determines who receives the current pool.</p>
        <p>An exit or dissolution refund requires eligibility checks, settlement of remaining commitments and group authorization.</p>
      </ApprovalNote>
      <div className="approval-stack">
        <ApprovalLink href={back} tone="green">Back to scheduled payout request</ApprovalLink>
        <ApprovalLink href="/dashboard/ledger">View my contribution history</ApprovalLink>
      </div>
    </div>
  </>;
}
