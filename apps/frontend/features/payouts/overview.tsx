import { member } from "../dashboard/model";
import { usdc } from "../landing/plan";
import { scheduleHref } from "../schedule/components";
import { dateLabel, fullDate, monthName, monthYear } from "../schedule/model";
import { cycleRecipient } from "../schedule/pool";
import {
  compactUSDC,
  PayoutFacts,
  PayoutLink,
  payoutTimestamp,
  PayoutTransaction,
} from "./components";
import { payoutHref, type PayoutView } from "./model";

export function PayoutOverview({
  vm,
  refreshApprovals,
}: {
  vm: PayoutView;
  refreshApprovals: () => void;
}) {
  const { cycle, circle, plan, pool, status, approvals, authorized } = vm;
  const release = payoutHref(circle.id, "release");
  const approvalGap = circle.approvals - approvals;
  const approvalLabel = `${approvalGap} more approval${approvalGap === 1 ? "" : "s"} needed`;
  const labels = {
    funding: "Blocked · Funding incomplete",
    approvals: "Waiting for approvals",
    ready: "Ready to release",
    unauthorized: "Authorized wallet required",
    pending: "Awaiting confirmation",
    paid: "Cycle paid",
  };
  if (vm.first)
    return (
      <section className="payout-card payout-stack payout-intro">
        <span className="payout-eyebrow">Your circle is ready</span>
        <h2>Every turn starts with a full pool.</h2>
        <p>
          The first cycle starts {fullDate(cycle.due)}. Each of the{" "}
          {circle.members} members contributes {usdc(plan.amount)} to fund{" "}
          {pool.recipient}’s {usdc(vm.amount)} payout.
        </p>
        <p>
          Release requires an eligible recipient and {circle.approvals} of{" "}
          {circle.members} member approvals.
        </p>
        <PayoutLink href="#payout-order" tone="lime">
          View the agreed order
        </PayoutLink>
      </section>
    );

  return (
    <>
      <div className="payout-columns">
        <section className="payout-card payout-dark payout-stack payout-feature">
          <span className="payout-eyebrow">
            Cycle {cycle.number} · {monthYear(cycle.due)}
          </span>
          <h2>{pool.recipient} is next to receive.</h2>
          <strong className="payout-amount">{usdc(vm.amount)}</strong>
          <p>Scheduled payout · Recipient order locked by circle rules</p>
          <progress value={pool.percent} max={100} aria-label="Cycle funding" />
          <strong className="payout-highlight">
            {compactUSDC(pool.collected)} / {compactUSDC(pool.target)} USDC
            collected · {pool.paidMembers === circle.members ? "All " : ""}
            {pool.paidMembers}{" "}
            {pool.paidMembers === 1 ? "member paid" : "members paid"}
          </strong>
          <p>
            {status === "funding"
              ? cycle.status === "Pending"
                ? "Your contribution is awaiting confirmation. Release requires a fully funded pool."
                : cycle.status === "Overdue"
                  ? `Ada’s ${monthName(cycle.due)} contribution is outstanding. Release requires confirmed funding and approvals.`
                  : "The payout stays locked until the remaining contributions are confirmed."
              : status === "approvals"
                ? `The pool is fully funded. ${approvalLabel} before release.`
                : status === "pending"
                  ? "A release is awaiting confirmation. Check its status here."
                  : status === "ready"
                    ? `Funding and ${approvals} member approvals are confirmed in the preview. Review the approved payout before authorizing release.`
                    : "An authorized wallet must review the release."}
          </p>
          {status === "funding" ? (
            <PayoutLink href={scheduleHref(circle.id)} tone="lime">
              View contribution schedule
            </PayoutLink>
          ) : status === "approvals" && circle.id === "surulere" ? (
            <PayoutLink href="/dashboard/approvals" tone="lime">View approvals</PayoutLink>
          ) : status === "approvals" && authorized ? (
            <button
              className="payout-button"
              data-tone="lime"
              onClick={refreshApprovals}
            >
              Refresh approvals
            </button>
          ) : status === "ready" || status === "pending" ? (
            <PayoutLink href={release} tone="lime">
              {status === "ready" ? "Review payout →" : "Check payout status →"}
            </PayoutLink>
          ) : null}
        </section>
        <section className="payout-card payout-stack payout-eligibility">
          <h2>Payout eligibility</h2>
          <span className="payout-eyebrow payout-status" data-status={status}>
            {labels[status]}
          </span>
          <PayoutFacts
            rows={[
              [
                "Cycle fully funded",
                <span
                  key="funding"
                  className={status === "funding" ? "payout-red" : undefined}
                >
                  {compactUSDC(pool.collected)} / {compactUSDC(pool.target)}{" "}
                  USDC
                </span>,
              ],
              ["Scheduled recipient", `${pool.recipient} · Active`],
              [
                "Member approvals",
                <span
                  key="approvals"
                  className={
                    approvals < circle.approvals ? "payout-brown" : undefined
                  }
                >
                  {approvals} / {circle.approvals} required
                </span>,
              ],
              [
                "Prior release",
                status === "pending"
                  ? "Awaiting confirmation"
                  : "Verified · Unreleased",
              ],
              [
                "Your execution permission",
                authorized ? "Authorized wallet" : "Preview access only",
              ],
            ]}
          />
          {status === "ready" || status === "pending" ? (
            <PayoutLink href={release} tone="lime">
              {status === "ready" ? "Review payout →" : "Check payout status →"}
            </PayoutLink>
          ) : (
            <button className="payout-button" disabled>
              {status === "approvals" ? approvalLabel : "Release unavailable"}
            </button>
          )}
          <p>Funding, approvals and authorization are required for release.</p>
        </section>
      </div>
      <div className="payout-members">
        <section className="payout-card payout-stack">
          <h2>Member contributions</h2>
          <p>
            Cycle {cycle.number} · Expected: {compactUSDC(plan.amount)} USDC per
            member
          </p>
          <ul>
            {pool.people.map((person) => {
              const you = person === member.name;
              const paid = you ? cycle.status === "Paid" : pool.otherPaid;
              const label = paid ? "Paid" : you ? cycle.status : "Awaiting";
              return (
                <li key={person}>
                  <strong>
                    {person}
                    {person === pool.recipient ? " · Recipient" : ""}
                    {you ? " · You" : ""}
                  </strong>
                  <span>{usdc(paid ? plan.amount : 0)}</span>
                  <span
                    className={
                      paid
                        ? "payout-olive"
                        : label === "Overdue"
                          ? "payout-red"
                          : "payout-muted"
                    }
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="payout-card payout-stack">
          <h2>Member approvals</h2>
          <p>
            {approvals} of {circle.approvals} required ·{" "}
            {approvalGap <= 0
              ? "Threshold met"
              : approvals === 0
                ? `Threshold: ${circle.approvals} of ${circle.members} members`
                : approvalLabel}
          </p>
          <ul>
            {pool.people.map((person, index) => (
              <li key={person}>
                <strong>
                  {person}
                  {person === member.name ? " · You" : ""}
                </strong>
                <span
                  className={
                    index < approvals ? "payout-olive" : "payout-muted"
                  }
                >
                  {index < approvals ? "Approved" : "Awaiting"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

export function PayoutOrder({ vm }: { vm: PayoutView }) {
  const paid = vm.status === "paid";
  const turn = vm.plan.cycles.find(
    (item) =>
      cycleRecipient(vm.circle, item.number, vm.pool.people) === member.name,
  );
  return (
    <section
      id="payout-order"
      className="payout-order payout-stack"
      tabIndex={-1}
    >
      <h2>{paid ? "Coming up next" : "The agreed payout order"}</h2>
      <p>
        {paid && vm.next
          ? `Next: ${cycleRecipient(vm.circle, vm.next.number, vm.pool.people)} · Cycle ${vm.next.number} starts ${dateLabel(vm.next.due)}.`
          : `Recipients are set by the circle rules.${turn ? ` Your turn is Cycle ${turn.number}, in ${monthName(turn.due)}.` : ""}`}
      </p>
      <ol>
        {vm.plan.cycles.map((item) => {
          const recipient = cycleRecipient(
            vm.circle,
            item.number,
            vm.pool.people,
          );
          const label = vm.history.some((entry) => entry.number === item.number)
            ? "Paid"
            : vm.first
              ? "Upcoming"
              : item.number === vm.cycle.number
                ? "Current"
                : item.number === vm.next?.number
                  ? "Next"
                  : "Upcoming";
          return (
            <li
              className="payout-card payout-stack"
              key={item.number}
              data-order={label}
              data-highlight={label === "Current" || (paid && label === "Next")}
            >
              <span className="payout-eyebrow">
                Cycle {item.number} · {monthName(item.due)}
              </span>
              <strong>
                {recipient}
                {recipient === member.name ? " · You" : ""}
              </strong>
              <p>{usdc(vm.amount)}</p>
              <small>{label}</small>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function PayoutHistory({ vm }: { vm: PayoutView }) {
  if (!vm.history.length) return null;
  return (
    <section className="payout-card payout-history">
      <header>
        <h2>Completed payouts</h2>
        <p>
          {vm.history.length} payouts · {usdc(vm.totalPaid)}
        </p>
      </header>
      <table role="table">
        <thead>
          <tr>
            <th scope="col">Recipient / Cycle</th>
            <th scope="col">Paid at · UTC</th>
            <th scope="col">Amount</th>
            <th scope="col">Hash</th>
            <th scope="col">
              <span className="dash-visually-hidden">Transaction details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {vm.history.map((item) => (
            <tr key={item.number}>
              <th scope="row">
                {item.recipient} · Cycle {item.number}
              </th>
              <td data-label="Paid at · UTC">{payoutTimestamp(item.date)}</td>
              <td data-label="Amount">
                <strong>{usdc(item.amount)}</strong>
              </td>
              <td data-label="Hash">{item.hash}</td>
              <td>
                <PayoutTransaction hash={item.hash} inline />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function PayoutAccounting({ vm }: { vm: PayoutView }) {
  return (
    <aside className="payout-note payout-stack">
      <strong>
        Group accounting · {compactUSDC(vm.received)} received −{" "}
        {compactUSDC(vm.totalPaid)} paid out − 0 refunded ={" "}
        {compactUSDC(vm.available)} USDC available
      </strong>
      <p>
        Group funds are held for scheduled payouts. See My Ledger for your
        personal records.
      </p>
      <small>
        Illustrative Testnet records
        {vm.release?.confirmed &&
          ` · Confirmed ${payoutTimestamp(vm.release.confirmed)} UTC`}
      </small>
    </aside>
  );
}
