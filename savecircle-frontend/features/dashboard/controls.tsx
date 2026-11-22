"use client";

import { useRef, type ReactNode } from "react";
import { Icon } from "../landing/icon";
import { useDashboardSearch } from "./use-dashboard-search";

export function DashboardSearch({ onOverview = true }: { onOverview?: boolean }) {
  const { query, setQuery, results } = useDashboardSearch();
  return (
    <div className="dash-search" role="search" onKeyDown={(event) => { if (event.key === "Escape") setQuery(""); }}>
      <label className="dash-search-field">
        <Icon name="search" />
        <input aria-label="Search circles or activity" type="search" placeholder="Search circles or activity" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      {query.trim() && (
        <div className="dash-results">
          <p role="status">{results.length ? `${results.length} matching results` : "No matching circles or activity."}</p>
          {results.map((item, index) => (
            <a key={index} href={`${onOverview ? "" : "/dashboard"}#${"hash" in item ? `activity-${indexOfActivity(item.hash)}` : item.section}`} onClick={() => setQuery("")}>
              <strong>{item.label}</strong><small>{item.detail}</small>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

import { activity } from "./model";

function indexOfActivity(hash: string) {
  return activity.findIndex((item) => item.hash === hash);
}

export function DashboardDialog({ label, title, children, className }: { label: ReactNode; title: string; children: ReactNode; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={className} aria-label={title} aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>{label}</button>
      <dialog ref={dialog} className="wallet-dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
        <form method="dialog"><button className="button primary">Close</button></form>
      </dialog>
    </>
  );
}
