/**
 * SaveCircle Shared Enums & Data Transfer Objects
 */

export enum GroupStatus {
  DRAFT = 'DRAFT',
  FORMING = 'FORMING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  DISSOLVED = 'DISSOLVED',
}

export enum PayoutModel {
  ROTATING = 'ROTATING',
  FIXED = 'FIXED',
  VARIABLE = 'VARIABLE',
}

export enum PaymentFrequency {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum MemberStatus {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  EXIT_REQUESTED = 'EXIT_REQUESTED',
  EXITED = 'EXITED',
}

export enum CycleStatus {
  UPCOMING = 'UPCOMING',
  PENDING = 'PENDING',
  FUNDED = 'FUNDED',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export enum WithdrawalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  EXECUTED = 'EXECUTED',
  REJECTED = 'REJECTED',
}

export enum NotificationType {
  UPCOMING_PAYMENT = 'UPCOMING_PAYMENT',
  PAYMENT_OVERDUE = 'PAYMENT_OVERDUE',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  CYCLE_FUNDED = 'CYCLE_FUNDED',
  PAYOUT_DISBURSED = 'PAYOUT_DISBURSED',
  WITHDRAWAL_REQUESTED = 'WITHDRAWAL_REQUESTED',
  WITHDRAWAL_APPROVED = 'WITHDRAWAL_APPROVED',
}

export interface GroupConfigDto {
  name: string;
  description: string;
  contributionAmount: string; // BigInt serialized as string (in stroops / 7 decimals USDC)
  targetAmount: string;
  totalMembers: number;
  paymentFrequency: PaymentFrequency;
  cycleDurationDays: number;
  startDate: string; // ISO date
  payoutModel: PayoutModel;
  approvalThreshold: number; // e.g. 3 of 5
  rules: string;
}

export interface MemberRecordDto {
  walletAddress: string;
  displayName?: string;
  status: MemberStatus;
  joinedAt: string;
  rulesAccepted: boolean;
  totalContributed: string;
  totalReceived: string;
  payoutPosition: number; // 1-indexed rotation order
}

export interface CycleRecordDto {
  cycleIndex: number;
  dueDate: string;
  targetPoolAmount: string;
  collectedAmount: string;
  recipientWallet: string;
  recipientName?: string;
  status: CycleStatus;
  paidAt?: string;
  payoutTxHash?: string;
}

export interface MemberLedgerEntryDto {
  cycleIndex: number;
  expectedAmount: string;
  paidAmount: string;
  dueDate: string;
  status: 'COMPLETED' | 'PENDING' | 'UPCOMING' | 'OVERDUE';
  paidAt?: string;
  txHash?: string;
}

export interface MemberLedgerSummaryDto {
  walletAddress: string;
  totalContributed: string;
  totalPayoutsReceived: string;
  outstandingBalance: string;
  nextPaymentDeadline?: string;
  payoutPosition: number;
  entries: MemberLedgerEntryDto[];
}

export interface WithdrawalRequestDto {
  requestId: number;
  groupId: string;
  requesterWallet: string;
  recipientWallet: string;
  amount: string;
  reason: string;
  approvalCount: number;
  requiredApprovals: number;
  approvers: string[];
  status: WithdrawalStatus;
  createdAt: string;
  executedAt?: string;
  txHash?: string;
}
