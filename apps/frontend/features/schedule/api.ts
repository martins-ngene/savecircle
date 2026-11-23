import { apiRequest } from "@/lib/api";

export type ScheduleCycle = {
  cycleIndex: number;
  dueDate: string;
  targetAmount: string;
  collectedAmount: string;
  status: string;
  recipientWallet: string;
  recipientName: string;
  payoutTxHash: string | null;
  paidAt: string | null;
};

type Obligation = {
  groupId: string;
  cycleIndex: number;
  dueDate: string;
  amount: string;
  status: "PENDING" | "OVERDUE";
};

export function getGroupSchedule(id: string, signal?: AbortSignal) {
  return apiRequest<{ cycles: ScheduleCycle[] }>(`schedules/group/${encodeURIComponent(id)}`, { signal });
}

export async function readSchedule(id: string, token: string, signal: AbortSignal) {
  const [{ cycles }, obligations] = await Promise.all([
    getGroupSchedule(id, signal),
    apiRequest<Obligation[]>("schedules/my-obligations", { token, signal }),
  ]);
  return { cycles, obligations: obligations.filter((item) => item.groupId === id) };
}
