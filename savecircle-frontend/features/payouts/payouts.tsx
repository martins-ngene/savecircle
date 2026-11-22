"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { sampleCircles } from "../circles/model";
import { useSavedCircles } from "../circles/storage";
import { referenceCircle } from "../schedule/model";
import { updateSchedulePreview, useSchedulePreview } from "../schedule/storage";
import { PayoutHeading, PayoutLink, PayoutLoading, PayoutTotals } from "./components";
import { PayoutFlow } from "./flow";
import { beforeFirstCycle, confirmTime, payoutHref, payoutPreviewDate, payoutView, submitTime } from "./model";
import { PayoutAccounting, PayoutHistory, PayoutOrder, PayoutOverview } from "./overview";
import { nextRelease, type ReleaseEvent } from "./release";

export function Payouts() {
  const router = useRouter();
  const params = useSearchParams();
  const [checking, startChecking] = useTransition();
  const circles = [referenceCircle, ...useSavedCircles(), ...sampleCircles];
  const id = params.get("circle") ?? referenceCircle.id;
  const circle = circles.find(item => item.id === id);
  const preview = useSchedulePreview(id);
  const sample = circle === referenceCircle || sampleCircles.some(item => item.id === id);
  const snapshot = params.get("snapshot");
  const first = sample && snapshot === "first";
  const today = first ? beforeFirstCycle : sample ? payoutPreviewDate : new Date();
  const vm = circle && payoutView(circle, today, first ? {} : preview);
  const back = payoutHref(id, undefined, first ? "first" : undefined);
  const picker = <select className="payout-button" aria-label="Savings circle" value={id} onChange={event => router.push(payoutHref(event.target.value))}>
    {circles.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
  </select>;

  function refreshApprovals() {
    if (!circle || !vm) return;
    updateSchedulePreview(id, current => {
      const latest = payoutView(circle, today, current);
      if (!latest || latest.status !== "approvals" || !latest.authorized) return current;
      return { ...current, payoutApprovals: { ...current.payoutApprovals, [latest.cycle.number]: latest.approvals + 1 } };
    });
  }

  function update(event: ReleaseEvent) {
    if (!circle || !vm || first) return;
    updateSchedulePreview(id, current => {
      const latest = payoutView(circle, today, current);
      if (!latest || latest.cycle.number !== vm.cycle.number) return current;
      const saved = latest.release;
      const state = nextRelease(saved?.state, event, latest.status);
      if (!state || state === saved?.state) return current;
      const submitted = saved?.submitted ?? submitTime;
      const record = state === "paid" ? { state, submitted, confirmed: confirmTime } : { state, submitted };
      return { ...current, payouts: { ...current.payouts, [vm.cycle.number]: record } };
    });
  }

  if (checking || snapshot === "loading") return <PayoutLoading onCancel={snapshot === "loading" ? back : undefined}>{picker}</PayoutLoading>;
  if (!vm || !circle) return <div className="payout-workspace">
    <PayoutHeading description="Choose a savings circle to view its payout plan." />
    <PayoutLink href={payoutHref()}>View Surulere Savers</PayoutLink>
  </div>;

  const isReleaseScreen = params.get("screen") === "release";
  const showFlow = !first && (vm.status === "paid" || isReleaseScreen && ["ready", "pending"].includes(vm.status));
  return <div className="payout-workspace">
    {showFlow ? <PayoutFlow key={`${id}:${vm.cycle.number}`} vm={vm} back={back} showBack={isReleaseScreen} update={update} />
      : <>
        <PayoutHeading title={circle.model === "Fixed" ? "Fixed payout" : undefined} description={circle.model === "Fixed" ? "One shared pool for the agreed recipient." : undefined}>
          <div className="payout-actions">{picker}<button className="payout-button" onClick={() => startChecking(() => router.refresh())}>{vm.status === "ready" ? "Refresh status · Ready" : "Refresh status"}</button></div>
        </PayoutHeading>
        <PayoutTotals vm={vm} />
        <PayoutOverview vm={vm} refreshApprovals={refreshApprovals} />
      </>}
    {(!showFlow || vm.status === "paid") && <>
      <PayoutOrder vm={vm} /><PayoutHistory vm={vm} /><PayoutAccounting vm={vm} />
      <div className="payout-actions payout-preview-options">
        {sample && <PayoutLink href={first ? payoutHref(id) : payoutHref(id, undefined, "first")}>{first ? "Current payout preview" : "Preview before the first cycle"}</PayoutLink>}
        <PayoutLink href={payoutHref(id, undefined, "loading")}>Preview loading state</PayoutLink>
        {showFlow && picker}
      </div>
    </>}
  </div>;
}
