"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import { setWalletSession, useWalletSession, type WalletSession } from "@/lib/wallet-session";
import { shortWallet } from "../invitations/model";
import { Icon } from "../landing/icon";
import { acceptCircleRules, circleDate, circleLabel, getCircleDetails, type ApiCircle, type CircleDetails } from "./api";
import { CircleInvite } from "./circle-created";
import { Facts } from "./circle-summary";
import { StellarSetup } from "./stellar-setup";

function CircleDetail({ circle, session, onLinked, onAccept, accepting, acceptanceError }: {
  circle: CircleDetails; session: WalletSession; onLinked: (circle: CircleDetails) => void; onAccept: () => void; accepting: boolean; acceptanceError?: string;
}) {
  const wallet = session.walletAddress;
  const organizer = circle.organizerWallet === wallet;
  const membership = circle.members.find((member) => member.walletAddress === wallet);
  return <>
    <Link href="/dashboard/circles" className="dash-link circle-inline-link">← My circles</Link>
    <header className="circle-heading"><span className="eyebrow">{circleLabel(circle.status)}</span><h1>{circle.name}</h1>{circle.description && <p>{circle.description}</p>}</header>
    <div className="dash-actions">
      <Link className="button outline" href={`/dashboard/schedule?circle=${encodeURIComponent(circle.id)}`}>View schedule</Link>
      {membership && <Link className="button outline" href={`/dashboard/ledger?circle=${encodeURIComponent(circle.id)}`}>View my ledger</Link>}
      <Link className="button outline" href={`/dashboard/group-management?circle=${encodeURIComponent(circle.id)}`}>Manage members</Link>
    </div>
    <div className="circle-created-grid">
      <div className="circle-form">
        <section className="dash-card circle-card"><h2>Contributions</h2><Facts rows={[
          ["Per member", `${circle.contributionAmount} USDC`], ["Pool per cycle", `${circle.targetAmount} USDC`],
          ["Frequency", circleLabel(circle.paymentFrequency)], ["Spots reserved", `${circle.members.length} of ${circle.totalMembers}`],
          ...(membership ? [["Your payout spot", membership.rotationPosition] as [string, number]] : []),
        ]} /></section>
        <section className="dash-card circle-card"><h2>Schedule and payout order</h2>
          {circle.cycles.length ? <ol className="circle-order">{[...circle.cycles].sort((a, b) => a.cycleIndex - b.cycleIndex).map((cycle) => {
            const recipient = circle.members.find((member) => member.walletAddress === cycle.recipientWallet);
            const name = cycle.recipientWallet === "UNASSIGNED" ? "Open spot" : recipient?.displayName || shortWallet(cycle.recipientWallet);
            return <li key={cycle.id}><span className="circle-slot">{cycle.cycleIndex}</span><div><strong>{name}</strong><small>{circleDate(cycle.dueDate)}</small></div><span className="dash-tag">{circleLabel(cycle.status)}</span></li>;
          })}</ol> : <p>No contribution cycles have been scheduled.</p>}
        </section>
        <section className="dash-card circle-card"><h2>Members</h2>
          <ol className="circle-order">{[...circle.members].sort((a, b) => a.rotationPosition - b.rotationPosition).map((member) => (
            <li key={member.walletAddress}>
              <span className="circle-slot">{member.rotationPosition}</span>
              <div><strong>{member.displayName || shortWallet(member.walletAddress)}{member.walletAddress === wallet && " (you)"}</strong><small>{member.rulesAccepted ? "Rules accepted" : "Rules awaiting acceptance"}</small></div>
              <span className="dash-tag">{circleLabel(member.status)}</span>
            </li>
          ))}</ol>
        </section>
      </div>
      <div className="circle-form">
        {organizer && circle.onChainGroupId == null && circle.payoutModel === "ROTATING" && <StellarSetup circle={circle} session={session} onLinked={onLinked} />}
        {organizer && circle.inviteToken && <CircleInvite inviteToken={circle.inviteToken} />}
        <section className="dash-card circle-card"><h2>Group rules</h2><Facts rows={[
          ["Payout model", circleLabel(circle.payoutModel)], ["Withdrawal approvals", `${circle.approvalThreshold} of ${circle.totalMembers}`],
          ["Stellar Testnet", circle.onChainGroupId == null ? "Registration pending" : `Group ${circle.onChainGroupId}`],
        ]} />{circle.rules && <p className="circle-preserve">{circle.rules}</p>}
          {membership?.status === "INVITED" && !membership.rulesAccepted && <>
            <button type="button" className="button primary" onClick={onAccept} disabled={accepting}>{accepting ? "Accepting…" : "Accept group rules"}</button>
            {acceptanceError && <p role="alert">{acceptanceError}</p>}
          </>}
        </section>
        <section className="dash-card circle-card"><h2>Withdrawal proposals</h2>
          {circle.withdrawals.length ? <ul className="circle-order">{circle.withdrawals.map((proposal) => (
            <li key={proposal.id}>
              <div><strong>Request {proposal.requestId} · {proposal.amount} USDC</strong><small>Recipient {shortWallet(proposal.recipientWallet)} · {proposal.approvalCount} of {proposal.requiredApprovals} approvals</small>{proposal.reason && <p>{proposal.reason}</p>}</div>
              <span className="dash-tag">{circleLabel(proposal.status)}</span>
            </li>
          ))}</ul> : <p>No withdrawal proposals yet.</p>}
        </section>
      </div>
    </div>
  </>;
}

