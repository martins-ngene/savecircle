export const minMembers = 3;
export const maxMembers = 12;
export const frequencies = {
  Weekly: "Every week",
  "Every 2 weeks": "Every 2 weeks",
  Monthly: "Every month",
} as const;

export function calculatePlan(members: number, contribution: string) {
  const amount = contribution.trim();
  const cents = Math.round(Number(amount) * 100);
  const valid = /^\d+(\.\d{1,2})?$/.test(amount) && cents > 0 && cents <= 100_000_000;
  const pool = valid ? cents * members : 0;
  return { valid, pool, total: pool * members, order: Array.from({ length: members }, (_, i) => i + 1) };
}

const currency = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function usdc(cents: number) {
  return `${currency.format(cents / 100)} USDC`;
}
