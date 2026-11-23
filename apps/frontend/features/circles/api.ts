import { apiRequest } from "@/lib/api";
import type { CircleDraft, Frequency } from "./model";

export type CircleCycle = {
  id: string;
  cycleIndex: number;
  dueDate: string;
  recipientWallet: string;
  status: string;
  targetAmount: string;
};

export type ApiCircle = {
  id: string;
  name: string;
  description: string;
  organizerWallet: string;
  onChainGroupId: number | null;
  contributionAmount: string;
  targetAmount: string;
  totalMembers: number;
  paymentFrequency: string;
  cycleDurationDays: number;
  approvalThreshold: number;
  payoutModel: string;
  status: string;
  rules: string;
  inviteToken: string;
  members: CircleMember[];
  cycles: CircleCycle[];
};

type CircleMember = {
  walletAddress: string;
  displayName: string | null;
  rotationPosition: number;
  status: string;
  rulesAccepted: boolean;
};

export type CircleDetails = ApiCircle & {
  withdrawals: {
    id: string;
    requestId: number;
    amount: string;
    recipientWallet: string;
    status: string;
    approvalCount: number;
    requiredApprovals: number;
    reason: string | null;
  }[];
};

export function getCircleDetails(id: string, signal?: AbortSignal) {
  return apiRequest<CircleDetails>(`groups/${encodeURIComponent(id)}`, { signal });
}

export function acceptCircleRules(id: string, token: string) {
  return apiRequest<CircleMember>(`groups/${encodeURIComponent(id)}/accept-rules`, { token, body: {} });
}

export function linkCircleOnChain(id: string, token: string, txHash: string) {
  return apiRequest<CircleDetails>(`groups/${encodeURIComponent(id)}/link-on-chain`, { token, body: { txHash } });
}

export const frequencies = {
  Weekly: { value: "WEEKLY", days: 7 },
  "Every 2 weeks": { value: "BIWEEKLY", days: 14 },
  Monthly: { value: "MONTHLY", days: 30 },
} satisfies Record<Frequency, { value: string; days: number }>;

export const circleDate = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
export const circleLabel = (value: string) => value.toLowerCase().replaceAll("_", " ");

export function createCircle(draft: CircleDraft, token: string) {
  const frequency = frequencies[draft.frequency];
  return apiRequest<ApiCircle>("groups", {
    token,
    body: {
      name: draft.name.trim(),
      description: draft.description.trim(),
      contributionAmount: draft.amount.trim(),
      totalMembers: draft.members,
      paymentFrequency: frequency.value,
      cycleDurationDays: frequency.days,
      approvalThreshold: draft.approvals,
      payoutModel: "ROTATING",
      rules: draft.rules.trim() || "Members authorize contributions in their own wallets. Payouts follow the assigned rotation.",
    },
  });
}
