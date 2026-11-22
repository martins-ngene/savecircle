export const member = { name: "Ada Okafor", initials: "AO", wallet: "GBCJ…7K4P" };
export const circle = { name: "The Growth Circle", pool: 400, target: 500, contribution: 100, fundedMembers: 4, members: 5, cycle: 3 };
export const fundingPercent = Math.round(circle.pool / circle.target * 100);

export const payments = [
  { name: circle.name, amount: 100, date: "May 28, 2025", detail: "Cycle 4 contribution", dueSoon: true },
  { name: "Lagos Founders Circle", amount: 200, date: "Jun 12, 2025", detail: "Scheduled contribution", dueSoon: false },
];

export const activity = [
  { title: "Contribution", detail: "The Growth Circle · Cycle 3", date: "May 1, 2025 · 09:42", hash: "c9a7…f21d", amount: -100 },
  { title: "Payout received", detail: "Lagos Founders Circle · Cycle 2", date: "Apr 26, 2025 · 14:18", hash: "7bd2…a814", amount: 800 },
  { title: "Contribution", detail: "The Growth Circle · Cycle 2", date: "Apr 1, 2025 · 08:05", hash: "4fa1…9e2c", amount: -100 },
  { title: "Circle joined", detail: "Lagos Founders Circle", date: "Mar 12, 2025 · 17:31", hash: "e83c…77ab", amount: null },
];

export const journey = [
  { name: "Kelechi M.", detail: "Completed · Mar 4" },
  { name: "Timi I.", detail: "Completed · Apr 4" },
  { name: member.name, detail: `${fundingPercent}% funded` },
  { name: "Nora O.", detail: "Upcoming · Jun 4" },
  { name: "EA", detail: "Upcoming" },
];

export function searchDashboard(query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  return [
    { label: circle.name, detail: "Active circle · Monthly", section: "circles" },
    { label: payments[1].name, detail: "Upcoming payment", section: "schedule" },
    ...activity.map((item) => ({ label: item.title, detail: item.detail, section: "ledger", hash: item.hash })),
  ].filter((item) => Object.values(item).join(" ").toLowerCase().includes(term));
}

const formatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatAmount = (amount: number) => formatter.format(amount);
