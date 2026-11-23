import { shortWallet } from "../invitations/model";
import { calculatePlan, usdc } from "../landing/plan";
import { frequencies } from "./api";
import type { CircleDraft } from "./model";

export function Facts({ rows }: { rows: [string, string | number][] }) {
  return <dl className="circle-facts">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function CircleSummary({ draft, step, wallet }: { draft: CircleDraft; step: number; wallet: string }) {
  const plan = calculatePlan(draft.members, draft.amount);
  return <aside className="circle-preview">
    <span className="eyebrow">Circle summary</span>
    <div className="circle-preview-title"><div><h2>{draft.name.trim() || "Your circle"}</h2><p>Organizer {shortWallet(wallet)}</p></div></div>
    {draft.description.trim() && <p>{draft.description.trim()}</p>}
    {step > 0 && <><p>Pool per cycle</p><strong className="circle-pool">{plan.valid ? usdc(plan.pool) : "—"}</strong>
      <Facts rows={[["Members", draft.members], ["Cycles", draft.members], ["Frequency", draft.frequency]]} />
    </>}
    {step > 1 && <Facts rows={[["Payout", "Rotating"], ["Organizer’s spot", "1"], ["Withdrawal approvals", `${draft.approvals} of ${draft.members}`]]} />}
  </aside>;
}

export function reviewFacts(draft: CircleDraft) {
  const plan = calculatePlan(draft.members, draft.amount);
  return {
    basics: [["Circle name", draft.name], ["Description", draft.description.trim()], ["Currency", "USDC · Stellar Testnet"]],
    contributions: [["Members", draft.members], ["Contribution per member", usdc(plan.pool / draft.members)], ["Frequency", draft.frequency], ["First contribution", `${frequencies[draft.frequency].days} days after creation`]],
    payout: [["Payout model", "Rotating"], ["Organizer’s spot", "1"], ["Withdrawal approvals", `${draft.approvals} of ${draft.members}`]],
  } as { basics: [string, string | number][]; contributions: [string, string | number][]; payout: [string, string | number][] };
}
