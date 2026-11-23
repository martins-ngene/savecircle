import type { SavedCircle } from "../circles/model";
import { member } from "../dashboard/model";
import type { Cycle } from "./model";

export function circleMembers(circle: SavedCircle) {
  if (circle.id === "surulere") return ["Kelechi M.", "Timi I.", "Nora O.", member.name, "Bisi A."];
  return Array.from({ length: circle.members }, (_, index) => index === 0 ? member.name : `Member ${index + 1}`);
}

export function cycleRecipient(circle: SavedCircle, cycle: number, people: string[]) {
  const slot = circle.model === "Fixed" ? circle.recipient : circle.order[cycle - 1];
  return people[slot - 1] ?? "Scheduled recipient";
}

export function contributionPool(circle: SavedCircle, cycle: Cycle, amount: number) {
  const people = circleMembers(circle);
  const recipient = cycleRecipient(circle, cycle.number, people);
  const otherPaid = ["surulere", "growth"].includes(circle.id) && cycle.status !== "Upcoming";
  const paidMembers = people.filter(person => person === member.name ? cycle.status === "Paid" : otherPaid).length;
  const target = amount * circle.members;
  const collected = paidMembers * amount;
  const percent = Math.round(paidMembers / circle.members * 100);
  return { people, recipient, otherPaid, paidMembers, target, collected, percent };
}
