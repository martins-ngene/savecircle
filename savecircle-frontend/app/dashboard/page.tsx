import type { Metadata } from "next";
import { DashboardOverview } from "@/features/dashboard/overview";

export const metadata: Metadata = { title: "Dashboard | SaveCircle" };

export default function DashboardPage() {
  return <DashboardOverview />;
}
