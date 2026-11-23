export type ScheduleProposal = { cycle: number; days: number; reason: string; phase?: "registering" };
export type ExitRequest = { reason: string; reviewed?: boolean };
export type SetupInvitation = { label: string; code: string };

export function stageProposal(current: ScheduleProposal | undefined, draft: ScheduleProposal, futureCycles: number[], grace: number) {
  const reason = draft.reason.trim();
  if (current || !futureCycles.includes(draft.cycle) || !Number.isInteger(draft.days) || draft.days <= grace || draft.days > 14 || !reason || reason.length > 500) return current;
  return { ...draft, reason, phase: "registering" as const };
}

export function registerProposal(current?: ScheduleProposal): ScheduleProposal | undefined {
  if (current?.phase !== "registering") return current;
  return { cycle: current.cycle, days: current.days, reason: current.reason };
}

export function createExitRequest(current: ExitRequest | undefined, draft: string) {
  const reason = draft.trim();
  return current ?? (reason && reason.length <= 500 ? { reason } : undefined);
}
