import type { Metadata } from "next";
import { Suspense } from "react";
import { Workspace } from "@/features/dashboard/workspace";
import { Payouts } from "@/features/payouts/payouts";
import "./payouts.css";

export const metadata: Metadata = { title: "Payouts | SaveCircle" };

export default function PayoutsPage() {
  return <Workspace current="payouts"><Suspense fallback={<p role="status">Loading payouts…</p>}><Payouts /></Suspense></Workspace>;
}
