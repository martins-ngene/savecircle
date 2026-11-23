"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon } from "../landing/icon";
import { shortWallet } from "./model";
import { useInvitation } from "./use-invitation";

export function InvitationFlow() {
  const params = useSearchParams();
  return <InvitationSteps key={params.get("invite")} initialToken={params.get("invite") ?? ""} returnTo={params.get("next") === "create-circle" ? "/dashboard/circles/create" : "/dashboard"} />;
}

function InvitationSteps({ initialToken, returnTo }: { initialToken: string; returnTo: string }) {
  const vm = useInvitation(initialToken);
  const heading = useRef<HTMLHeadingElement>(null);
  const phase = !vm.session ? "connect" : !vm.invite ? "code" : vm.stage;

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [phase]);

  const schedule = vm.invite?.dates ?? [];
  const firstPayment = schedule[0] ?? "To be scheduled";
  const brand = <Link className="invite-brand" href="/"><span><Icon name="users" /></span>SaveCircle</Link>;
  const network = <span className="invite-network"><i />Stellar Testnet</span>;
  const change = <button className="invite-text-button" type="button" disabled={vm.busy} onClick={vm.changeWallet}>Change wallet</button>;

  if (vm.invite && vm.session && phase === "review") {
    const invite = vm.invite;
    const organizer = invite.members.find((member) => member.walletAddress === invite.organizerWallet)?.displayName;
    return (
      <main className="invite-review">
        <header>{brand}{network}</header>
        <div className="invite-review-columns">
          <div>
            <span className="eyebrow invite-kicker">You’re invited</span>
            <h1 ref={heading} tabIndex={-1}>{organizer ? `${organizer} invited you` : "You’ve been invited"}<em>to save together.</em></h1>
            <section className="invite-circle">
              <div><div className="invite-circle-title"><span className="invite-mark">{invite.name.slice(0, 2).toUpperCase()}</span><div><h2>{invite.name}</h2><p>{invite.members.length} of {invite.totalMembers} positions reserved</p></div></div>
              {invite.description && <p>{invite.description}</p>}
              <p className="invite-pool">Pool per cycle <strong>{invite.targetAmount} <small>USDC</small></strong></p></div>
              <dl className="invite-metrics">
                <div><dt>Contribution</dt><dd>{invite.contributionAmount} USDC</dd></div>
                <div><dt>Frequency</dt><dd>{invite.paymentFrequency.toLowerCase().replaceAll("_", " ")}</dd></div>
                <div><dt>Cycles</dt><dd>{schedule.length}</dd></div>
                <div><dt>Available spots</dt><dd>{Math.max(0, invite.totalMembers - invite.members.length)}</dd></div>
              </dl>
            </section>
            <section className="panel invite-commit"><h2>What you’ll commit to</h2>
              <div>
                <article><span className="invite-mark"><Icon name="calendar" /></span><h3>Contribute {invite.contributionAmount} USDC per cycle</h3><p>You authorize each payment in your wallet.</p></article>
                <article><span className="invite-mark"><Icon name="clock" /></span><h3>{schedule.length} rotating cycles</h3><p>One payout per cycle, in the order shown.</p></article>
                <article><span className="invite-mark"><Icon name="coin" /></span><h3>Receive {invite.targetAmount} USDC in your cycle</h3><p>Rotating payouts follow full funding.</p></article>
              </div>
            </section>
          </div>
          <section className="panel invite-payouts"><h2>Payout order</h2>
            <ol>{Array.from({ length: invite.totalMembers }, (_, index) => {
              const position = index + 1;
              const member = invite.members.find((item) => item.rotationPosition === position);
              return <li key={position} data-current={position === vm.position}><span>{position}</span><strong>{position === vm.position ? `You (spot ${position})` : member ? member.displayName || shortWallet(member.walletAddress) : "Open spot"}</strong><small>{schedule[index]}</small></li>;
            })}</ol>
            <button className="button primary" disabled={vm.position === null} onClick={() => vm.setStage("rules")}>Continue to join</button>
            {vm.position === null && <p role="status">A payout spot is unavailable for this wallet.</p>}
            <button type="button" className="invite-text-button" onClick={vm.decline}>Decline invitation</button>
            {change}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="invite-split" data-phase={phase}>
      <aside className="invite-aside">
        {brand}
        {phase === "rules" ? <ol className="invite-steps"><li><Icon name="check" /> Wallet connected</li><li aria-current="step">2 &nbsp; Profile and rules</li><li>3 &nbsp; Done</li></ol> :
          <div className="invite-aside-copy"><span className="eyebrow">Built on Stellar · Powered by Soroban</span><p>Save together<em>Grow with trust</em></p><small>A transparent home for ajo, esusu and community savings in USDC.</small></div>}
        {phase === "rules" && vm.invite ? <div className="invite-aside-card"><span className="eyebrow">You’re joining</span><strong>{vm.invite.name}</strong><small>{vm.invite.contributionAmount} USDC per cycle · Spot {vm.position} of {vm.invite.totalMembers}</small></div> :
          <ul className="invite-aside-points"><li><Icon name="check" /> On-chain records everyone can verify</li><li><Icon name="check" /> Rule-based payouts</li><li><Icon name="check" /> Testnet USDC only</li></ul>}
      </aside>
      <div className="invite-pane">
        <div className="invite-pane-top">{network}</div>
        <div className="invite-content">
          {phase === "connect" && <>
            <span className="eyebrow invite-kicker">Connect wallet</span>
            <h1 ref={heading} tabIndex={-1}>Connect to <em>start saving.</em></h1>
            <p>Connect your Stellar wallet and approve a sign-in message in Freighter.</p>
            <div className="invite-wallet-list">
              <button className="invite-wallet-option" disabled={vm.busy} onClick={vm.connect}><span className="invite-mark">F</span><span><strong>Freighter</strong><small>{vm.busy ? "Waiting for wallet or API…" : "Connect and sign in"}</small></span><span aria-hidden="true">›</span></button>
            </div>
            <Link className="invite-help" href="/">Back to SaveCircle</Link>
          </>}
          {phase === "code" && <>
            <span className="eyebrow invite-kicker">Wallet connected</span>
            <h1 ref={heading} tabIndex={-1}>Open your <em>invitation.</em></h1>
            <p>Paste your invitation link or code.</p>
            <form className="invite-form" onSubmit={(event) => { event.preventDefault(); void vm.open(); }}>
              <label>Invitation link or code<input value={vm.code} onChange={(event) => vm.setCode(event.target.value)} disabled={vm.busy} required autoComplete="off" /></label>
              <div className="actions"><button className="button primary" disabled={vm.busy}>{vm.busy ? "Opening…" : "Open invitation"}</button><Link href={returnTo} className="invite-text-button">{returnTo === "/dashboard" ? "Open dashboard" : "Continue to create circle"}</Link>{change}</div>
            </form>
          </>}
          {phase === "rules" && vm.session && <>
            <h1 ref={heading} tabIndex={-1}>Confirm your details<em>Accept the rules.</em></h1>
            <form className="invite-form" onSubmit={(event) => { event.preventDefault(); void vm.accept(); }}>
              <div className="invite-profile">
                <div className="panel invite-wallet-chip"><Icon name="check" /><span><small>Wallet connected</small><strong>{shortWallet(vm.session.walletAddress)}</strong></span>{change}</div>
                <label>Display name<input maxLength={60} required value={vm.name} onChange={(event) => vm.setName(event.target.value)} autoComplete="nickname" /></label>
              </div>
              <fieldset className="panel invite-rules" aria-labelledby="group-rules-heading">
                <div className="invite-rule-heading"><h2 id="group-rules-heading">Group rules</h2><span role="status">{vm.checked.length} of {vm.rules.length} accepted</span></div>
                {vm.rules.map((rule, index) => <label key={index}><input type="checkbox" checked={vm.checked.includes(index)} onChange={() => vm.toggleRule(index)} />{rule}</label>)}
              </fieldset>
              <div className="actions">
                <button className="button primary" disabled={!vm.ready || vm.busy}>{vm.busy ? "Joining…" : "Accept and join"}</button>
                <button type="button" className="invite-text-button" disabled={vm.busy} onClick={() => vm.setStage("review")}>Back to invitation</button>
              </div>
            </form>
          </>}
          {phase === "declined" && <>
            <h1 ref={heading} tabIndex={-1}>Invitation declined.</h1>
            <p>You haven’t joined {vm.invite?.name}. You can review the invitation again if you change your mind.</p>
            <div className="actions"><Link href="/" className="button primary">Back to SaveCircle</Link><button type="button" className="invite-text-button" onClick={() => vm.setStage("review")}>Review invitation again</button></div>
          </>}
          {phase === "done" && vm.membership && vm.invite && vm.session && <>
            <div className="invite-success"><span className="invite-mark"><Icon name="check" /></span><div><span className="eyebrow">Welcome to {vm.invite.name}</span><h1 ref={heading} tabIndex={-1}>You’re in, {vm.membership.displayName}.</h1><p>Your membership is confirmed.</p></div></div>
            <dl className="panel invite-receipt">
              <div><dt>Circle</dt><dd>{vm.invite.name}</dd></div>
              <div><dt>Your payout spot</dt><dd>{vm.membership.rotationPosition} of {vm.invite.totalMembers} · {schedule[(vm.membership.rotationPosition ?? 1) - 1]}</dd></div>
              <div><dt>First payment</dt><dd>{vm.invite.contributionAmount} USDC · {firstPayment}</dd></div>
              <div><dt>Wallet</dt><dd>{shortWallet(vm.session.walletAddress)}</dd></div>
            </dl>
            <section className="panel invite-receipt"><h2>What’s next</h2><p>Check your contribution schedule and set a reminder for your first payment.</p>
              <details><summary className="invite-text-button">View schedule</summary><ol className="invite-schedule">{schedule.map((date) => <li key={date}>{date} · {vm.invite?.contributionAmount} USDC</li>)}</ol></details>
            </section>
            <div className="actions"><Link href={`/dashboard/circles?id=${encodeURIComponent(vm.invite.groupId)}`} className="button primary">View circle</Link><Link href="/dashboard" className="button outline">Open dashboard</Link></div>
          </>}
          {vm.error && <p className="invite-error" role="alert">{vm.error}</p>}
        </div>
      </div>
    </main>
  );
}
