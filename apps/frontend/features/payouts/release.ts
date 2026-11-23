export type Release = "pending" | "paid";
export type ReleaseStatus = "funding" | "approvals" | "unauthorized" | "ready" | Release;
export type ReleaseEvent = "submit" | "confirm";

export function releaseStatus({ collected, target, approvals, threshold, authorized, release }: {
  collected: number; target: number; approvals: number; threshold: number; authorized: boolean; release?: Release;
}): ReleaseStatus {
  if (release) return release;
  if (target <= 0 || collected < target) return "funding";
  if (approvals < threshold) return "approvals";
  return authorized ? "ready" : "unauthorized";
}

export function nextRelease(current: Release | undefined, event: ReleaseEvent, status: ReleaseStatus) {
  if (event === "submit" && !current && status === "ready") return "pending";
  if (event === "confirm" && current === "pending") return "paid";
  return current;
}
