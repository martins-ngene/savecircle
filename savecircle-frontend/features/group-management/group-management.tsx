"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { DashboardDialog } from "../dashboard/controls";
import { member } from "../dashboard/model";
import { payoutView } from "../payouts/model";
import { monthYear, previewToday, referenceCircle } from "../schedule/model";
import { updateSchedulePreview, useSchedulePreview } from "../schedule/storage";
import { GroupHeader, GroupLink, GroupLoading, GroupTable, tabs } from "./components";
import { MemberDetails, Members } from "./members";
import { ExitReview, ExitSubmission, Invitations, InviteSetup } from "./membership";
import { exitDate, exitReason, groupActivity, groupHref, groupMembers, groupPath, organizer } from "./model";
import { createExitRequest, registerProposal, stageProposal, type ScheduleProposal } from "./records";
import { ProposalDraft, ProposalStatus, Rules } from "./rules";

const circle = referenceCircle;
const categories = ["All activity", "Contributions", "Payouts", "Membership", "Approvals"];
const descriptions = {
  members: "Surulere Savers · People, shared rules and the next step for your circle.",
  invitations: "Manage invitation history and available member places.",
  rules: "The agreed rules are visible to every member.",
  exits: "Review member obligations before authorizing an exit or refund.",
  activity: "Membership, contributions and group decisions in one timeline.",
};
const titles = {
  members: "Group management", invitations: "Invitations", rules: "Rules & schedule",
  exits: "Member exit request", activity: "Group activity",
};

export function GroupProfile() {
  const params = useSearchParams();
  const view = params.get("view");
  const account = params.get("tab") === "exits" && (view === "leave" || view === "recorded") ? member : organizer;
  return <DashboardDialog className="dash-profile" title="Account details" label={
    <><span className="dash-avatar">{account.initials}</span><span><strong>{account.name}</strong><small>{account.wallet}</small></span><span aria-hidden="true">⌄</span></>
  }><p>Group management preview for {account.name}.</p></DashboardDialog>;
}

