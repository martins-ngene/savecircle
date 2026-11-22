import type { Metadata } from "next";
import { Suspense } from "react";
import { Workspace } from "@/features/dashboard/workspace";
import { GroupLoading } from "@/features/group-management/components";
import { GroupManagement, GroupProfile } from "@/features/group-management/group-management";
import "./group-management.css";

export const metadata: Metadata = { title: "Group Management | SaveCircle" };

export default function GroupManagementPage() {
  return <Workspace current="group-management" profile={<Suspense><GroupProfile /></Suspense>}>
    <Suspense fallback={<GroupLoading />}><GroupManagement /></Suspense>
  </Workspace>;
}
