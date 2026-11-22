import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardDialog } from "../dashboard/controls";
import { member } from "../dashboard/model";
import { Shimmer } from "../loading/shimmer";

export const approvalsHref = "/dashboard/approvals";
export const noraWallet = "GBNR…8L2Q";

export function approvalHref(view: string) {
  return approvalsHref + "?view=" + view;
}

export function ApprovalLink({ href, children, tone = "white" }: { href: string; children: ReactNode; tone?: "green" | "white" | "lime" | "soft" }) {
  return <Link className="approval-button" data-tone={tone} href={href}>{children}</Link>;
}

export function ApprovalHeading({ title, description, eyebrow, role }: {
  title: string; description: string; eyebrow?: string; role?: "Authorized member" | "Requester" | "Authorized executor" | "Active member";
}) {
  return <>
    <div className="approval-actor">
      <strong>{role ? member.name : "Nora O."} · {role ?? "Eligible approver"}</strong>
      <span>{role ? member.wallet : noraWallet} · Stellar Testnet preview</span>
    </div>
    <header className="approval-heading">
      {eyebrow && <span className="approval-eyebrow">{eyebrow}</span>}
      <h1 tabIndex={-1}>{title}</h1>
      <p>{description}</p>
    </header>
  </>;
}

export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return <dl className="approval-facts">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function ApprovalNote({ title, children }: { title: string; children: ReactNode }) {
  return <aside className="approval-card approval-note"><h2>{title}</h2>{children}</aside>;
}

export function ApprovalTransaction({ reference }: { reference: string }) {
  return <DashboardDialog className="approval-button" label="View transaction details ↗" title="Preview transaction">
    <Facts rows={[["Reference", reference], ["Network", "Stellar Testnet preview"]]} />
    <p>This reference belongs to the local preview.</p>
  </DashboardDialog>;
}

export function ApprovalLoading({ exit }: { exit?: boolean }) {
  return <div className="approval-workspace">
    <ApprovalHeading title="Loading approvals" description="Surulere Savers · Checking request records" />
    <div className="approval-grid">
      <Shimmer title="Checking your review queue…" description="Checking request status, prior votes and wallet eligibility." rows={9} columns={1} />
      <div className="approval-stack">
        <ApprovalNote title="Checking approval records"><p>Request amounts and review counts will appear when the queue is ready.</p></ApprovalNote>
        {exit && <ApprovalLink href={approvalsHref}>Back to approvals</ApprovalLink>}
      </div>
    </div>
  </div>;
}
