import type { Metadata } from "next";
import { Suspense } from "react";
import { Shimmer } from "@/features/loading/shimmer";
import { Workspace } from "@/features/dashboard/workspace";
import { Schedule } from "@/features/schedule/schedule";
import "./schedule.css";

export const metadata: Metadata = { title: "Contribution schedule | SaveCircle" };

export default function SchedulePage() {
  return <Workspace current="schedule"><Suspense fallback={<Shimmer title="Loading contribution schedule…" cards={3} />}><Schedule /></Suspense></Workspace>;
}
