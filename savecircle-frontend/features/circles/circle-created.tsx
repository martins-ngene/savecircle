"use client";

import Link from "next/link";
import { useState, type Ref } from "react";
import { Icon } from "../landing/icon";
import { circleDate, type ApiCircle } from "./api";
import { Facts } from "./circle-summary";

export function CircleInvite({ inviteToken }: { inviteToken: string }) {
  const [feedback, setFeedback] = useState("");
  const href = `/connect?invite=${encodeURIComponent(inviteToken)}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(href, window.location.origin).href);
      setFeedback("Invitation link copied.");
    } catch {
      setFeedback("Open the invitation and copy the address from your browser.");
    }
  }
  return <section className="dash-card circle-card">
    <h2>Invite link</h2>
    <div className="circle-invite-url"><code>{href}</code><button type="button" className="button primary" onClick={copy}>Copy</button></div>
    <Link href={href} className="dash-link circle-inline-link">Open invitation</Link>
    <p role="status">{feedback}</p>
  </section>;
}

export function CircleCreated({ circle, heading }: { circle: ApiCircle; heading: Ref<HTMLHeadingElement> }) {
  const first = circle.cycles[0];
  return <div className="circle-workspace">
    <header className="circle-success"><span className="circle-mark"><Icon name="check" /></span><div><span className="eyebrow">Circle created</span><h1 ref={heading} tabIndex={-1}>{circle.name} is ready to invite members.</h1></div></header>
    <div className="circle-created-grid">
      <div className="circle-form"><CircleInvite inviteToken={circle.inviteToken} /><section className="dash-card circle-card"><Facts rows={[["Pool per cycle", `${circle.targetAmount} USDC`], ["First contribution", first ? circleDate(first.dueDate) : "Unscheduled"], ["Withdrawal approvals", `${circle.approvalThreshold} of ${circle.totalMembers}`]]} /></section></div>
      <div className="circle-form"><div className="actions"><Link className="button primary" href={`/dashboard/circles?id=${encodeURIComponent(circle.id)}`}>Go to my circle</Link><Link className="button outline" href="/dashboard">Back to dashboard</Link></div></div>
    </div>
  </div>;
}
