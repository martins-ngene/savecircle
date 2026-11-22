"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "../landing/icon";
import { CircleSummary, Facts, reviewFacts } from "./circle-summary";
import { CircleCreated } from "./circle-created";
import { slotName, type Frequency } from "./model";
import { useCreateCircle } from "./use-create-circle";

const steps = ["Basics", "Contributions", "Payout", "Review"];
const headings = [
  ["Name your circle.", "Make it yours.", "Start with a name and a short description. You’ll set the money rules next."],
  ["Set the amount.", "Keep it fair.", "Choose how much each member pays and when contributions start."],
  ["Set the payout.", "Keep it fair.", "Decide who is paid, in what order, and how many approvals a payout needs."],
  ["Review and create.", "Everything looks right?", "Check the details before saving your preview circle."],
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
        <form className="circle-form" onSubmit={(event) => { event.preventDefault(); vm.advance(); }}>
          {step === 0 && <section className="dash-card circle-card">
            <Field label="Circle name" count={`${draft.name.length} / 40`} hint="Pick a name every member will recognize."><input required maxLength={40} value={draft.name} placeholder="Surulere Savers" onChange={event => vm.update("name", event.target.value)} /></Field>
            <Field label="Description (optional)" count={`${draft.description.length} / 140`} hint="Members see this before they join."><textarea rows={4} maxLength={140} value={draft.description} onChange={event => vm.update("description", event.target.value)} /></Field>
            <div><strong>Currency</strong><div className="circle-currency"><span className="dash-tag">USDC</span> Stellar Testnet <small>Fixed</small></div></div>
          </section>}
          {step === 1 && <section className="dash-card circle-card circle-pair">
            <div className="circle-field"><strong>Number of members</strong><div className="circle-counter"><button type="button" aria-label="Remove one member" disabled={draft.members <= 2} onClick={() => vm.resize(draft.members - 1)}>−</button><output>{draft.members} members</output><button type="button" aria-label="Add one member" disabled={draft.members >= 12} onClick={() => vm.resize(draft.members + 1)}>+</button></div><small>2–12 members</small></div>
            <Field label="Contribution per member" hint="The same amount from every member each cycle."><input inputMode="decimal" value={draft.amount} onChange={event => vm.update("amount", event.target.value)} aria-invalid={!vm.plan.valid} /></Field>
            <fieldset className="circle-options"><legend>Contribution frequency</legend><div>{(["Weekly", "Every 2 weeks", "Monthly"] as Frequency[]).map(value => <label key={value}><input type="radio" name="frequency" checked={draft.frequency === value} onChange={() => vm.update("frequency", value)} /> <span>{value}</span></label>)}</div></fieldset>
            <Field label="Contribution start date" hint="The first contribution is due on this date."><input required type="date" value={draft.start} onChange={event => vm.update("start", event.target.value)} /></Field>
            {!vm.plan.valid && <p className="circle-error">Enter 0.01 to 1,000,000 USDC with up to two decimal places.</p>}
          </section>}
          {step === 2 && <>
            <fieldset className="dash-card circle-card circle-options circle-model"><legend>Payout model</legend><div>{(["Rotating", "Fixed"] as const).map(model => <label key={model}><input type="radio" name="payout" checked={draft.model === model} onChange={() => vm.update("model", model)} /><span><strong>{model} payout</strong><small>{model === "Rotating" ? "One member receives the full pool each cycle." : "One chosen recipient receives a set amount once the pool is funded."}</small></span></label>)}</div></fieldset>
            {draft.model === "Rotating" ? <section className="dash-card circle-card"><h2>Payout order</h2>
              <fieldset className="circle-options"><legend>Order method</legend><div>{(["Manual", "Random"] as const).map(method => <label key={method}><input type="radio" name="order" checked={draft.orderMethod === method} onChange={() => vm.setOrderMethod(method)} /><span>{method === "Manual" ? "I set the order" : "Random draw"}</span></label>)}</div></fieldset>
              {draft.orderMethod === "Random" && <button type="button" className="dash-link" onClick={vm.redraw}>Draw again</button>}
              <ol className="circle-order">{vm.cycles.map(({ slot, date }, index) => <li key={slot}><span className="circle-slot">{index + 1}</span><div><strong>{slotName(slot)}</strong><small>{date}</small></div>{draft.orderMethod === "Manual" && <div className="circle-move"><button type="button" aria-label={`Move ${slotName(slot)} earlier`} disabled={index === 0} onClick={() => vm.move(index, -1)}>↑</button><button type="button" aria-label={`Move ${slotName(slot)} later`} disabled={index === vm.cycles.length - 1} onClick={() => vm.move(index, 1)}>↓</button></div>}</li>)}</ol>
            </section> : <section className="dash-card circle-card circle-pair"><Field label="Recipient"><select value={draft.recipient} onChange={event => vm.update("recipient", Number(event.target.value))}>{draft.order.map(slot => <option key={slot} value={slot}>{slotName(slot)}</option>)}</select></Field><Field label="Fixed payout in USDC"><input inputMode="decimal" value={draft.fixedAmount} onChange={event => vm.update("fixedAmount", event.target.value)} /></Field>{!vm.valid[2] && <p className="circle-error">Enter a valid payout amount up to the pool per cycle.</p>}</section>}
            <section className="dash-card circle-card"><h2>Approvals and group rules</h2><div className="circle-pair">
              <Field label="Approvals needed"><select value={draft.approvals} onChange={event => vm.update("approvals", Number(event.target.value))}>{Array.from({ length: draft.members }, (_, i) => <option key={i} value={i + 1}>{i + 1} of {draft.members} members</option>)}</select></Field>
              <Field label="Payment deadline"><select value={draft.grace} onChange={event => vm.update("grace", Number(event.target.value))}>{[0, 1, 2, 3, 5, 7].map(days => <option key={days} value={days}>{days === 0 ? "On due date" : `${days} ${days === 1 ? "day" : "days"} after due date`}</option>)}</select></Field>
            </div><Field label="Additional rules (optional)" hint="Add one rule per line."><textarea rows={3} maxLength={500} value={draft.rules} onChange={event => vm.update("rules", event.target.value)} /></Field></section>
          </>}
          {step === 3 && <>
            {([["Circle basics", facts.basics], ["Contributions", facts.contributions], ["Payout and approvals", facts.payout]] as const).map(([name, rows], index) => <section className="dash-card circle-card" key={name}><div className="circle-card-heading"><h2>{name}</h2><button className="dash-link" type="button" aria-label={`Edit ${name.toLowerCase()}`} onClick={() => vm.edit(index)}>Edit</button></div><Facts rows={rows} />{index === 2 && <p>{vm.cycles.map(row => slotName(row.slot)).join(" → ")}</p>}</section>)}
            <section className="dash-card circle-card"><div className="circle-card-heading"><h2>Group rules</h2><button type="button" className="dash-link" onClick={() => vm.edit(2)}>Edit</button></div><ol className="circle-rules"><li>Members authorize each payment in their own wallet.</li><li>Payouts require a funded pool and the agreed approvals.</li><li>Rule changes need group approval.</li>{draft.rules.split("\n").map(value => value.trim()).filter(Boolean).map((rule, index) => <li key={index}>{rule}</li>)}</ol></section>
            <label className="dash-card circle-confirm"><input type="checkbox" checked={vm.confirmed} onChange={event => vm.setConfirmed(event.target.checked)} />I understand the rules lock after the first contribution and every payment requires wallet approval.</label>
          </>}
          <div className="circle-form-actions">
            {step === 0 && !vm.reviewEdit ? <Link className="button outline" href="/dashboard/circles">Cancel</Link> : <button type="button" className="button outline" onClick={vm.back}>Back</button>}
            <button className="button primary" disabled={!vm.valid[step]}>{vm.reviewEdit ? "Back to review" : ["Continue to contributions", "Continue to payout", "Continue to review", "Create preview circle"][step]}{step < 3 && <Icon name="arrow" />}</button>
          </div>
          {vm.error && <p className="circle-error" role="alert">{vm.error}</p>}
        </form>
      </div>
      <CircleSummary draft={draft} step={step} />
    </div>
  </div>;
}
