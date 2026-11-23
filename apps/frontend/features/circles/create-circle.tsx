"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "../landing/icon";
import { CircleSummary, Facts, reviewFacts } from "./circle-summary";
import { CircleCreated } from "./circle-created";
import { frequencies } from "./api";
import type { Frequency } from "./model";
import { useCreateCircle } from "./use-create-circle";

const steps = ["Basics", "Contributions", "Payout", "Review"];
const headings = [
  ["Name your circle.", "Make it yours.", "Start with a name and a short description. You’ll set the money rules next."],
  ["Set the amount.", "Keep it fair.", "Choose how much each member contributes and how often."],
  ["Set the payout.", "Keep it fair.", "Review the rotating payout and set the withdrawal approval threshold."],
  ["Review and create.", "Everything looks right?", "Check the details before creating your circle."],
];

function Field({ label, count, children, hint }: { label: string; count?: string; children: ReactNode; hint?: string }) {
  return <label className="circle-field"><span><strong>{label}</strong>{count && <small>{count}</small>}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function CreateCircle() {
  const vm = useCreateCircle();
  const { draft, step } = vm;
  const heading = useRef<HTMLHeadingElement>(null);
  const created = Boolean(vm.created);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.closest(".dash-workspace")?.scrollTo({ top: 0, behavior: "instant" });
  }, [step, created]);
  if (vm.created) return <CircleCreated circle={vm.created} heading={heading} />;

  if (!vm.session) return <div className="circle-workspace"><h1>Create circle</h1>{vm.error && <p role="alert">{vm.error}</p>}{vm.session === undefined ? <p role="status">Loading wallet session…</p> : <Link className="button primary" href="/connect?next=create-circle">Connect wallet</Link>}</div>;

  const facts = reviewFacts(draft);

  return <div className="circle-workspace">
    <div className="circle-create-grid">
      <div className="circle-create-main">
        <header className="circle-heading">
          <span className="eyebrow">Create savings circle</span>
          <h1 tabIndex={-1} ref={heading}>{headings[step][0]}<em>{headings[step][1]}</em></h1>
          <p>{headings[step][2]}</p>
          <ol className="circle-steps" aria-label="Creation steps">{steps.map((label, index) => <li key={label} data-complete={index < step} aria-current={index === step ? "step" : undefined}>{label}</li>)}</ol>
        </header>
        <form className="circle-form" onSubmit={(event) => { event.preventDefault(); void vm.advance(); }}>
          {step === 0 && <section className="dash-card circle-card">
            <Field label="Circle name" count={`${draft.name.length} / 40`} hint="Pick a name every member will recognize."><input required maxLength={40} value={draft.name} placeholder="Surulere Savers" onChange={event => vm.update("name", event.target.value)} /></Field>
            <Field label="Description" count={`${draft.description.length} / 140`} hint="Members see this before they join."><textarea required rows={4} maxLength={140} value={draft.description} onChange={event => vm.update("description", event.target.value)} /></Field>
            <div><strong>Currency</strong><div className="circle-currency"><span className="dash-tag">USDC</span> Stellar Testnet <small>Fixed</small></div></div>
          </section>}
          {step === 1 && <section className="dash-card circle-card circle-pair">
            <div className="circle-field"><strong>Number of members</strong><div className="circle-counter"><button type="button" aria-label="Remove one member" disabled={draft.members <= 2} onClick={() => vm.resize(draft.members - 1)}>−</button><output>{draft.members} members</output><button type="button" aria-label="Add one member" disabled={draft.members >= 12} onClick={() => vm.resize(draft.members + 1)}>+</button></div><small>2–12 members</small></div>
            <Field label="Contribution per member" hint="The same amount from every member each cycle."><input inputMode="decimal" value={draft.amount} onChange={event => vm.update("amount", event.target.value)} aria-invalid={!vm.plan.valid} /></Field>
            <fieldset className="circle-options"><legend>Contribution frequency</legend><div>{(["Weekly", "Every 2 weeks", "Monthly"] as Frequency[]).map(value => <label key={value}><input type="radio" name="frequency" checked={draft.frequency === value} onChange={() => vm.update("frequency", value)} /> <span>{value}</span></label>)}</div></fieldset>
            <p>The first contribution is scheduled {frequencies[draft.frequency].days} days after creation.</p>
            {!vm.plan.valid && <p className="circle-error">Enter 0.01 to 1,000,000 USDC with up to two decimal places.</p>}
          </section>}
          {step === 2 && <>
            <section className="dash-card circle-card"><h2>Rotating payout</h2><p>The organizer takes the first spot. Members who join take the next open spot.</p></section>
            <section className="dash-card circle-card"><h2>Approvals and group rules</h2><div className="circle-pair">
              <Field label="Withdrawal approvals"><select value={draft.approvals} onChange={event => vm.update("approvals", Number(event.target.value))}>{Array.from({ length: draft.members }, (_, i) => <option key={i} value={i + 1}>{i + 1} of {draft.members} members</option>)}</select></Field>

            </div><Field label="Additional rules (optional)" hint="Add one rule per line."><textarea rows={3} maxLength={500} value={draft.rules} onChange={event => vm.update("rules", event.target.value)} /></Field></section>
          </>}
          {step === 3 && <>
            {([["Circle basics", facts.basics], ["Contributions", facts.contributions], ["Payout and approvals", facts.payout]] as const).map(([name, rows], index) => <section className="dash-card circle-card" key={name}><div className="circle-card-heading"><h2>{name}</h2><button className="dash-link" type="button" disabled={vm.busy} aria-label={`Edit ${name.toLowerCase()}`} onClick={() => vm.edit(index)}>Edit</button></div><Facts rows={rows} /></section>)}
            <section className="dash-card circle-card"><div className="circle-card-heading"><h2>Group rules</h2><button type="button" disabled={vm.busy} className="dash-link" onClick={() => vm.edit(2)}>Edit</button></div><ol className="circle-rules"><li>Members authorize each payment in their own wallet.</li><li>Rotating payouts require a fully funded pool.</li><li>Rule changes need group approval.</li>{draft.rules.split("\n").map(value => value.trim()).filter(Boolean).map((rule, index) => <li key={index}>{rule}</li>)}</ol></section>
            <label className="dash-card circle-confirm"><input type="checkbox" disabled={vm.busy} checked={vm.confirmed} onChange={event => vm.setConfirmed(event.target.checked)} />I have reviewed the circle’s contribution and payout rules.</label>
          </>}
          <div className="circle-form-actions">
            {step === 0 && !vm.reviewEdit ? <Link className="button outline" href="/dashboard/circles">Cancel</Link> : <button type="button" className="button outline" disabled={vm.busy} onClick={vm.back}>Back</button>}
            <button className="button primary" disabled={!vm.valid[step] || vm.busy}>{vm.busy ? "Creating…" : vm.reviewEdit ? "Back to review" : ["Continue to contributions", "Continue to payout", "Continue to review", "Create circle"][step]}{step < 3 && <Icon name="arrow" />}</button>
          </div>
          {vm.error && <p className="circle-error" role="alert">{vm.error}</p>}
        </form>
      </div>
      <CircleSummary draft={draft} step={step} wallet={vm.session.walletAddress} />
    </div>
  </div>;
}
