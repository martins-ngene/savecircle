import { apiRequest } from "@/lib/api";

type LedgerCycle = {
  cycleIndex: number;
  dueDate: string;
  expectedAmount: string;
  paidAmount: string;
  status: string;
  txHash: string | null;
  paidAt: string | null;
};

type MemberLedger = {
  displayName: string;
  payoutPosition: number;
  totalContributed: string;
  totalPayoutsReceived: string;
  outstandingBalance: string;
  nextPaymentDeadline: string | null;
  cycles: LedgerCycle[];
};

type GroupSummary = {
  totalCollected: string;
  totalPayoutsDisbursed: string;
  totalWithdrawn?: string;
  availableBalance: string;
};

export async function readLedger(id: string, token: string, signal: AbortSignal) {
  const path = `ledger/group/${encodeURIComponent(id)}`;
  const [ledger, summary] = await Promise.all([
    apiRequest<MemberLedger>(`${path}/my-ledger`, { token, signal }),
    apiRequest<GroupSummary>(`${path}/summary`, { signal }),
  ]);
  return { ledger, summary };
}
