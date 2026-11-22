"use client";

import { useState } from "react";
import { circleInvitation } from "../circles/preview-invitation";
import { readSavedCircle } from "../circles/storage";
import { getPreviewInvite, readInviteToken, groupRules, payoutPosition, previewToken, previewWallet, type Invite } from "./model";

export function useInvitation(initialToken: string) {
  const [session, setSession] = useState<{ walletAddress: string }>();
  const [code, setCode] = useState(initialToken);
  const [invite, setInvite] = useState<Invite>();
  const [stage, setStage] = useState<"review" | "rules" | "declined" | "done">("review");
  const [name, setName] = useState("");
  const [checked, setChecked] = useState<number[]>([]);
  const [error, setError] = useState("");
  const rules = invite ? groupRules(invite) : [];
  const position = invite && session ? payoutPosition(invite, session.walletAddress) : null;
  const ready = checked.length === rules.length && name.trim().length > 0 && position !== null;
  const membership = stage === "done" ? { displayName: name.trim(), rotationPosition: position } : undefined;

  function open(value = code) {
    setError("");
    setCode(value);
    try {
      const local = readSavedCircle(readInviteToken(value));
      setInvite(local ? circleInvitation(local) : getPreviewInvite(value));
      setStage("review");
      setChecked([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enter the sample invitation code.");
    }
  }

  return {
    session, code, setCode, invite, stage, setStage, name, setName, checked, rules, position, ready, error, membership,
    connect() {
      setSession({ walletAddress: previewWallet });
      if (code.trim()) open();
    },
    open,
    openSample: () => open(previewToken),
    decline: () => setStage("declined"),
    changeWallet() {
      setSession(undefined);
      setInvite(undefined);
      setChecked([]);
      setStage("review");
      setError("");
    },
    toggleRule: (index: number) => setChecked((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]),
    accept: () => { if (ready) setStage("done"); },
  };
}
