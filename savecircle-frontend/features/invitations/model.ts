export type Invite = {
  groupId: string;
  local?: boolean;
  dates?: string[];
  fixed?: { amount: string; recipient: string };
  firstPayment?: string;
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
  return [
    `I’ll authorize each ${invite.contributionAmount} USDC contribution in my wallet by its due date.`,
    "A missed payment is marked overdue.",
    invite.fixed ? "The fixed payout requires a funded pool and the agreed approvals." : "Payouts follow the agreed order once the cycle is fully funded and approved.",
    "Rule changes need the group’s approval.",
    "Past contributions are not a withdrawable balance.",
    ...(invite.rules?.split(/\r?\n/).map((rule) => rule.trim()).filter(Boolean) ?? []),
  ];
}

export const previewToken = "surulere-savers";
export const previewWallet = "GBCJ…7K4P";
export const previewDates = ["Jun 2025", "Jul 2025", "Aug 2025", "Sep 2025", "Oct 2025"];
export const previewInvite: Invite = {
  groupId: previewToken, name: "Surulere Savers", description: null, organizerWallet: "kelechi",
  contributionAmount: "100", targetAmount: "500.00", totalMembers: 5, paymentFrequency: "Monthly", rules: null,
  members: [
    { walletAddress: "kelechi", displayName: "Kelechi M.", rotationPosition: 1, status: "ACTIVE" },
    { walletAddress: "timi", displayName: "Timi I.", rotationPosition: 2, status: "ACTIVE" },
    { walletAddress: "nora", displayName: "Nora O.", rotationPosition: 3, status: "ACTIVE" },
  ],
};

export function getPreviewInvite(input: string) {
  if (readInviteToken(input) !== previewToken) throw new Error("This preview accepts the sample Surulere Savers invitation.");
  return previewInvite;
}
