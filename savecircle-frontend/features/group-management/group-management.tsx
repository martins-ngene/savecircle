"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/api";
import { useWalletSession, type WalletSession } from "@/lib/wallet-session";
import { circleDate, circleLabel, getCircleDetails, acceptCircleRules, type CircleDetails } from "../circles/api";
import { CircleReader } from "../circles/circle-reader";
import { shortWallet } from "../invitations/model";
import { getGroupSchedule, type ScheduleCycle } from "../schedule/api";
import { GroupFacts, GroupStats, GroupTable, tabs } from "./components";
import { MembershipChain, type OnChainMemberships } from "./membership-chain";

const groupPath = "/dashboard/group-management";
type Member = CircleDetails["members"][number];

async function loadGroup(id: string, _token: string, signal: AbortSignal) {
  const [details, schedule] = await Promise.all([
    getCircleDetails(id, signal),
    getGroupSchedule(id, signal),
  ]);
  return { details, cycles: schedule.cycles };
}

export function GroupManagement() {
  const session = useWalletSession();
  return <div className="gm-workspace">
    <header className="gm-heading"><h1>Group management</h1></header>
    <CircleReader path={groupPath} read={loadGroup}>{(_circle, group) => session
      ? <ManagedGroup initialGroup={group.details} cycles={group.cycles} session={session} />
      : null}</CircleReader>
  </div>;
}

function ManagedGroup({ initialGroup, cycles, session }: { initialGroup: CircleDetails; cycles: ScheduleCycle[]; session: WalletSession }) {
  const [group, setGroup] = useState(initialGroup);
  const [memberships, setMemberships] = useState<OnChainMemberships>({});
  const params = useSearchParams();
  const tab = tabs.find(([key]) => key === params.get("tab"))?.[0] ?? "members";
  const isOrganizer = group.organizerWallet === session.walletAddress;
  const current = group.members.find((member) => member.walletAddress === session.walletAddress);
  const circleHref = `/dashboard/circles?id=${encodeURIComponent(group.id)}`;
  const roster = group.members.map((member) => member.walletAddress).join(",");
  const groupId = group.id;

  const refreshGroup = useCallback(async () => {
    setGroup(await getCircleDetails(groupId));
  }, [groupId]);

  const updateMember = useCallback((member: Member) => {
    setGroup((previous) => ({ ...previous, members: previous.members.map((item) => item.walletAddress === member.walletAddress ? member : item) }));
  }, []);

  return <>
    <div className="gm-actor">
      <strong>{current?.displayName || shortWallet(session.walletAddress)} · {isOrganizer ? "Organizer" : "Member"}</strong>
      <Link href={circleHref}>{group.name}</Link>
    </div>
    <nav className="gm-tabs" aria-label="Group management sections">
      {tabs.map(([key, label]) => <Link className="gm-button" key={key} aria-current={tab === key ? "page" : undefined}
        href={`${groupPath}?${new URLSearchParams({ circle: group.id, tab: key })}`}>{label}</Link>)}
    </nav>
    {tab === "members" && <>
      <GroupStats items={[
        ["Spots reserved", `${group.members.length} of ${group.totalMembers}`],
        ["Active members", group.members.filter((member) => member.status === "ACTIVE").length],
        ["Rules accepted", group.members.filter((member) => member.rulesAccepted).length],
        ["On-chain group", group.onChainGroupId ?? "Unlinked"],
      ]} />
      <section className="gm-card">
        <h2>Members</h2>
        <GroupTable label="Circle members" layout="members"
          headers={["Member", "Wallet", "Payout spot", "Membership", "Group rules", "Stellar Testnet"]}
          rows={[...group.members].sort((a, b) => a.rotationPosition - b.rotationPosition).map((member) => ({
            key: member.walletAddress,
            cells: [
              <strong key="name">{member.displayName || "Member"}{member.walletAddress === session.walletAddress && " (you)"}</strong>,
              <code key="wallet" title={member.walletAddress}>{shortWallet(member.walletAddress)}</code>,
              member.rotationPosition,
              circleLabel(member.status),
              member.rulesAccepted ? "Accepted" : "Awaiting acceptance",
              group.onChainGroupId == null ? "Unlinked" : memberships[member.walletAddress]?.label ?? "Checking",
            ],
          }))} />
      </section>
      {group.onChainGroupId == null
        ? <section className="gm-card"><h2>Membership actions</h2><p>Link the circle to Stellar Testnet to register its members on-chain.</p>
          {current?.status === "INVITED" && !current.rulesAccepted && <AcceptGroupRules group={group} session={session} onAccepted={updateMember} />}
        </section>
        : <MembershipChain key={roster} group={group} session={session} onRead={setMemberships} onAccepted={updateMember} />}
    </>}
    {tab === "invitations" && <>
      {isOrganizer && <ShareInvitation token={group.inviteToken} />}
      {isOrganizer && <ReserveMember group={group} session={session} onReserved={refreshGroup} />}
      <section className="gm-card"><h2>Invited members</h2>
        {group.members.some((member) => member.status === "INVITED") ? <ul>
          {group.members.filter((member) => member.status === "INVITED").map((member) => <li key={member.walletAddress}>{member.displayName || shortWallet(member.walletAddress)} · Spot {member.rotationPosition}</li>)}
        </ul> : <p>No members are awaiting acceptance.</p>}
      </section>
    </>}
    {tab === "rules" && <>
      <section className="gm-card"><h2>Group rules</h2><p className="gm-preserve">{group.rules}</p><GroupFacts rows={[
        ["Contribution", `${group.contributionAmount} USDC`],
        ["Frequency", circleLabel(group.paymentFrequency)],
        ["Payout model", circleLabel(group.payoutModel)],
        ["Withdrawal approvals", `${group.approvalThreshold} of ${group.totalMembers}`],
      ]} /></section>
      <Link className="gm-button" href={`/dashboard/schedule?circle=${encodeURIComponent(group.id)}`}>View contribution schedule</Link>
    </>}
    {tab === "exits" && <section className="gm-card"><h2>Membership exits</h2>
      {group.members.some((member) => member.status === "EXIT_REQUESTED" || member.status === "EXITED")
        ? <ul>{group.members.filter((member) => member.status === "EXIT_REQUESTED" || member.status === "EXITED").map((member) => (
          <li key={member.walletAddress}>{member.displayName || shortWallet(member.walletAddress)} · {circleLabel(member.status)}</li>
        ))}</ul>
        : <p>No exits are recorded for this circle.</p>}
    </section>}
    {tab === "activity" && <GroupActivity cycles={cycles} />}
  </>;
}

