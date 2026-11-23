"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import { setWalletSession, useWalletSession, type WalletSession } from "@/lib/wallet-session";
import { shortWallet } from "../invitations/model";
import { Icon } from "../landing/icon";
import { DashboardDialog } from "./controls";
import { formatAmount } from "./model";
import { Workspace } from "./workspace";

type CircleMember = {
  walletAddress: string;
  displayName: string | null;
  status: string;
  rotationPosition: number;
  totalContributed: string;
  totalReceived: string;
};

type Circle = {
  id: string;
  name: string;
  status: string;
  paymentFrequency: string;
  totalMembers: number;
  members: CircleMember[];
};

type Obligation = {
  groupId: string;
  groupName: string;
  cycleIndex: number;
  amount: string;
  dueDate: string;
  status: "PENDING" | "OVERDUE";
};

type OverviewData = { circles: Circle[]; obligations: Obligation[] };

const date = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });
const formatDate = (value: string) => date.format(new Date(value));
const formatStatus = (value: string) => value.toLowerCase().replaceAll("_", " ");

export function DashboardOverview() {
  const session = useWalletSession();

  if (!session) return (
    <Workspace current="overview" profile={session === undefined ? <span /> : <Link className="button outline" href="/connect">Connect wallet</Link>}>
      <div className="dash-overview">
        <div><h1>Dashboard</h1><p>{session === undefined ? "Loading your wallet session…" : "Connect your wallet to see your circles and contributions."}</p></div>
      </div>
    </Workspace>
  );

  return <MemberOverview key={session.accessToken} session={session} />;
}

function MemberOverview({ session }: { session: WalletSession }) {
  const [result, setResult] = useState<{ data?: OverviewData; error?: string; expired?: boolean }>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const options = { token: session.accessToken, signal: controller.signal };
    Promise.all([
      apiRequest<Circle[]>("groups/my-circles", options),
      apiRequest<Obligation[]>("schedules/my-obligations", options),
    ]).then(([circles, obligations]) => {
      if (!controller.signal.aborted) setResult({ data: { circles, obligations } });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      const expired = error instanceof ApiError && error.status === 401;
      setResult({ expired, error: expired ? "Your wallet session expired. Sign in again to continue." : error instanceof Error ? error.message : "Could not load your dashboard." });
    });
    return () => controller.abort();
  }, [session.accessToken, attempt]);

  const { walletAddress } = session;
  const circles = result?.data?.circles ?? [];
  const memberships = circles.map((circle) => ({
    circle,
    member: circle.members.find((item) => item.walletAddress === walletAddress),
  }));
  // Groups arrive newest first. Use the first display name supplied for this wallet.
  const displayName = memberships.find(({ member }) => member?.displayName?.trim())?.member?.displayName?.trim();
  const initials = displayName?.split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0]).join("").toUpperCase();
  const profile = <DashboardDialog className="dash-profile" title="Account details" label={<>
    <span className="dash-avatar">{initials || <Icon name="wallet" />}</span>
    <span><strong>{displayName || "Wallet account"}</strong><small>{shortWallet(walletAddress)}</small></span>
  </>}>
    {displayName && <p>{displayName}</p>}
    <p className="dash-wallet-address">{walletAddress}</p>
    <Link className="button outline" href="/connect" onClick={() => setWalletSession(null)}>Change wallet</Link>
  </DashboardDialog>;

  return (
    <Workspace current="overview" profile={profile}>
      <div className="dash-overview">
        <div><div className="eyebrow"><Icon name="sparkle" />Circle overview</div><h1>{displayName ? `Welcome, ${displayName.split(/\s+/)[0]}.` : "Your dashboard"}</h1></div>
        <div className="dash-actions">
          <Link className="button outline" href="/connect"><Icon name="link" />Join circle</Link>
          <Link className="button primary" href="/dashboard/circles/create"><Icon name="plus" />Create circle</Link>
        </div>
      </div>
      {!result && <p role="status">Loading your circles and contributions…</p>}
      {result?.error && <div className="dash-card dash-panel">
        <p role="alert">{result.error}</p>
        {result.expired
          ? <Link className="dash-link" href="/connect" onClick={() => setWalletSession(null)}>Reconnect wallet</Link>
          : <button className="button outline" onClick={() => { setResult(undefined); setAttempt((value) => value + 1); }}>Try again</button>}
      </div>}
      {result?.data && <>
        <OverviewStats memberships={memberships} obligations={result.data.obligations} />
        <div className="dash-columns">
          <section className="dash-card dash-panel" id="circles" aria-labelledby="my-circles-heading">
            <header className="dash-panel-header"><h2 id="my-circles-heading">My circles</h2></header>
            {memberships.length ? <ul className="dash-payments">{memberships.map(({ circle, member }) => (
              <li key={circle.id}><div className="dash-payment-title">
                <span className="dash-tile"><Icon name="users" /></span>
                <div><strong>{circle.name}</strong><small>{formatStatus(circle.paymentFrequency)} · {circle.members.length} of {circle.totalMembers} spots reserved{member && ` · Payout spot ${member.rotationPosition}`}</small></div>
                <span className="dash-tag">{formatStatus(circle.status)}</span>
              </div></li>
            ))}</ul> : <p>You haven’t joined a circle yet.</p>}
          </section>
          <section className="dash-card dash-panel" id="schedule" aria-labelledby="payments-heading">
            <header className="dash-panel-header"><h2 id="payments-heading">Contribution obligations</h2></header>
            {result.data.obligations.length ? <ul className="dash-payments">{result.data.obligations.slice(0, 5).map((item) => (
              <li key={`${item.groupId}:${item.cycleIndex}`} className={item.status === "OVERDUE" ? "due" : undefined}>
                <div className="dash-payment-title">
                  <span className="dash-tile"><Icon name="calendar" /></span>
                  <div><strong>{item.groupName}</strong><small>Cycle {item.cycleIndex} · {formatDate(item.dueDate)}</small></div>
                  {item.status === "OVERDUE" && <span className="dash-tag">Overdue</span>}
                </div>
                <div className="dash-payment-total"><strong>{formatAmount(Number(item.amount))} <small>USDC</small></strong></div>
              </li>
            ))}</ul> : <p>You have no unpaid contributions.</p>}
          </section>
        </div>
      </>}
    </Workspace>
  );
}

function OverviewStats({ memberships, obligations }: {
  memberships: { circle: Circle; member?: CircleMember }[];
  obligations: Obligation[];
}) {
  const contributed = memberships.reduce((total, { member }) => total + Number(member?.totalContributed ?? 0), 0);
  const received = memberships.reduce((total, { member }) => total + Number(member?.totalReceived ?? 0), 0);
  const next = obligations[0];
  const stats = [
    ["Total contributed", formatAmount(contributed), "USDC", "", "wallet"],
    ["Next unpaid contribution", next ? formatAmount(Number(next.amount)) : "—", next ? "USDC" : "", next ? formatDate(next.dueDate) : "", "calendar"],
    ["My circles", memberships.length, "", "", "users"],
    ["Payouts received", formatAmount(received), "USDC", "", "coin"],
  ] as const;
  return <dl className="dash-stats">{stats.map(([title, value, unit, detail, icon]) => (
    <div className="dash-card dash-stat" key={title}>
      <dt>{title}<span className={`dash-tile ${icon}`}><Icon name={icon} /></span></dt>
      <dd><strong>{value}</strong> {unit && <small>{unit}</small>}</dd>
      {detail && <dd className="dash-stat-note">{detail}</dd>}
    </div>
  ))}</dl>;
}
