"use client";

import { useEffect, useRef, useState } from "react";
import type { WalletSession } from "@/lib/wallet-session";
import { getBlockchainConfig, invokeSoroban, readSoroban, getTransactionStatus } from "@/lib/stellar";
import { acceptCircleRules, type CircleDetails } from "../circles/api";
import { shortWallet } from "../invitations/model";

type Member = CircleDetails["members"][number];
type ChainMember = {
  address: string;
  status: number;
  rules_accepted: boolean;
  rotation_position: number;
};
export type OnChainMemberships = Record<string, { label: string; member?: ChainMember | null }>;
type Pending = { hash: string; action: "register" | "accept"; member: string; rotationPosition: number };

function readPending(key: string): Pending | undefined {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? "null") as Pending | null;
    if (saved && /^[a-f0-9]{64}$/i.test(saved.hash) && /^[A-Z2-7]{56}$/.test(saved.member)
      && (saved.action === "register" || saved.action === "accept") && Number.isInteger(saved.rotationPosition)) return saved;
  } catch {
    // Session storage may be unavailable in restricted browsing contexts.
  }
}

function writePending(key: string, pending?: Pending) {
  try {
    if (pending) sessionStorage.setItem(key, JSON.stringify(pending));
    else sessionStorage.removeItem(key);
  } catch {
    // Keep the transaction reference in component state while the page is open.
  }
}

function labelFor(record: ChainMember | null, position: number) {
  if (!record) return "Registration needed";
  if (record.rotation_position !== position) return "Payout spot differs";
  if (record.status === 4) return "Exited";
  if (record.status === 3) return "Exit requested";
  if (record.status === 2 && record.rules_accepted) return "Active";
  return "Rules awaiting acceptance";
}

async function readMember(wallet: string, groupId: number, member: string, signal?: AbortSignal) {
  return await readSoroban(wallet, { method: "get_member", groupId, member }, signal) as ChainMember | null;
}

