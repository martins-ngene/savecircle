export type Invite = {
  groupId: string;
  dates?: string[];
  name: string;
  description: string | null;
  organizerWallet: string;
  contributionAmount: string;
  targetAmount: string;
  totalMembers: number;
  paymentFrequency: string;
  rules: string | null;
  members: { walletAddress: string; displayName: string | null; rotationPosition: number; status: string }[];
};

export function payoutPosition(invite: Invite, wallet: string) {
  const existing = invite.members.find((member) => member.walletAddress === wallet);
  if (existing) return ["ACTIVE", "INVITED"].includes(existing.status) ? existing.rotationPosition : null;
  const used = new Set(invite.members.map((member) => member.rotationPosition));
  for (let position = 1; position <= invite.totalMembers; position++) {
    if (!used.has(position)) return position;
  }
  return null;
}

export function readInviteToken(value: string) {
  const input = value.trim();
  const token = /^https?:\/\//i.test(input) ? new URL(input).searchParams.get("invite") : input;
  if (!token || !/^[\w-]{1,128}$/.test(token)) throw new Error("Enter a valid SaveCircle invitation link or code.");
  return token;
}

export const shortWallet = (address: string) => address.length <= 9 ? address : `${address.slice(0, 4)}…${address.slice(-4)}`;

export function groupRules(invite: Invite) {
  return invite.rules?.split(/\r?\n/).map((rule) => rule.trim()).filter(Boolean) ?? [];
}
