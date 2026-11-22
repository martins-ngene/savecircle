import { useRef, useState } from "react";
import { member } from "../dashboard/model";
import { usdc } from "../landing/plan";
import type { PayoutView } from "../payouts/model";
import { dateLabel, fullDate, monthYear } from "../schedule/model";
import { GroupFacts, GroupLink, GroupTable } from "./components";
import { exitDate, exitReason, groupHref, type GroupMember } from "./model";
import type { ExitRequest, SetupInvitation } from "./records";

const invitations = groupHref("invitations");
const exitTab = groupHref("exits");

export function Invitations({ members, hasSetupInvite }: { members: GroupMember[]; hasSetupInvite: boolean }) {
  const invited = members.filter(person => person.role !== "Organizer");
  return <div className="gm-columns">
    <div className="gm-stack">
      <section className="gm-card">
        <h2>{invited.length} accepted invitations</h2>
        <p>All {members.length} places are filled, including the organizer’s registration. There are no pending invitations.</p>
        <GroupTable label="Accepted invitations" headers={["Member", "Invitation", "Registered wallet"]} rows={invited.map(person => ({
          key: person.id, cells: [person.name, <strong key="status" className="gm-positive">Accepted</strong>, person.wallet],
        }))} />
      </section>
      <section className="gm-card"><h2>Last invitation · Bisi A.</h2><p>Created May 27 · Accepted May 28, 2025</p><p>Bisi registered a unique wallet and accepted the group rules before becoming active.</p></section>
    </div>
    <div className="gm-stack">
      <aside className="gm-card gm-soft"><span className="gm-eyebrow">Circle full</span><h2>{members.length} of {members.length} active members</h2>
        <strong>Open places: 0<br />Pending invitations: 0</strong><p>Ada holds her place while the organizer reviews her exit request.</p>
      </aside>
      <button className="gm-button" disabled>Invite member unavailable</button>
      <GroupLink href={groupHref("invitations", { view: "setup" })}>{hasSetupInvite ? "View setup invitation" : "Preview an invitation before launch"}</GroupLink>
    </div>
  </div>;
}

export function InviteSetup({ vm, invitation, generate, onCopied }: { vm: PayoutView; invitation?: SetupInvitation; generate: (label: string) => void; onCopied: () => void }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const linkInput = useRef<HTMLInputElement>(null);
  const link = invitation ? `https://savecircle.example/invite/${invitation.code}` : "";
  const first = vm.plan.cycles[0];
  const last = vm.plan.cycles.at(-1)!;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setCopyError(false);
      onCopied();
    } catch {
      linkInput.current?.focus();
      linkInput.current?.select();
      setCopyError(true);
    }
  }

  return <div className="gm-columns">
    {invitation ? <section className="gm-card">
      <div className="gm-card gm-lime"><span className="gm-eyebrow">Invitation ready</span><h2>{invitation.label ? `Share a place with ${invitation.label}` : "Share the final place"}</h2><p>Surulere Savers · Fifth and final place</p></div>
      <label className="gm-field">Example invitation link<input ref={linkInput} value={link} readOnly /></label>
      <button type="button" className="gm-button" data-primary onClick={copy}>{copied ? "Link copied" : "Copy invitation link"}</button>
      <div role="status">{copyError ? "Copy the selected link using your browser." : copied ? "Invitation link copied to your clipboard." : ""}</div>
      <div className="gm-field">Invitation status<p>Invited · Waiting for registration</p></div>
      <div className="gm-field">Wallet / rules acceptance<p>Awaiting wallet registration and acceptance</p></div>
      <div className="gm-field">Membership counts<p>4 active · 1 invited · 0 unallocated places</p></div>
    </section> : <form className="gm-card" onSubmit={event => {
      event.preventDefault();
      const label = new FormData(event.currentTarget).get("label");
      if (typeof label === "string") generate(label);
    }}>
      <h2>One place is available</h2><p>Before launch · 4 active members · 0 pending invitations · Target: 5 members</p>
      <label className="gm-field">Invitation label · Optional<input name="label" defaultValue="Bisi A." maxLength={60} /></label>
      <div className="gm-field">Savings circle<p>{vm.circle.name}</p></div>
      <div className="gm-field">Contribution obligation<p>{usdc(vm.plan.amount)} per month · {vm.plan.cycles.length} cycles</p></div>
      <div className="gm-field">First payment / deadline<p>{fullDate(first.due)} · Deadline {dateLabel(first.deadline)}, 23:59 UTC</p></div>
      <div className="gm-field">Agreed payout position<p>{last.number} of {vm.circle.members} · {monthYear(last.due)} · {usdc(vm.amount)}</p></div>
      <button className="gm-button" data-primary>Generate invitation link</button>
    </form>}
    <div className="gm-stack">
      <aside className={`gm-card ${invitation ? "gm-soft" : "gm-dark"}`}>
        <span className="gm-eyebrow">Invitation → Registration → Active</span><h2>Membership starts with registration.</h2>
        <p>The invitee registers a unique wallet, accepts the circle rules and signs each contribution separately.</p>
      </aside>
      {invitation && <button className="gm-button" disabled>No additional places available</button>}
      <p>Setup preview · May 27, 2025. The link is illustrative.</p>
      <GroupLink href={invitations}>Back to active circle invitations</GroupLink>
    </div>
  </div>;
}

