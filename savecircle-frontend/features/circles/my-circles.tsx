"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "../landing/icon";
import { calculatePlan, usdc } from "../landing/plan";
import { CircleInvite } from "./circle-created";
import { Facts, reviewFacts } from "./circle-summary";
import { payoutRows, sampleCircles, slotName, type SavedCircle } from "./model";
import { useSavedCircles } from "./storage";

function CircleDetail({ circle, local }: { circle: SavedCircle; local: boolean }) {
  const facts = reviewFacts(circle);
  const pool = circle.model === "Fixed" ? calculatePlan(1, circle.fixedAmount).pool : calculatePlan(circle.members, circle.amount).pool;
  const cycleRows = payoutRows(circle);
  return <>
    <Link href="/dashboard/circles" className="dash-link circle-inline-link">← My circles</Link>
    <header className="circle-heading"><span className="eyebrow">{local ? "Saved preview" : "Sample circle"}</span><h1>{circle.name}</h1>{circle.description && <p>{circle.description}</p>}</header>
    <div className="circle-created-grid">
      <div className="circle-form">
        <section className="dash-card circle-card"><h2>Contributions</h2><Facts rows={facts.contributions} /><Link className="button outline" href={`/dashboard/schedule?circle=${encodeURIComponent(circle.id)}`}>View schedule</Link></section>
        <section className="dash-card circle-card"><h2>Payouts and approvals</h2><Facts rows={facts.payout} />
          <ol className="circle-order">{cycleRows.map(({ slot, date }, index) => <li key={slot}><span className="circle-slot">{index + 1}</span><div><strong>{slotName(slot)}</strong><small>{date}</small></div><strong>{usdc(pool)}</strong></li>)}</ol>
        </section>
      </div>
      <div className="circle-form">
        {local && <CircleInvite circle={circle} />}
        <section className="dash-card circle-card"><h2>Group rules</h2><p>Members approve their own payments. Payouts require a funded pool and the agreed approvals.</p>{circle.rules.trim() && <p className="circle-preserve">{circle.rules}</p>}</section>
      </div>
    </div>
  </>;
}

export function MyCircles() {
  const params = useSearchParams();
  const id = params.get("id");
  const saved = useSavedCircles();
  const circles = [...saved, ...sampleCircles];
  const selected = circles.find(item => item.id === id);
  return <div className="circle-workspace">
    {selected ? <CircleDetail circle={selected} local={saved.includes(selected)} /> : <>
      <div className="circle-list-header">
        <header className="circle-heading"><span className="eyebrow">Workspace</span><h1>My circles</h1><p>Review your circles, schedules, and payout rules.</p></header>
        <div className="dash-actions"><Link className="button outline" href="/connect"><Icon name="link" />Join circle</Link><Link className="button primary" href="/dashboard/circles/create"><Icon name="plus" />Create circle</Link></div>
      </div>
      {id && <p role="status">This circle is unavailable in this browser.</p>}
      <div className="circle-list">{circles.map(circle => <article key={circle.id} className="dash-card circle-card">
        <div className="circle-card-heading"><span className="circle-mark">{circle.name.split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase()}</span><h2>{circle.name}</h2><span className="dash-tag">{saved.includes(circle) ? "Saved preview" : "Sample"}</span></div>
        <p>{circle.description || `${circle.frequency} contributions`}</p>
        <Facts rows={[["Contribution", `${circle.amount} USDC`], ["Members", circle.members], ["Frequency", circle.frequency]]} />
        <Link href={`/dashboard/circles?id=${circle.id}`} className="button outline">View circle <Icon name="arrow" /></Link>
      </article>)}</div>
    </>}
  </div>;
}
