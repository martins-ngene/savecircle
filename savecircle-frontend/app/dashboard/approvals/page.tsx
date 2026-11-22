import type { Metadata } from "next";
import { Suspense } from "react";
import { Approvals } from "@/features/approvals/approvals";
import { ApprovalLoading } from "@/features/approvals/components";
import { Workspace } from "@/features/dashboard/workspace";
import "./approvals.css";

export const metadata: Metadata = { title: "Approvals | SaveCircle" };

export default function ApprovalsPage() {
  return <Workspace current="approvals">
    <Suspense fallback={<ApprovalLoading />}><Approvals /></Suspense>
  </Workspace>;
}
