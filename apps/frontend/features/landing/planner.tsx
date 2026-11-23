"use client";

import { frequencies, maxMembers, minMembers, usdc } from "./plan";
import { usePlanner } from "./use-planner";

export function Planner() {
  const vm = usePlanner();
  const displayAmount = (cents: number) => vm.plan.valid ? usdc(cents) : "—";
  return (
    <div className="planner panel">
      <form className="planner-form" onChange={vm.clearFeedback} onSubmit={(event) => { event.preventDefault(); if (vm.plan.valid) void vm.copyPlan(); }}>
        <div className="spread"><div><div className="eyebrow muted">Create savings circle</div><h3>The Growth Circle</h3></div><span className="tag">Testnet USDC</span></div>
        <div className="field">
          <label className="spread" htmlFor="members">Number of members <output htmlFor="members">{vm.members}</output></label>
          <input id="members" type="range" min={minMembers} max={maxMembers} value={vm.members} onChange={(event) => vm.setMembers(event.target.valueAsNumber)} />
          <div className="spread small"><span>3 members</span><span>12 members</span></div>
        </div>
        <div className="field">
          <label htmlFor="amount">Contribution per member</label>
          <div className="amount"><input id="amount" inputMode="decimal" value={vm.amount} onChange={(event) => vm.setAmount(event.target.value)} aria-invalid={!vm.plan.valid} aria-describedby={vm.plan.valid ? undefined : "amount-error"} /><span>USDC</span></div>
          {!vm.plan.valid && <p id="amount-error" className="error">Enter 0.01 to 1,000,000 USDC with up to two decimal places.</p>}
        </div>
        <fieldset className="field"><legend>Contribution frequency</legend><div className="segments">
          {(Object.keys(frequencies) as (keyof typeof frequencies)[]).map((frequency) => <label key={frequency}><input type="radio" name="frequency" checked={vm.frequency === frequency} onChange={() => vm.setFrequency(frequency)} /><span>{frequency}</span></label>)}
        </div></fieldset>
        <button className="button primary copy" disabled={!vm.plan.valid}>▢ &nbsp; Copy savings plan</button>
        <p className="feedback" role="status">{vm.feedback}</p>
      </form>
      <div className="planner-results">
        <div className="eyebrow muted">Your plan at a glance</div>
        <dl className="metrics">
          {[["Pool per cycle", displayAmount(vm.plan.pool)], ["Rotating cycles", vm.members], ["Total per member", displayAmount(vm.plan.pool)], ["Circle total", displayAmount(vm.plan.total)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        <div className="spread"><strong>Rotating payout order</strong><span className="small">{vm.interval}</span></div>
        <ol className="payouts" aria-label="Rotating payout order" tabIndex={0}>
          {vm.plan.order.map((member) => <li key={member}><span className="round">{member}</span><span>Member {member}<small>Cycle {member}</small></span><strong>{displayAmount(vm.plan.pool)}</strong></li>)}
        </ol>
        <p className="small">Illustrative plan only. Payouts require verified on-chain balances, full funding and the agreed approvals.</p>
      </div>
    </div>
  );
}
