import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async getGroupSchedule(groupId: string) {
    const group = await this.prisma.savingsGroup.findUnique({
      where: { id: groupId },
      include: {
        cycles: {
          orderBy: { cycleIndex: 'asc' },
          include: {
            payments: true,
          },
        },
        members: {
          orderBy: { rotationPosition: 'asc' },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Group ${groupId} not found`);
    }

    const now = new Date();
    const schedule = group.cycles.map((cycle) => {
      let dynamicStatus = cycle.status;
      if (cycle.status === 'PENDING' && new Date(cycle.dueDate) < now) {
        dynamicStatus = 'OVERDUE';
      }

      const recipientMember = group.members.find((m) => m.walletAddress === cycle.recipientWallet);

      return {
        cycleIndex: cycle.cycleIndex,
        dueDate: cycle.dueDate.toISOString(),
        targetAmount: cycle.targetAmount.toString(),
        collectedAmount: cycle.collectedAmount.toString(),
        status: dynamicStatus,
        recipientWallet: cycle.recipientWallet,
        recipientName: recipientMember?.displayName || 'Unassigned',
        payoutTxHash: cycle.payoutTxHash,
        paidAt: cycle.paidAt ? cycle.paidAt.toISOString() : null,
        contributionsCount: cycle.payments.length,
      };
    });

    return {
      groupId: group.id,
      groupName: group.name,
      paymentFrequency: group.paymentFrequency,
      cycleDurationDays: group.cycleDurationDays,
      totalMembers: group.totalMembers,
      cycles: schedule,
    };
  }

  async getUpcomingObligations(walletAddress: string) {
    const now = new Date();
    const memberships = await this.prisma.groupMember.findMany({
      where: {
        walletAddress,
        status: 'ACTIVE',
      },
      include: {
        group: {
          include: {
            cycles: {
              where: {
                status: { in: ['PENDING', 'UPCOMING'] },
              },
              orderBy: { dueDate: 'asc' },
            },
          },
        },
      },
    });

    const obligations = [];
    for (const membership of memberships) {
      for (const cycle of membership.group.cycles) {
        // Check if member already contributed to this cycle
        const existingPayment = await this.prisma.paymentRecord.findFirst({
          where: {
            cycleId: cycle.id,
            memberWallet: walletAddress,
          },
        });

        if (!existingPayment) {
          const isOverdue = new Date(cycle.dueDate) < now;
          obligations.push({
            groupId: membership.group.id,
            groupName: membership.group.name,
            cycleIndex: cycle.cycleIndex,
            dueDate: cycle.dueDate.toISOString(),
            amount: membership.group.contributionAmount.toString(),
            status: isOverdue ? 'OVERDUE' : 'PENDING',
          });
        }
      }
    }

    return obligations.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }
}
