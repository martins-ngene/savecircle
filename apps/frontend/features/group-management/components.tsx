import type { ReactNode } from "react";

export const tabs = [
  ["members", "Members"],
  ["invitations", "Invitations"],
  ["rules", "Rules & schedule"],
  ["exits", "Exit requests"],
  ["activity", "Activity"],
] as const;

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
