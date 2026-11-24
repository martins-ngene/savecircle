import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ContractStatus, Credentials, Gallery, Walkthrough } from "@/features/proof/interactive";
import { explorer } from "@/features/proof/content";
import "./proof.css";

export const metadata: Metadata = {
  title: "SaveCircle Live Observable Proof",
  description: "Explore SaveCircle’s product states, verification results, and Stellar Testnet deployment.",
};

const metrics = [
  ["Automated test coverage", "57 / 57", "Passing · 18 Soroban scenarios, 25 API tests, and 14 frontend tests"],
  ["Key custody", "Zero private key custody", "Freighter signs the Ed25519 login challenge in the wallet."],
  ["Escrow and accounting", "Non-custodial USDC escrow", "The contract records a payout before transferring funds."],
  ["Ledger reconciliation", "Confirmed on-chain events", "The Soroban RPC indexer reconciles activity into PostgreSQL."],
];

export default function ProofPage() {
  return <div className="proof-page">
    <a className="skip" href="#proof-main">Skip to proof</a>
    <header className="header">
      <div className="wrap header-inner">
        <Link className="brand" href="/"><span><Image src="/savecircle-icon.svg" alt="" width={24} height={24} /></span>SaveCircle</Link>
        <div className="actions">
          <Link className="button outline" href="/dashboard">Launch dashboard</Link>
          <a className="button primary" href={explorer.contract} target="_blank" rel="noopener noreferrer">Contract on Stellar Expert ↗</a>
        </div>
      </div>
    </header>
    <main id="proof-main" className="wrap" tabIndex={-1}>
      <section className="proof-hero">
        <ContractStatus />
        <h1>SaveCircle Live<br className="proof-break" /> Observable Proof</h1>
        <h2>Every rotating cycle, contribution, and payout is <em>verifiable on Stellar</em>.</h2>
        <p>Soroban contracts record what happens on-chain. SaveCircle reconciles confirmed events with a PostgreSQL ledger so members can follow their contributions and payouts from the dashboard.</p>
      </section>
      <section aria-label="Verification metrics">
        <dl className="proof-metrics">{metrics.map(([label, value, description]) => <div key={label} className="proof-card">
          <dt className="eyebrow">{label}</dt><dd><strong>{value}</strong></dd><dd>{description}</dd>
        </div>)}</dl>
      </section>
      <section className="proof-section" aria-labelledby="walkthrough-heading">
        <div className="proof-heading"><h2 id="walkthrough-heading">Product walkthrough</h2><p>Follow the captured product screens and use the chapters to jump to a step.</p></div>
        <Walkthrough />
      </section>
      <section className="proof-section" aria-labelledby="gallery-heading">
        <div className="proof-heading"><h2 id="gallery-heading">State proof gallery</h2><p>Browse captured local product states and public Testnet deployment credentials.</p></div>
        <Gallery />
      </section>
      <section className="proof-section" id="credentials" aria-labelledby="credentials-heading">
        <Credentials />
      </section>
    </main>
    <footer className="wrap proof-footer"><Link href="/">SaveCircle</Link><a href="#proof-main">Back to top ↑</a></footer>
  </div>;
}