function GroupActivity({ cycles }: { cycles: ScheduleCycle[] }) {
  const recorded = cycles.filter((cycle) => cycle.status === "PAID" || Number(cycle.collectedAmount) > 0);
  return <section className="gm-card"><h2>Cycle activity</h2>
    {recorded.length ? <GroupTable label="Cycle activity" headers={["Cycle", "Due date", "Collected", "Status"]}
      rows={recorded.map((cycle) => ({
        key: String(cycle.cycleIndex),
        cells: [`Cycle ${cycle.cycleIndex}`, circleDate(cycle.dueDate), `${cycle.collectedAmount} USDC`, circleLabel(cycle.status)],
      }))} /> : <p>No contributions or payouts have been recorded for this circle yet.</p>}
  </section>;
}

function ShareInvitation({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const href = `/connect?invite=${encodeURIComponent(token)}`;
  return <section className="gm-card"><h2>Circle invitation</h2>
    <div className="gm-tabs">
      <Link className="gm-button" href={href}>Open invitation</Link>
      <button className="gm-button" type="button" onClick={async () => {
        try {
          await navigator.clipboard.writeText(new URL(href, window.location.origin).href);
          setMessage("Invitation link copied.");
        } catch {
          setMessage("Open the invitation to copy the link from your browser.");
        }
      }}>Copy invitation link</button>
    </div>
    <p role="status">{message}</p>
  </section>;
}

function ReserveMember({ group, session, onReserved }: { group: CircleDetails; session: WalletSession; onReserved: () => Promise<void> }) {
  const [wallet, setWallet] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [position, setPosition] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const taken = new Set(group.members.map((member) => member.rotationPosition));
  const spots = Array.from({ length: group.totalMembers }, (_, index) => index + 1).filter((spot) => !taken.has(spot));
  const chosen = spots.includes(Number(position)) ? Number(position) : spots[0];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chosen || lock.current) return;
    const address = wallet.trim().toUpperCase();
    setError("");
    setNotice("");
    if (group.members.some((member) => member.walletAddress === address)) {
      setError("That wallet already has a spot in this circle.");
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      await apiRequest(`groups/${encodeURIComponent(group.id)}/members`, { token: session.accessToken, body: {
        walletAddress: address, rotationPosition: chosen, ...(displayName.trim() && { displayName: displayName.trim() }),
      } });
      setWallet("");
      setDisplayName("");
      setPosition("");
      setNotice(`Reserved spot ${chosen}. Share the circle invitation with this member.`);
      try { await onReserved(); } catch { setError("Refresh the group to see the updated membership list."); }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reserve the membership spot.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return <section className="gm-card">
    <h2>Reserve a member’s spot</h2>
    {spots.length ? <form className="gm-stack" onSubmit={(event) => void submit(event)}>
      <label className="gm-field">Stellar wallet address<input value={wallet} onChange={(event) => setWallet(event.target.value)} maxLength={56} pattern="[Gg][A-Za-z2-7]{55}" required disabled={busy} /></label>
      <label className="gm-field">Display name <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} disabled={busy} /></label>
      <label className="gm-field">Payout spot<select value={chosen} onChange={(event) => setPosition(event.target.value)} disabled={busy}>
        {spots.map((spot) => <option value={spot} key={spot}>{spot}</option>)}
      </select></label>
      <div><button className="gm-button" data-primary disabled={busy}>{busy ? "Reserving…" : "Reserve spot"}</button></div>
    </form> : <p>Every payout spot is reserved.</p>}
    <p role="status">{notice}</p>
    {error && <p role="alert">{error}</p>}
  </section>;
}

function AcceptGroupRules({ group, session, onAccepted }: { group: CircleDetails; session: WalletSession; onAccepted: (member: Member) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function accept() {
    setBusy(true);
    setError("");
    try {
      onAccepted(await acceptCircleRules(group.id, session.accessToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record rule acceptance.");
    } finally {
      setBusy(false);
    }
  }
  return <div className="gm-stack"><p className="gm-preserve">{group.rules}</p>
    <div><button type="button" className="gm-button" data-primary disabled={busy} onClick={() => void accept()}>{busy ? "Accepting…" : "Accept group rules"}</button></div>
    {error && <p role="alert">{error}</p>}
  </div>;
}
