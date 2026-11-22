import type { Metadata } from "next";
import { Suspense } from "react";
import { Workspace } from "@/features/dashboard/workspace";
import { PayoutLoading } from "@/features/payouts/components";
import { Payouts } from "@/features/payouts/payouts";
import "./payouts.css";

export const metadata: Metadata = { title: "Payouts | SaveCircle" };

export default function PayoutsPage() {
  return <Workspace current="payouts"><Suspense fallback={<PayoutLoading />}><Payouts /></Suspense></Workspace>;
}