export function GroupManagement() {
  const params = useSearchParams();
  const router = useRouter();
  const [checking, startChecking] = useTransition();
  const [copiedCode, setCopiedCode] = useState<string>();
  const root = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const preview = useSchedulePreview(circle.id);
  const vm = payoutView(circle, previewToday, preview);
  const tab = tabs.find(([key]) => key === params.get("tab"))?.[0] ?? "members";
  const view = params.get("view");
  const filter = ["Active", "Invited", "Inactive", "Exited"].find(key => key.toLowerCase() === params.get("filter")) ?? "All";
  const category = categories.find(key => key.toLowerCase() === params.get("filter")) ?? categories[0];
  const hasExitReceipt = !!preview.exitRequest;
  const hasReviewedExit = !!preview.exitReviewed;
  const proposal = preview.proposal;
  const headingState = [tab, view, filter, category, params.get("member"), proposal?.phase, !!proposal, hasExitReceipt, !!preview.setupInvitation, checking].join("|");

  useEffect(() => {
    const heading = root.current?.querySelector("h1");
    if (mounted.current && heading) {
      heading.focus({ preventScroll: true });
      heading.closest(".dash-workspace")?.scrollTo({ top: 0 });
    }
    mounted.current = true;
  }, [headingState]);

  if (!vm || checking || view === "loading") return <GroupLoading preview={view === "loading"} />;

  const people = groupMembers(vm);
  const ada = people.find(person => person.isAda)!;
  const selected = tab === "members" ? people.find(person => person.id === params.get("member")) : undefined;
  const setup = tab === "invitations" && view === "setup";
  const invitation = preview.setupInvitation;
  const memberView = tab === "exits" && (view === "leave" || view === "recorded");
  const proposalView = tab === "rules" && view === "proposal";

  function submitProposal(draft: ScheduleProposal) {
    updateSchedulePreview(circle.id, current => {
      const latest = payoutView(circle, previewToday, current);
      const future = latest?.plan.cycles.filter(item => item.status === "Upcoming" && item.due > previewToday).map(item => item.number) ?? [];
      const next = stageProposal(current.proposal, draft, future, circle.grace);
      return next === current.proposal ? current : { ...current, proposal: next };
    });
  }

  let title: string = titles[tab];
  let description = descriptions[tab];
  let snapshot: string | undefined;
  let content;
  if (view === "unavailable") {
    title = "Group records unavailable";
    description = "The latest membership and financial records could not be verified.";
    snapshot = "Latest records unavailable";
    content = <section className="gm-card">
      <span className="gm-eyebrow gm-error">Connection interrupted</span>
      <h2>The latest group records are unavailable.</h2>
      <p>Retry to verify the member directory, current rules, and exit eligibility.</p>
      <div className="gm-unknown"><strong>Active members: —</strong><strong>Available group funds: —</strong></div>
      <div><button className="gm-button" data-primary onClick={() => startChecking(() => router.replace(groupPath))}>Retry group records</button></div>
      <p>Check the reference for a previously submitted transaction before retrying it.</p>
    </section>;
  } else if (setup) {
    title = invitation ? copiedCode === invitation.code ? "Invitation link copied" : "Invitation ready" : "Invite a member";
    description = invitation ? "Setup preview · Registration is required to become an active member." : "Setup preview · One place remains before the circle starts.";
    snapshot = "Surulere Savers · Setup · May 27, 2025";
    content = <InviteSetup vm={vm} invitation={invitation} onCopied={() => setCopiedCode(invitation?.code)} generate={label => {
      updateSchedulePreview(circle.id, current => current.setupInvitation ? current : {
        ...current, setupInvitation: { label: label.trim().slice(0, 60), code: `surulere-${crypto.randomUUID().slice(0, 8)}` },
      });
    }} />;
  } else if (memberView) {
    title = hasExitReceipt ? "Exit request recorded" : "Request to leave the circle";
    description = hasExitReceipt ? "EX-001 · Saved for organizer review." : "Ask the organizer to review your eligibility and remaining commitments.";
    snapshot = hasExitReceipt ? exitDate : "Aug 5, 2025 · Before exit review";
    content = <ExitSubmission person={ada} recorded={hasExitReceipt} submit={reason => {
      updateSchedulePreview(circle.id, current => {
        const request = createExitRequest(current.exitRequest, reason);
        return request === current.exitRequest ? current : { ...current, exitRequest: request };
      });
      router.replace(groupHref("exits", { view: "recorded" }));
    }} />;
  } else if (proposalView) {
    title = !proposal ? "Propose a schedule change" : proposal.phase === "registering" ? "Confirming your proposal" : "Proposal awaiting approval";
    description = !proposal ? "Financial rule changes require group approval." : proposal.phase === "registering" ? "Your preview wallet signed the proposal. Registration is pending." : "SC-004 · The current rules apply while members review the proposal.";
    content = proposal
      ? <ProposalStatus vm={vm} proposal={proposal} confirm={() => updateSchedulePreview(circle.id, current => {
        const registered = registerProposal(current.proposal);
        return registered === current.proposal ? current : { ...current, proposal: registered };
      })} />
      : <ProposalDraft vm={vm} submit={submitProposal} />;
  } else if (tab === "invitations") {
    content = <Invitations members={people} hasSetupInvite={!!invitation} />;
  } else if (tab === "rules") {
    content = <Rules vm={vm} proposal={proposal} />;
  } else if (tab === "exits") {
    content = <ExitReview vm={vm} person={ada} created={hasExitReceipt} request={{ reason: preview.exitRequest?.reason ?? exitReason, reviewed: hasReviewedExit }}
      keepPending={() => updateSchedulePreview(circle.id, current => current.exitReviewed ? current : { ...current, exitReviewed: true })} />;
  } else if (tab === "activity") {
    const events = groupActivity(vm, preview).filter(event => category === categories[0] || event.category === category);
    content = <>
      <nav className="gm-tabs" aria-label="Filter group activity">{categories.map(label => <Link key={label} className="gm-button"
        href={groupHref("activity", label === categories[0] ? {} : { filter: label.toLowerCase() })}
        aria-current={category === label ? "page" : undefined}>{label}</Link>)}</nav>
      <section className="gm-card">
        {events.length ? <GroupTable label="Group activity" layout="activity" headers={["Event", "Member", "Timestamp · UTC", "Reference"]}
          rows={events.map(event => ({ key: event.reference, cells: [
            <Fragment key="event"><strong>{event.name}</strong><small>{event.details}</small></Fragment>, event.member, <time key="time" dateTime={event.date}>{event.time}</time>,
            event.href ? <Link key="reference" href={event.href}>{event.reference}</Link> : event.reference,
          ] }))} /> : <div role="status"><h2>No {category.toLowerCase()} activity yet</h2><p>Confirmed records appear here as the circle progresses.</p></div>}
      </section>
      <aside className="gm-card gm-soft"><h3>About this activity</h3><p>The preview shows confirmed contributions and released payouts alongside member requests and group decisions.</p></aside>
    </>;
  } else if (selected) {
    title = selected.name;
    description = `Active member · Payout position ${selected.position} of ${circle.members} · ${monthYear(selected.turn.due)}`;
    content = <MemberDetails person={selected} vm={vm} />;
  } else {
    if (filter !== "All") {
      title = "Members";
      description = "Membership status is separate from contribution status.";
    }
    content = <Members vm={vm} members={people} filter={filter} />;
  }

  return <div className="gm-workspace" ref={root}>
    <GroupHeader title={title} description={description} tab={tab} snapshot={snapshot} memberView={memberView} unavailable={view === "unavailable"} />
    {content}
    {tab === "members" && view !== "unavailable" && !selected && <div className="gm-preview-links">
      <GroupLink href={groupHref("members", { view: "loading" })}>Preview loading state</GroupLink>
      <GroupLink href={groupHref("members", { view: "unavailable" })}>Preview unavailable records</GroupLink>
    </div>}
  </div>;
}