function exitFacts(person: GroupMember): [string, string][] {
  return [["Historical contributions", usdc(person.contributed)], ["Payouts received", usdc(person.received)],
    ["Overdue to date", usdc(person.overdue)], ["Remaining scheduled payments", usdc(person.future)], ["Authorized refund", usdc(0)]];
}

export function ExitReview({ request, person, keepPending, vm, created }: {
  request: ExitRequest; person: GroupMember; keepPending: () => void; vm: PayoutView; created: boolean;
}) {
  return <div className="gm-columns">
    <div className="gm-stack">
      <section className="gm-card"><span className="gm-eyebrow gm-warning">EX-001 · Pending resolution</span><h2>Ada Okafor requests to leave.</h2>
        <GroupFacts rows={[
          ["Registered wallet", person.wallet], ["Requested at", exitDate], ["Current membership", "Active"],
          ["Member’s reason", request.reason], ["Payout position", `Cycle ${person.position} · ${monthYear(person.turn.due)}`],
        ]} />
      </section>
      <section className="gm-card"><h2>Unresolved financial commitments</h2><GroupFacts rows={exitFacts(person)} />
        <p>The Cycle {vm.cycle.number} pool is designated for {vm.pool.recipient}’s scheduled payout.</p>
      </section>
    </div>
    <div className="gm-stack">
      <aside className="gm-card gm-amber"><span className="gm-eyebrow">Exit review required</span><h2>{person.obligations.filter(cycle => cycle.status === "Upcoming").length} scheduled obligations remain.</h2><p>The circle needs an authorized settlement of those commitments before it can finalize the exit.</p><strong>Membership: Active<br />Authorized refund: {usdc(0)}</strong></aside>
      <GroupLink href={groupHref("members", { member: person.id })} primary>Review member obligations</GroupLink>
      <button className="gm-button" type="button" disabled={request.reviewed} onClick={keepPending}>{request.reviewed ? "Request kept pending" : "Keep request pending"}</button>
      <button className="gm-button" disabled>Finalize exit unavailable</button>
      <GroupLink href={groupHref("exits", { view: created ? "recorded" : "leave" })}>{created ? "View member receipt" : "Preview submitting as Ada"}</GroupLink>
    </div>
  </div>;
}

export function ExitSubmission({ person, recorded, submit }: { person: GroupMember; recorded: boolean; submit: (reason: string) => void }) {
  return <div className="gm-columns">
    {recorded ? <div className="gm-stack">
      <section className="gm-card gm-lime"><span className="gm-eyebrow">EX-001 · Pending resolution</span><h2>Your request has been recorded.</h2><p>The organizer can review your remaining obligations.</p></section>
      <section className="gm-card"><GroupFacts rows={[
        ["Requested at", exitDate], ["Member / wallet", `${person.name} · ${person.wallet}`],
        ["Membership", "Active"], ["Remaining commitments", usdc(person.future)],
        ["Refund authorization", usdc(0)], ["Request status", "Pending eligibility and obligation resolution"],
      ]} /></section>
    </div> : <form className="gm-card" onSubmit={event => {
      event.preventDefault();
      const reason = new FormData(event.currentTarget).get("reason");
      if (typeof reason === "string" && reason.trim()) submit(reason);
    }}>
      <h2>Review your membership</h2>
      <GroupFacts rows={[
        ["Savings circle", "Surulere Savers"], ["Registered member", `${member.name} · ${person.wallet}`],
        ["Current status", `Active · Payout position ${person.position} of 5`],
        ...exitFacts(person).filter(([label]) => label !== "Authorized refund"),
      ]} />
      <label className="gm-field">Reason for leaving<textarea name="reason" rows={3} maxLength={500} defaultValue={exitReason} required /></label>
      <button className="gm-button" data-primary>Submit exit request</button>
      <p>Submitting asks the organizer to review your commitments.</p>
    </form>}
    <div className="gm-stack">
      <aside className={`gm-card ${recorded ? "gm-soft" : "gm-amber"}`}>
        <span className="gm-eyebrow">{recorded ? "Pending organizer review" : "Final exit currently blocked"}</span>
        <h2>{recorded ? "Keep following the agreed schedule." : "You can request a review."}</h2>
        <p>Your membership stays active and the agreed contribution schedule applies until an eligible exit is authorized.</p>
        <strong>Currently authorized refund: {usdc(0)}</strong>
      </aside>
      <GroupLink href={exitTab}>Back to organizer review</GroupLink>
      {recorded && <GroupLink href="/dashboard/schedule">View contribution schedule</GroupLink>}
    </div>
  </div>;
}
