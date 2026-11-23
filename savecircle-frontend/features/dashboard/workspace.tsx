import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardDialog, WalletAccount } from "./controls";
import { HeaderMenu } from "../landing/header-menu";
import { Icon } from "../landing/icon";

const links = [
  ["overview", "Overview", "grid", "/dashboard"],
  ["circles", "My circles", "users", "/dashboard/circles"],
  ["schedule", "Schedule", "calendar", "/dashboard/schedule"],
  ["ledger", "My ledger", "document", "/dashboard/ledger"],
  ["payouts", "Payouts", "coin", "/dashboard/payouts"],
  ["approvals", "Approvals", "shield", "/dashboard/approvals"],
  ["group-management", "Group management", "users", "/dashboard/group-management"],
] as const;

type WorkspaceSection = typeof links[number][0];

function Sidebar({ current }: { current: WorkspaceSection }) {
  return (
    <aside className="dash-sidebar">
      <Link href="/dashboard" className="dash-brand"><span className="dash-avatar"><Icon name="users" /></span>SaveCircle</Link>
      <HeaderMenu>
        <nav aria-label="Workspace" className="dash-nav">
          <span className="eyebrow">Workspace</span>
          {links.map(([id, label, icon, href]) => (
            <Link className="dash-nav-item" key={id} href={href} aria-current={id === current ? "page" : undefined}>
              <Icon name={icon} />{label}
            </Link>
          ))}
        </nav>
        <div className="dash-sidebar-bottom">
          <div className="dash-testnet-info"><strong><Icon name="shield" /> Stellar Testnet</strong></div>
          <DashboardDialog className="dash-nav-item" title="Settings" label={<><Icon name="settings" />Settings</>}><p>Settings will be available once the account integration is connected.</p></DashboardDialog>
          <Link className="dash-nav-item" href="/"><Icon name="external" />Back to website</Link>
        </div>
      </HeaderMenu>
    </aside>
  );
}

export function Workspace({ current, children, profile }: { current: WorkspaceSection; children: ReactNode; profile?: ReactNode }) {
  return (
    <div className="dashboard" data-workspace={current}>
      <a className="skip" href="#overview">Skip to dashboard</a>
      <Sidebar current={current} />
      <div className="dash-workspace" role="region" aria-label="Dashboard content" tabIndex={0}>
        <header className="dash-topbar">
          <strong>{links.find(([id]) => id === current)?.[1]}</strong>
          <div className="dash-account">
            <span className="dash-tag dash-network"><i />Stellar Testnet</span>
            {profile ?? <WalletAccount />}
          </div>
        </header>
        <main className="dash-main" id="overview" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
