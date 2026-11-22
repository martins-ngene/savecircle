import { cycleStart, initialDraft, type SavedCircle } from "../circles/model";

export const referenceCircle: SavedCircle = { ...initialDraft, id: "surulere", name: "Surulere Savers" };
export const previewToday = new Date("2025-08-05T09:42:00Z");

export type Status = "Paid" | "Overdue" | "Upcoming" | "Due" | "Pending";
export type Payment = { state: "pending" | "paid"; date: string };
export type Cycle = { number: number; due: Date; deadline: Date; end: Date; status: Status; paid: number; payment?: Payment };

export function dateLabel(date: Date, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(date);
}

export const fullDate = (date: Date) => dateLabel(date, { month: "short", day: "numeric", year: "numeric" });
export const monthName = (date: Date) => dateLabel(date, { month: "long" });
export const monthYear = (date: Date) => dateLabel(date, { month: "long", year: "numeric" });

export function paymentDeadline(due: Date, days: number) {
  const deadline = new Date(due);
  deadline.setUTCDate(deadline.getUTCDate() + days);
  deadline.setUTCHours(23, 59, 59, 999);
  return deadline;
}

export function buildSchedule(circle: SavedCircle, today: Date, payments: Record<string, Payment>) {
  const amount = Math.round(Number(circle.amount) * 100);
  const count = circle.model === "Fixed" ? 1 : circle.order.length;
  const cycles: Cycle[] = [];
  for (let index = 0; index < count; index++) {
    const due = cycleStart(circle.start, circle.frequency, index);
    const following = cycleStart(circle.start, circle.frequency, index + 1);
    if (!due || !following) break;
    const number = index + 1;
    const deadline = paymentDeadline(due, circle.grace);
    const payment = payments[number];
    const historical = ["surulere", "growth"].includes(circle.id) && number <= 2 && due <= today;
    let status: Status = "Due";
    if (payment?.state === "paid" || historical) status = "Paid";
    else if (payment?.state === "pending") status = "Pending";
    else if (due > today) status = "Upcoming";
    else if (deadline < today) status = "Overdue";
    cycles.push({ number, due, deadline, end: new Date(following.getTime() - 1), status, paid: status === "Paid" ? amount : 0, payment });
  }
  const elapsed = cycles.filter(cycle => cycle.due <= today);
  const paid = elapsed.reduce((total, cycle) => total + cycle.paid, 0);
  const expected = elapsed.length * amount;
  return { amount, cycles, elapsed, paid, expected, outstanding: expected - paid };
}

export function calendarDays(month: Date) {
  const year = month.getUTCFullYear();
  const index = month.getUTCMonth();
  const start = (new Date(Date.UTC(year, index, 1)).getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((start + length) / 7) * 7 }, (_, i) => new Date(Date.UTC(year, index, i - start + 1)));
}

export const dayKey = (date: Date) => date.toISOString().slice(0, 10);
export const canPay = (cycle: Cycle) => cycle.status === "Overdue" || cycle.status === "Due";
