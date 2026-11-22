import { calculatePlan, usdc } from "../landing/plan";
import { cycleDate, payoutRows, slotName, type CircleDraft } from "./model";

export function Facts({ rows }: { rows: [string, string | number][] }) {
  return <dl className="circle-facts">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function CircleSummary({ draft, step }: { draft: CircleDraft; step: number }) {
  const plan = calculatePlan(draft.members, draft.amount);
  const payout = draft.model === "Fixed" ? calculatePlan(1, draft.fixedAmount).pool : plan.pool;
  const cycles = payoutRows(draft);
  return <aside className="circle-preview">
    <span className="eyebrow">{["How members will see it", "Your plan at a glance", "Your plan at a glance", "Ready to create"][step]}</span>
    {step === 0 ? <>
      <div className="circle-preview-title"><span className="circle-mark">{draft.name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase() || "SC"}</span><div><h2>{draft.name.trim() || "Your circle"}</h2><p>Organized by Ada Okafor</p></div></div>
      {draft.description.trim() && <p>{draft.description.trim()}</p>}
      <Facts rows={[["Currency", "USDC · Testnet"], ["Contribution", "Set in next step"]]} />
      <p className="circle-callout"><strong>You’ll be the organizer.</strong> You can invite members after creating the circle.</p>
    </> : <>
      <p>Pool per cycle</p><strong className="circle-pool">{plan.valid ? usdc(plan.pool) : "—"}</strong>
      <div className="circle-preview-bar" />
      <p>{draft.members} members × {plan.valid ? usdc(plan.pool / draft.members) : "—"}</p>
      <Facts rows={[["Total per member", usdc(plan.pool * cycles.length / draft.members)], ["Savings target", usdc(plan.pool * cycles.length)], ["Cycles", cycles.length], ["Frequency", draft.frequency]]} />
      {step === 3 ? <><Facts rows={[["Approvals", `${draft.approvals} of ${draft.members}`], ["Organizer wallet", "GBCJ…7K4P"], ["Network", "Stellar Testnet"]]} /><p className="circle-callout">Creating this preview circle takes no contribution.</p></> :
        <><h3>{draft.model === "Fixed" ? "Fixed payout" : "Rotating payout order"}</h3>
          <ol className="circle-order">{cycles.slice(0, 3).map(({ slot, date }, i) => <li key={slot}><span className="circle-slot">{i + 1}</span><div><strong>{slotName(slot)}</strong><small>{date}</small></div><strong>{usdc(payout)}</strong></li>)}</ol>
          {cycles.length > 3 && <p>+ {cycles.length - 3} more cycles</p>}
        </>}
    </>}
  </aside>;
}

export function reviewFacts(draft: CircleDraft) {
  const plan = calculatePlan(draft.members, draft.amount);
  const cycles = payoutRows(draft);
  return {
    basics: [["Circle name", draft.name], ["Description", draft.description.trim() || "—"], ["Currency", "USDC · Stellar Testnet"]],
    contributions: [["Members", draft.members], ["Contribution per member", usdc(plan.pool / draft.members)], ["Frequency", draft.frequency], ["Start date", cycleDate(draft.start, draft.frequency)], ["Savings target", usdc(plan.pool * cycles.length)]],
    payout: [["Payout model", `${draft.model} payout`], ["Approvals needed", `${draft.approvals} of ${draft.members} members`], ["Payment deadline", `${draft.grace} days after due date`], ...(draft.model === "Fixed" ? [["Fixed payout amount", usdc(calculatePlan(1, draft.fixedAmount).pool)]] : [])],
  } as { basics: [string, string | number][]; contributions: [string, string | number][]; payout: [string, string | number][] };
}
