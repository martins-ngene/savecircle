import type { Metadata } from "next";
import { Suspense } from "react";
import { Approvals } from "@/features/approvals/approvals";
import { Workspace } from "@/features/dashboard/workspace";
import "./approvals.css";

export const metadata: Metadata = { title: "Approvals | SaveCircle" };

export default function ApprovalsPage() {
  return <Workspace current="approvals">
    <Suspense fallback={<p role="status">Loading approvals…</p>}><Approvals /></Suspense>
  </Workspace>;
}
