import Link from "next/link";
import type { ReactNode } from "react";
import { member } from "../dashboard/model";
import { Shimmer } from "../loading/shimmer";
import { groupHref, groupPath, organizer } from "./model";

export const tabs = [
  ["members", "Members"],
  ["invitations", "Invitations"],
  ["rules", "Rules & schedule"],
  ["exits", "Exit requests"],
  ["activity", "Activity"],
] as const;

export function GroupHeader({ title, description, tab, snapshot, memberView, unavailable }: {
  title: string; description: string; tab: string; snapshot?: string; memberView?: boolean; unavailable?: boolean;
}) {
  const account = memberView ? member : organizer;
  return <>
    <div className="gm-actor">
      <strong>{account.name} · {memberView ? "Active member" : "Organizer"} · {account.wallet}</strong>
      <span>{snapshot ?? "Surulere Savers · August 5, 2025"}</span>
    </div>
    <header className="gm-heading">
      <span className="gm-eyebrow">{memberView ? "Surulere Savers / Membership" : "My circles / Surulere Savers"}</span>
      <h1 tabIndex={-1}>{title}</h1>
      <p>{description}</p>
    </header>
    {!memberView && <nav className="gm-tabs" aria-label="Group management sections">
      {tabs.map(([key, label]) => {
        const text = key === "exits" ? `${label} ${unavailable ? "—" : snapshot?.includes("Setup") ? 0 : 1}` : label;
        return unavailable
          ? <button key={key} type="button" className="gm-button" data-active={tab === key} disabled>{text}</button>
          : <Link key={key} href={groupHref(key)} className="gm-button" aria-current={tab === key ? "page" : undefined}>{text}</Link>;
      })}
    </nav>}
  </>;
}

export function GroupLink({ href, primary, children }: { href: string; primary?: boolean; children: ReactNode }) {
  return <Link href={href} className="gm-button" data-primary={primary || undefined}>{children}</Link>;
}

export function GroupFacts({ rows }: { rows: [string, ReactNode][] }) {
  return <dl className="gm-facts">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function GroupStats({ items }: { items: [string, ReactNode, string?][] }) {
  return <dl className="gm-stats" data-count={items.length}>
    {items.map(([title, value, detail]) => <div className="gm-card" key={title}><dt>{title}</dt><dd><strong>{value}</strong></dd>{detail && <dd>{detail}</dd>}</div>)}
  </dl>;
}

export function GroupTable({ label, headers, rows, layout }: {
  label: string; headers: string[]; rows: { key: string; cells: ReactNode[] }[]; layout?: "members" | "activity";
}) {
  return <table className="gm-table" data-layout={layout} aria-label={label} role="table">
    <thead role="rowgroup"><tr role="row">{headers.map((header, index) => <th key={index} scope="col" role="columnheader">{header || <span className="gm-sr">Details</span>}</th>)}</tr></thead>
    <tbody role="rowgroup">{rows.map(row => <tr key={row.key} role="row">
      {row.cells.map((cell, index) => <td key={index} role="cell">
        {headers[index] && <span className="gm-mobile-label" aria-hidden="true">{headers[index]}</span>}{cell}
      </td>)}
    </tr>)}</tbody>
  </table>;
}

export function GroupLoading({ preview }: { preview?: boolean }) {
  return <div className="gm-workspace">
    <GroupHeader title="Loading group records" description="Checking member, schedule and activity records." tab="members" snapshot="Verifying current records…" unavailable />
    <Shimmer title="Retrieving the group’s latest records…" description="Membership, registered wallets, contributions and agreed rules are being checked." />
    <p>Management actions become available once the records load.</p>
    {preview && <div><GroupLink href={groupPath}>Back to members</GroupLink></div>}
  </div>;
}
