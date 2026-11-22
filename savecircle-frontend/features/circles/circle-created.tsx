"use client";

import Link from "next/link";
import { useState, type Ref } from "react";
import { Icon } from "../landing/icon";
import { calculatePlan, usdc } from "../landing/plan";
import { Facts } from "./circle-summary";
import { cycleDate, type SavedCircle } from "./model";

export function CircleInvite({ circle }: { circle: SavedCircle }) {
  const [feedback, setFeedback] = useState("");
  const href = `/connect?invite=${encodeURIComponent(circle.id)}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(href, window.location.origin).href);
      setFeedback("Preview link copied.");
    } catch {
      setFeedback("Clipboard unavailable. Open the invitation and copy the address.");
    }
  }
  return <section className="dash-card circle-card">
    <h2>Invite link</h2>
    <div className="circle-invite-url"><code>{href}</code><button type="button" className="button primary" onClick={copy}>Copy</button></div>
    <p>This preview link opens in the browser where the circle was created.</p>
    <Link href={href} className="dash-link circle-inline-link">Open invitation preview</Link>
    <p role="status">{feedback}</p>
  </section>;
}

export function CircleCreated({ circle, heading }: { circle: SavedCircle; heading: Ref<HTMLHeadingElement> }) {
  return <div className="circle-workspace">
    <header className="circle-success"><span className="circle-mark"><Icon name="check" /></span><div><span className="eyebrow">Circle created</span><h1 ref={heading} tabIndex={-1}>{circle.name} is ready.</h1><p>Your preview circle is saved in this browser.</p></div></header>
    <div className="circle-created-grid">
      <div className="circle-form"><CircleInvite circle={circle} /><section className="dash-card circle-card"><Facts rows={[["Pool per cycle", usdc(calculatePlan(circle.members, circle.amount).pool)], ["Starts", `${cycleDate(circle.start, circle.frequency)} · ${circle.frequency}`], ["Approvals", `${circle.approvals} of ${circle.members}`]]} /></section></div>
      <div className="circle-form"><section className="dash-card circle-card"><h2>What’s next</h2><ol className="circle-rules"><li>Open the invitation preview.</li><li>Review the rules from a member’s perspective.</li><li>Check your circle’s contribution schedule.</li></ol></section>
        <div className="actions"><Link className="button primary" href={`/dashboard/circles?id=${circle.id}`}>Go to my circle</Link><Link className="button outline" href="/dashboard">Back to dashboard</Link></div>
      </div>
    </div>
  </div>;
}
