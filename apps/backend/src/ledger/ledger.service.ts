import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async getMemberLedger(groupId: string, walletAddress: string) {
    const group = await this.prisma.savingsGroup.findUnique({
      where: { id: groupId },
      include: {
        members: true,
        cycles: {
          orderBy: { cycleIndex: 'asc' },
          include: {
            payments: {
              where: { memberWallet: walletAddress },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Group ${groupId} not found`);
    }

    const member = group.members.find((m) => m.walletAddress === walletAddress);
    if (!member) {
      throw new NotFoundException(`Member ${walletAddress} is not registered in this circle`);
    }

    const now = new Date();
    let totalExpected = new Prisma.Decimal(0);
    let totalContributed = new Prisma.Decimal(0);
    let nextDeadline: string | null = null;

    const cycleEntries = group.cycles.map((cycle) => {
      const payment = cycle.payments[0];
      const isPaid = !!payment;
      const expected = group.contributionAmount;

      if (cycle.status === 'PENDING' || cycle.status === 'UPCOMING' || isPaid) {
        totalExpected = totalExpected.add(expected);
      }

      if (isPaid) {
        totalContributed = totalContributed.add(payment.amount);
      } else if (!nextDeadline && new Date(cycle.dueDate) >= now) {
        nextDeadline = cycle.dueDate.toISOString();
      }

      let status = 'UPCOMING';
      if (isPaid) {
        status = 'COMPLETED';
      } else if (new Date(cycle.dueDate) < now) {
        status = 'OVERDUE';
      } else if (cycle.status === 'PENDING') {
        status = 'PENDING';
      }

      return {
        cycleIndex: cycle.cycleIndex,
        expectedAmount: expected.toString(),
        paidAmount: isPaid ? payment.amount.toString() : '0',
        dueDate: cycle.dueDate.toISOString(),
        status,
        txHash: payment?.txHash || null,
        paidAt: payment?.createdAt ? payment.createdAt.toISOString() : null,
      };
    });

    const outstandingBalance = totalExpected.sub(totalContributed);

    return {
      groupId: group.id,
      groupName: group.name,
      walletAddress,
      displayName: member.displayName || 'Member',
      payoutPosition: member.rotationPosition,
      totalContributed: totalContributed.toString(),
      totalPayoutsReceived: member.totalReceived.toString(),
      outstandingBalance: outstandingBalance.isNegative() ? '0' : outstandingBalance.toString(),
      nextPaymentDeadline: nextDeadline,
      cycles: cycleEntries,
    };
  }

  async getGroupLedgerSummary(groupId: string) {
    const group = await this.prisma.savingsGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          orderBy: { rotationPosition: 'asc' },
        },
        cycles: {
          include: {
            payments: true,
          },
        },
        withdrawals: { where: { status: 'EXECUTED' } },
      },
    });

    if (!group) {
      throw new NotFoundException(`Group ${groupId} not found`);
    }

    let totalPoolCollected = new Prisma.Decimal(0);
    let totalPayoutsDisbursed = new Prisma.Decimal(0);

    for (const cycle of group.cycles) {
      totalPoolCollected = totalPoolCollected.add(cycle.collectedAmount);
      if (cycle.status === 'PAID') {
        totalPayoutsDisbursed = totalPayoutsDisbursed.add(cycle.targetAmount);
      }
    }

    const totalWithdrawn = group.withdrawals.reduce((total, proposal) => total.add(proposal.amount), new Prisma.Decimal(0));
    const availableBalance = totalPoolCollected.sub(totalPayoutsDisbursed).sub(totalWithdrawn);

    return {
      groupId: group.id,
      groupName: group.name,
      totalTargetPool: group.targetAmount.toString(),
      totalCollected: totalPoolCollected.toString(),
      totalPayoutsDisbursed: totalPayoutsDisbursed.toString(),
      totalWithdrawn: totalWithdrawn.toString(),
      availableBalance: availableBalance.toString(),
      memberCount: group.members.length,
      members: group.members.map((m) => ({
        walletAddress: m.walletAddress,
        displayName: m.displayName,
        rotationPosition: m.rotationPosition,
        status: m.status,
        totalContributed: m.totalContributed.toString(),
        totalReceived: m.totalReceived.toString(),
      })),
    };
  }
}
