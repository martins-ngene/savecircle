export const navigation = [
  ["how-it-works", "How it works"], ["security", "Security"], ["planner", "Planner"], ["faqs", "FAQs"],
] as const;

export const steps = [
  ["users", "Create your circle", "Set the contribution amount, schedule, member count, payout order and approval rules together.", "Organizer-led setup"],
  ["wallet", "Contribute on schedule", "Members connect a unique Stellar wallet, accept the rules, and authorize every USDC payment.", "No surprise auto-debits"],
  ["coin", "Payout with confidence", "When the pool is fully funded and approvals are met, the designated member receives the payout.", "Contract enforced"],
] as const;

export const security = [
  ["fingerprint", "Every wallet is unique", "Only registered and active member wallets can contribute to a circle."],
  ["shield", "Payouts follow the order", "Recipients and approval thresholds are agreed before a cycle begins."],
  ["lock", "Funds stay protected", "Incomplete pools, duplicate payouts and unauthorized actions are blocked."],
  ["link", "A ledger you can verify", "Transaction hashes and timestamps link back to the Stellar explorer."],
] as const;

export const visibility = [
  ["calendar", "Clear due dates", "Weekly, biweekly or monthly schedules and reminders."],
  ["wallet", "Honest balances", "Historical contributions stay separate from withdrawable funds."],
  ["users", "Shared visibility", "Track funding progress, approvals and upcoming recipients."],
  ["external", "Verifiable activity", "Open transaction hashes directly in Stellar explorer."],
] as const;

export const faqs = [
  ["Do I need to understand blockchain?", "SaveCircle keeps the experience familiar. You connect a Stellar wallet to approve payments, while the app explains schedules, balances and statuses in clear language."],
  ["Can SaveCircle debit my wallet automatically?", "You authorize each contribution yourself in your Stellar wallet."],
  ["When can a rotating payout happen?", "The designated member can receive the payout once the cycle is fully funded and the required approvals are met."],
  ["Can one member change the group rules?", "The group agrees on the schedule, payout order and approval rules before the cycle begins. Payouts follow the rules enforced by the smart contract."],
] as const;
