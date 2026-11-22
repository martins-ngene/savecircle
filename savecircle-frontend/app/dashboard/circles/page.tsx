import type { Metadata } from "next";
import { Suspense } from "react";
import { Shimmer } from "@/features/loading/shimmer";
import { Workspace } from "@/features/dashboard/workspace";
import { MyCircles } from "@/features/circles/my-circles";
import "./circles.css";

export const metadata: Metadata = { title: "My circles | SaveCircle" };

export default function CirclesPage() {
  return <Workspace current="circles"><Suspense fallback={<Shimmer title="Loading your circles…" cards={2} rows={3} columns={2} />}><MyCircles /></Suspense></Workspace>;
}