export function MembershipChain({ group, session, onRead, onAccepted }: {
  group: CircleDetails;
  session: WalletSession;
  onRead: (memberships: OnChainMemberships) => void;
  onAccepted: (member: Member) => void;
}) {
  const groupId = group.onChainGroupId!;
  const { walletAddress } = session;
  const isOrganizer = group.organizerWallet === walletAddress;
  const membership = group.members.find((member) => member.walletAddress === walletAddress);
  const [initialRoster] = useState(group.members);
  const [states, setStates] = useState<OnChainMemberships>({});
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const pendingKey = `savecircle:membership-tx:${group.id}:${walletAddress}`;
  const [pending, setPending] = useState(() => {
    const saved = readPending(pendingKey);
    return saved?.action === "accept" && saved.member !== walletAddress ? undefined : saved;
  });
  const current = states[walletAddress]?.member;

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all(initialRoster.map(async ({ walletAddress: member, rotationPosition }) => {
      try {
        const record = await readMember(walletAddress, groupId, member, controller.signal);
        return [member, { label: labelFor(record, rotationPosition), member: record }] as const;
      } catch {
        return [member, { label: "Unavailable" }] as const;
      }
    })).then((entries) => {
      if (controller.signal.aborted) return;
      const next = Object.fromEntries(entries);
      setStates(next);
      onRead(next);
    });
    return () => controller.abort();
  }, [attempt, groupId, initialRoster, onRead, walletAddress]);

  function updatePending(next?: Pending) {
    writePending(pendingKey, next);
    setPending(next);
  }

  async function syncAcceptance() {
    onAccepted(await acceptCircleRules(group.id, session.accessToken));
  }

  async function settle(action: Pending) {
    const record = await readMember(walletAddress, groupId, action.member);
    if (!record || record.rotation_position !== action.rotationPosition
      || (action.action === "accept" && (record.status !== 2 || !record.rules_accepted))) {
      setNotice("The transaction is confirmed. Check again when the updated membership is available.");
      return;
    }
    updatePending();
    setAttempt((previous) => previous + 1);
    if (action.action === "accept" && membership && !membership.rulesAccepted) {
      try { await syncAcceptance(); } catch {
        setError("Testnet confirmed rule acceptance. Use Sync rule acceptance to update the circle record.");
      }
    }
    setNotice(action.action === "register" ? "Testnet membership confirmed." : "Testnet rule acceptance confirmed.");
  }

  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try { await action(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not complete the membership action."); }
    finally { lock.current = false; setBusy(false); }
  }

  function submit(action: Pending["action"], member: Member) {
    return run(async () => {
      if (pending) return;
      const [config, chainGroup, live] = await Promise.all([
        getBlockchainConfig(),
        readSoroban(walletAddress, { method: "get_group", groupId }) as Promise<{ organizer: string; usdc_token: string; total_members: number } | null>,
        readMember(walletAddress, groupId, member.walletAddress),
      ]);
      if (!chainGroup || chainGroup.organizer !== group.organizerWallet || chainGroup.usdc_token !== config.usdcTokenId ||
          chainGroup.total_members !== group.totalMembers) throw new Error("The linked Stellar group does not match this circle.");
      if (action === "register" && live !== null) throw new Error("This wallet already has an on-chain membership. Refresh Testnet membership.");
      if (action === "accept" && (!live || live.status !== 1 || live.rotation_position !== member.rotationPosition)) {
        throw new Error("This wallet needs a matching invited on-chain membership.");
      }
      const details = { action, member: member.walletAddress, rotationPosition: member.rotationPosition };
      const result = await invokeSoroban(walletAddress, action === "register"
        ? { method: "register_member", groupId, member: member.walletAddress, rotationPosition: member.rotationPosition }
        : { method: "accept_rules", groupId }, { onSubmitted: (hash: string) => updatePending({ ...details, hash }) });
      const submitted = { ...details, hash: result.hash };
      updatePending(submitted);
      if (result.status === "SUCCESS") await settle(submitted);
      else setNotice("Check confirmation before sending another membership transaction.");
    });
  }

  function check() {
    return run(async () => {
      if (!pending) return;
      const tx = await getTransactionStatus(pending.hash);
      if (tx.status === "FAILED") {
        updatePending();
        setError("Stellar Testnet rejected the transaction.");
      } else if (tx.success || tx.status === "SUCCESS") await settle(pending);
      else setNotice("This transaction is awaiting confirmation.");
    });
  }

  const eligible = (member: Member) => member.status === "ACTIVE" || member.status === "INVITED";
  const registration = isOrganizer ? group.members.filter((member) => eligible(member) && states[member.walletAddress]?.member === null) : [];
  const canAccept = membership && eligible(membership) && current?.status === 1 && current.rotation_position === membership.rotationPosition;
  const canSync = membership && eligible(membership) && !membership.rulesAccepted && current?.status === 2 && current.rules_accepted
    && current.rotation_position === membership.rotationPosition;

  return <section className="gm-card">
    <h2>Stellar Testnet membership</h2>
    <div><button className="gm-button" type="button" disabled={busy} onClick={() => setAttempt((previous) => previous + 1)}>Refresh Testnet membership</button></div>
    {registration.length > 0 && <ul className="gm-stack">
      {registration.map((member) => <li key={member.walletAddress}>
        <button type="button" className="gm-button" disabled={busy || !!pending} onClick={() => void submit("register", member)}>
          Register {member.walletAddress === walletAddress ? "your wallet" : member.displayName || shortWallet(member.walletAddress)} · Spot {member.rotationPosition}
        </button>
      </li>)}
    </ul>}
    {membership && current === null && !isOrganizer && <p>The organizer needs to register your wallet in payout spot {membership.rotationPosition}.</p>}
    {canAccept && <div className="gm-stack">
      <p className="gm-preserve">{group.rules}</p>
      <div><button type="button" className="gm-button" data-primary disabled={busy || !!pending} onClick={() => void submit("accept", membership)}>Accept rules on Testnet</button></div>
    </div>}
    {canSync && <div><button type="button" className="gm-button" disabled={busy || !!pending} onClick={() => void run(syncAcceptance)}>Sync rule acceptance</button></div>}
    {pending && <div className="gm-stack">
      <p>Transaction <code>{pending.hash}</code></p>
      <div><button type="button" className="gm-button" disabled={busy} onClick={() => void check()}>Check confirmation</button></div>
    </div>}
    <p role="status">{busy ? "Waiting for Stellar Testnet…" : notice}</p>
    {error && <p role="alert">{error}</p>}
  </section>;
}
