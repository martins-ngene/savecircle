import type { Metadata } from "next";
import { Suspense } from "react";
import { Shimmer } from "@/features/loading/shimmer";
import { InvitationFlow } from "@/features/invitations/invitation-flow";
import "./invitation.css";

export const metadata: Metadata = {
  title: "Connect wallet | SaveCircle",
  robots: { index: false, follow: false },
  referrer: "same-origin",
};

export default function ConnectPage() {
  return <Suspense fallback={<main className="invite-loading"><Shimmer title="Loading wallet connection…" rows={3} columns={1} /></main>}><InvitationFlow /></Suspense>;
}
