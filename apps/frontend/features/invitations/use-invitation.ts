"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { setWalletSession, useWalletSession } from "@/lib/wallet-session";
import { acceptCircleRules } from "../circles/api";
import { getGroupSchedule } from "../schedule/api";
import { readInviteToken, groupRules, payoutPosition, type Invite } from "./model";
import { connectFreighter } from "./wallet";

const formatDate = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });

export function useInvitation(initialToken: string) {
  const session = useWalletSession();
  const [code, setCode] = useState(initialToken);
  const [invite, setInvite] = useState<(Invite & { inviteToken: string })>();
  const [stage, setStage] = useState<"review" | "rules" | "declined" | "done">("review");
  const [name, setName] = useState("");
  const [checked, setChecked] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [membership, setMembership] = useState<{ displayName: string; rotationPosition: number }>();
  const rules = invite ? groupRules(invite) : [];
  const position = invite && session ? payoutPosition(invite, session.walletAddress) : null;
  const ready = checked.length === rules.length && name.trim().length > 0 && position !== null;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function loadInvite(value: string) {
    setCode(value);
    const token = readInviteToken(value);
    const group = await apiRequest<Invite>(`groups/invite/${encodeURIComponent(token)}`);
    const { cycles } = await getGroupSchedule(group.groupId);
    const dates = cycles.map(({ dueDate }) => formatDate.format(new Date(dueDate)));
    setInvite({ ...group, dates, inviteToken: token });
    setStage("review");
    setChecked([]);
  }

  return {
    session, code, setCode, invite, stage, setStage, name, setName, checked, rules, position, ready, error, busy, membership,
    connect: () => run(async () => {
      setWalletSession(await connectFreighter());
      if (code.trim()) await loadInvite(code);
    }),
    open: (value = code) => run(() => loadInvite(value)),
    decline: () => setStage("declined"),
    changeWallet() {
      setWalletSession(null);
      setInvite(undefined);
      setChecked([]);
      setName("");
      setMembership(undefined);
      setStage("review");
      setError("");
    },
    toggleRule: (index: number) => setChecked((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]),
    accept: () => run(async () => {
      if (!ready || position === null || !invite || !session) return;
      const displayName = name.trim();
      const member = await apiRequest<{ displayName: string | null; rotationPosition: number; rulesAccepted: boolean }>("groups/join", {
        token: session.accessToken,
        body: { inviteToken: invite.inviteToken, displayName, rotationPosition: position },
      });
      if (!member.rulesAccepted) {
        await acceptCircleRules(invite.groupId, session.accessToken);
      }
      setMembership({ displayName: member.displayName || displayName, rotationPosition: member.rotationPosition });
      setStage("done");
    }),
  };
}