function CircleDetailsView({ id, session }: { id: string; session: WalletSession }) {
  const [circle, setCircle] = useState<CircleDetails>();
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [accepting, setAccepting] = useState(false);
  const [acceptanceError, setAcceptanceError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    getCircleDetails(id, controller.signal).then((details) => {
      if (!controller.signal.aborted) setCircle(details);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "Could not load this circle.");
    });
    return () => controller.abort();
  }, [id, attempt]);

  async function acceptRules() {
    setAccepting(true);
    setAcceptanceError(undefined);
    try {
      const accepted = await acceptCircleRules(id, session.accessToken);
      setCircle((current) => current && {
        ...current,
        members: current.members.map((member) => member.walletAddress === accepted.walletAddress ? accepted : member),
      });
    } catch (error) {
      setAcceptanceError(error instanceof ApiError && error.status === 401 ? "Your wallet session expired. Reconnect your wallet and try again." : error instanceof Error ? error.message : "Could not accept the group rules.");
    } finally {
      setAccepting(false);
    }
  }

  if (circle) return <CircleDetail circle={circle} session={session} onLinked={setCircle} onAccept={acceptRules} accepting={accepting} acceptanceError={acceptanceError} />;

  return <>
    <Link href="/dashboard/circles" className="dash-link circle-inline-link">← My circles</Link>
    {loadError ? <div role="alert"><p>{loadError}</p><button className="button outline" onClick={() => { setLoadError(""); setAttempt((value) => value + 1); }}>Try again</button></div> : <p role="status">Loading circle details…</p>}
  </>;
}

export function MyCircles() {
  const id = useSearchParams().get("id");
  const session = useWalletSession();
  if (!session) return <div className="circle-workspace"><h1>My circles</h1>{session === undefined ? <p role="status">Loading wallet session…</p> : <Link className="button primary" href="/connect">Connect wallet</Link>}</div>;
  return <MemberCircles key={session.accessToken} session={session} id={id} />;
}

function MemberCircles({ session, id }: { session: WalletSession; id: string | null }) {
  const [result, setResult] = useState<{ circles?: ApiCircle[]; error?: string; expired?: boolean }>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<ApiCircle[]>("groups/my-circles", { token: session.accessToken, signal: controller.signal }).then((circles) => {
      if (!controller.signal.aborted) setResult({ circles });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      const expired = error instanceof ApiError && error.status === 401;
      setResult({ expired, error: expired ? "Your wallet session expired." : error instanceof Error ? error.message : "Could not load your circles." });
    });
    return () => controller.abort();
  }, [session.accessToken, attempt]);

  const selected = result?.circles?.find((circle) => circle.id === id);
  return <div className="circle-workspace">
    {selected ? <CircleDetailsView key={selected.id} id={selected.id} session={session} /> : <>
      <div className="circle-list-header">
        <header className="circle-heading"><h1>My circles</h1></header>
        <div className="dash-actions"><Link className="button outline" href="/connect"><Icon name="link" />Join circle</Link><Link className="button primary" href="/dashboard/circles/create"><Icon name="plus" />Create circle</Link></div>
      </div>
      {!result && <p role="status">Loading your circles…</p>}
      {result?.error && <div role="alert"><p>{result.error}</p>{result.expired
        ? <Link className="dash-link" href="/connect" onClick={() => setWalletSession(null)}>Reconnect wallet</Link>
        : <button className="button outline" onClick={() => { setResult(undefined); setAttempt((value) => value + 1); }}>Try again</button>}</div>}
      {id && result?.circles && <p role="status">This circle is unavailable for your wallet.</p>}
      {result?.circles?.length === 0 && <p>You haven’t joined or created any circles yet.</p>}
      <div className="circle-list">{result?.circles?.map((circle) => <article key={circle.id} className="dash-card circle-card">
        <div className="circle-card-heading"><span className="circle-mark"><Icon name="users" /></span><h2>{circle.name}</h2><span className="dash-tag">{circleLabel(circle.status)}</span></div>
        {circle.description && <p>{circle.description}</p>}
        <Facts rows={[["Contribution", `${circle.contributionAmount} USDC`], ["Spots reserved", `${circle.members.length} of ${circle.totalMembers}`], ["Frequency", circleLabel(circle.paymentFrequency)]]} />
        <Link href={`/dashboard/circles?id=${encodeURIComponent(circle.id)}`} className="button outline">View circle <Icon name="arrow" /></Link>
      </article>)}</div>
    </>}
  </div>;
}
