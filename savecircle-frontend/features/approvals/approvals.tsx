"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { usdc } from "../landing/plan";
import { payoutPreviewDate, payoutView, type PayoutView } from "../payouts/model";
import { referenceCircle } from "../schedule/model";
import { updateSchedulePreview, useSchedulePreview } from "../schedule/storage";
import { ApprovalLoading, approvalHref } from "./components";
import { ApprovalQueue } from "./queue";
import { existingRequest, nextRequest, type RequestEvent } from "./request";
import { ReviewApproval } from "./review";
import { NewWithdrawal, WithdrawalEligibility, WithdrawalStatus } from "./withdrawal";

type WalletAction = { type: "submit"; reason: string } | { type: "sign" };

function canRequest(vm: PayoutView) {
  return vm.status === "approvals" && vm.authorized && vm.available >= vm.amount;
}

export function Approvals() {
  const router = useRouter();
  const params = useSearchParams();
  const view = params.get("view");
  const completed = params.get("tab") === "completed";
  const preview = useSchedulePreview(referenceCircle.id);
  const dialog = useRef<HTMLDialogElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const previousHeading = useRef<HTMLHeadingElement | null>(null);
  const [wallet, setWallet] = useState<WalletAction | null>(null);
  const [declined, setDeclined] = useState(false);
  const [checking, startChecking] = useTransition();
  const vm = payoutView(referenceCircle, payoutPreviewDate, preview);
  const saved = vm && preview.withdrawals?.[vm.cycle.number];
  const canCreate = !!vm && canRequest(vm) && !saved;
  const request = saved ?? (canCreate ? existingRequest : undefined);

  useEffect(() => {
    const heading = workspace.current?.querySelector("h1") ?? null;
    if (previousHeading.current && heading) {
      heading.focus({ preventScroll: true });
      heading.closest(".dash-workspace")?.scrollTo({ top: 0 });
    }
    previousHeading.current = heading;
  }, [view, completed, checking, saved?.phase, saved?.vote, declined]);

  function advance(event: RequestEvent) {
    updateSchedulePreview(referenceCircle.id, current => {
      const latest = payoutView(referenceCircle, payoutPreviewDate, current);
      if (!latest || !canRequest(latest)) return current;
      const cycle = latest.cycle.number;
      const stored = current.withdrawals?.[cycle];
      const source = stored ?? (event.type === "submit" ? undefined : existingRequest);
      const updated = nextRequest(source, event, true);
      return updated && updated !== source
        ? { ...current, withdrawals: { ...current.withdrawals, [cycle]: updated } }
        : current;
    });
  }

  function start(action: WalletAction) {
    setWallet(action);
    dialog.current?.showModal();
  }

  function finish(approved: boolean) {
    dialog.current?.close();
    if (!wallet) return;
    if (approved) {
      advance(wallet);
      if (wallet.type === "submit") router.replace(approvalHref("request"));
    } else if (wallet.type === "sign") {
      setDeclined(true);
    }
    setWallet(null);
  }

  if (!vm) return <ApprovalLoading />;
  const approvalStatus = request?.phase === "open" && (request.vote || canRequest(vm));
  const requesterStatus = request && (vm.status === "approvals" || vm.status === "ready");
  const shownRequester = requesterStatus ? request : vm.status === "ready" ? { ...existingRequest, vote: "confirmed" as const } : undefined;
  const back = approvalHref(saved ? "request" : "new");

  return <div ref={workspace} className="approval-workspace">
    {checking || view === "loading" ? <ApprovalLoading exit={view === "loading"} />
      : view === "eligibility" ? <WithdrawalEligibility vm={vm} back={back} />
      : view === "new" && !saved && vm.status !== "ready" && !vm.release ? <NewWithdrawal vm={vm} eligible={canCreate} start={reason => start({ type: "submit", reason })} />
      : view === "review" && request && approvalStatus ? <ReviewApproval vm={vm} request={request} declined={declined} start={() => start({ type: "sign" })} retry={() => setDeclined(false)} confirm={() => advance({ type: "confirm" })} />
      : (view === "request" || view === "ready") && shownRequester ? <WithdrawalStatus vm={vm} request={shownRequester} advance={() => advance({ type: shownRequester.phase === "registering" ? "register" : "refresh" })} />
      : <ApprovalQueue vm={vm} request={request} completed={completed} canCreate={canCreate} refresh={() => startChecking(() => router.refresh())} />}
    <dialog className="wallet-dialog approval-wallet" ref={dialog} aria-labelledby="approval-wallet-title" onClose={() => setWallet(null)}>
      <h2 id="approval-wallet-title">Stellar Testnet preview wallet</h2>
      <p>{wallet?.type === "submit" ? "Sign the withdrawal request" : "Sign your approval"} for {usdc(vm.amount)} to {vm.pool.recipient}.</p>
      <div className="approval-stack">
        <button type="button" className="approval-button" data-tone="green" onClick={() => finish(true)}>{wallet?.type === "submit" ? "Sign preview request" : "Sign preview approval"}</button>
        <button type="button" className="approval-button" onClick={() => finish(false)}>Decline signature</button>
      </div>
    </dialog>
  </div>;
}
