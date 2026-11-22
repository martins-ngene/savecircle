export type WithdrawalRequest = {
  phase: "registering" | "open";
  reason: string;
  otherApprovals?: boolean;
  vote?: "pending" | "confirmed";
};

export type RequestEvent =
  | { type: "submit"; reason: string }
  | { type: "register" | "refresh" | "sign" | "confirm" };

export const requestId = "WR-003";
export const requestReference = "a73f…0d92";
export const approvalReference = "c41e…0aa9";
export const defaultReason = "Release the fully funded August pool to the scheduled recipient.";
export const existingRequest: WithdrawalRequest = { phase: "open", reason: defaultReason, otherApprovals: true };

export function approvalCount(request?: WithdrawalRequest) {
  if (request?.phase !== "open") return 0;
  return (request.otherApprovals ? 2 : 0) + (request.vote === "confirmed" ? 1 : 0);
}

export function nextRequest(request: WithdrawalRequest | undefined, event: RequestEvent, eligible: boolean): WithdrawalRequest | undefined {
  if (!eligible) return request;
  if (!request) {
    if (event.type !== "submit" || !event.reason.trim()) return undefined;
    return { phase: "registering", reason: event.reason.trim() };
  }
  if (request.phase === "registering") {
    return event.type === "register" ? { ...request, phase: "open" } : request;
  }
  switch (event.type) {
    case "refresh":
      return request.otherApprovals ? request : { ...request, otherApprovals: true };
    case "sign":
      return request.vote ? request : { ...request, vote: "pending" };
    case "confirm":
      return request.vote === "pending" ? { ...request, vote: "confirmed" } : request;
    default:
      return request;
  }
}
