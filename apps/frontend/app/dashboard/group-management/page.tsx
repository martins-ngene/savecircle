import type { Metadata } from "next";
import { Suspense } from "react";
import { Workspace } from "@/features/dashboard/workspace";
import { GroupManagement } from "@/features/group-management/group-management";
import "./group-management.css";

export const metadata: Metadata = { title: "Group Management | SaveCircle" };

export default function GroupManagementPage() {
  return <Workspace current="group-management">
    <Suspense fallback={<p role="status">Loading group management…</p>}><GroupManagement /></Suspense>
  </Workspace>;
}
