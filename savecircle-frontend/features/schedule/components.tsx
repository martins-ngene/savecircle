import Link from "next/link";
import type { ReactNode } from "react";
import { usdc } from "../landing/plan";
import type { Status } from "./model";

export function scheduleHref(circle?: string, screen?: string, cycle?: number, view?: string, from?: "ledger") {
  const params = new URLSearchParams();
  if (circle && circle !== "surulere") params.set("circle", circle);
  if (screen) params.set("screen", screen);
  if (cycle) params.set("cycle", String(cycle));
  if (view === "calendar") params.set("view", view);
  if (from) params.set("from", from);
  return `/dashboard/schedule${params.size ? `?${params}` : ""}`;
}

export function Heading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <header className="schedule-heading">
    <div><span className="schedule-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
    {children}
  </header>;
}

export function Badge({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "neutral" | "red" | "amber" | "lime" }) {
  return <span className="schedule-badge" data-tone={tone}>{children}</span>;
}

export function StatusBadge({ status }: { status: Status }) {
  const tone = status === "Overdue" ? "red" : status === "Pending" || status === "Due" ? "amber" : status === "Upcoming" ? "neutral" : "green";
  return <Badge tone={tone}>{status}</Badge>;
}

export function Action({ href, children, tone = "outline" }: { href: string; children: ReactNode; tone?: "outline" | "primary" | "lime" }) {
  return <Link className={`schedule-button ${tone}`} href={href}>{children}</Link>;
}

export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return <dl className="schedule-facts">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function Totals({ expected, paid, outstanding, expectedNote, paidNote, outstandingNote }: {
  expected: number; paid: number; outstanding: number; expectedNote: string; paidNote: string; outstandingNote: string;
}) {
  const stats = [["Expected to date", expected, expectedNote], ["Paid to date", paid, paidNote], ["Outstanding", outstanding, outstandingNote]] as const;
  return <dl className="schedule-totals">{stats.map(([label, value, note]) => <div className="schedule-card" key={label} data-alert={label === "Outstanding" && value > 0}>
    <dt>{label}</dt><dd>{usdc(value)}</dd><dd>{note}</dd>
  </div>)}</dl>;
}
