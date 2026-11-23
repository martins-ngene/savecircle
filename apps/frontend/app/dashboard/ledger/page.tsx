import type { Metadata } from "next";
import { Suspense } from "react";
import { Workspace } from "@/features/dashboard/workspace";
import { Ledger } from "@/features/ledger/ledger";
import { LedgerLoading } from "@/features/ledger/views";
import "./ledger.css";

export const metadata: Metadata = { title: "Member ledger | SaveCircle" };

export default function LedgerPage() {
  return <Workspace current="ledger"><Suspense fallback={<LedgerLoading />}><Ledger /></Suspense></Workspace>;
}
