import { calculatePlan, usdc } from "../landing/plan";
import { cycleDate, payoutRows, slotName, type SavedCircle } from "./model";
import type { Invite } from "../invitations/model";

export function circleInvitation(circle: SavedCircle): Invite {
  const plan = calculatePlan(circle.members, circle.amount);
  const rotating = circle.model === "Rotating";
  const organizerPosition = circle.order.indexOf(1) + 1;
  return {
    groupId: circle.id,
    local: true,
    name: circle.name,
    description: circle.description,
    organizerWallet: "organizer",
    contributionAmount: circle.amount,
    targetAmount: usdc(plan.pool).replace(" USDC", ""),
    totalMembers: circle.members,
    paymentFrequency: circle.frequency,
    rules: circle.rules,
    members: [{ walletAddress: "organizer", displayName: "Ada Okafor", rotationPosition: organizerPosition, status: "ACTIVE" }],
    dates: payoutRows(circle).map(({ date }) => date),
    fixed: rotating ? undefined : {
      amount: usdc(calculatePlan(1, circle.fixedAmount).pool),
      recipient: slotName(circle.recipient),
    },
    firstPayment: cycleDate(circle.start, circle.frequency),
  };
}
