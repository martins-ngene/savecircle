import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto, RegisterMemberDto, JoinWithInviteDto } from './dto/groups.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async createGroup(organizerWallet: string, dto: CreateGroupDto) {
    const contributionPerMember = new Prisma.Decimal(dto.contributionAmount);
    const targetAmount = contributionPerMember.mul(dto.totalMembers);
    const frequency = dto.paymentFrequency || 'MONTHLY';
    const durationDays = dto.cycleDurationDays || 30;
    const approvalThreshold = dto.approvalThreshold || Math.min(3, dto.totalMembers);

    const group = await this.prisma.savingsGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
        organizerWallet,
        usdcToken: process.env.USDC_TOKEN_CONTRACT_ID || 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
        contributionAmount: contributionPerMember,
        targetAmount,
        totalMembers: dto.totalMembers,
        paymentFrequency: frequency,
        cycleDurationDays: durationDays,
        approvalThreshold,
        payoutModel: dto.payoutModel || 'ROTATING',
        rules: dto.rules,
        onChainGroupId: dto.onChainGroupId,
        members: {
          create: {
            walletAddress: organizerWallet,
            displayName: 'Organizer',
            rotationPosition: 1,
            rulesAccepted: true,
            status: 'ACTIVE',
          },
        },
      },
      include: {
        members: true,
      },
    });

    // Create the rotating cycles
    const now = new Date();
    const cyclePromises = [];
    for (let i = 1; i <= dto.totalMembers; i++) {
      const dueDate = new Date(now.getTime() + i * durationDays * 24 * 60 * 60 * 1000);
      cyclePromises.push(
        this.prisma.contributionCycle.create({
          data: {
            groupId: group.id,
            cycleIndex: i,
            recipientWallet: i === 1 ? organizerWallet : 'UNASSIGNED',
            targetAmount,
            status: i === 1 ? 'PENDING' : 'UPCOMING',
            dueDate,
          },
        }),
      );
    }
    await Promise.all(cyclePromises);

    return this.getGroupById(group.id);
  }

  async getGroupById(id: string) {
    const group = await this.prisma.savingsGroup.findUnique({
      where: { id },
      include: {
        members: {
          orderBy: { rotationPosition: 'asc' },
        },
        cycles: {
          orderBy: { cycleIndex: 'asc' },
        },
        withdrawals: true,
      },
    });

    if (!group) {
      throw new NotFoundException(`Savings Circle ${id} not found`);
    }

    return group;
  }

  async getGroupByInviteToken(inviteToken: string) {
    const group = await this.prisma.savingsGroup.findUnique({
      where: { inviteToken },
      include: {
        members: {
          select: {
            walletAddress: true,
            displayName: true,
            rotationPosition: true,
            status: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Invalid invitation link');
    }

    return {
      groupId: group.id,
      name: group.name,
      description: group.description,
      organizerWallet: group.organizerWallet,
      contributionAmount: group.contributionAmount.toString(),
      targetAmount: group.targetAmount.toString(),
      totalMembers: group.totalMembers,
      joinedMembers: group.members.length,
      paymentFrequency: group.paymentFrequency,
      rules: group.rules,
      members: group.members,
    };
  }

  async getMyCircles(walletAddress: string) {
    return this.prisma.savingsGroup.findMany({
      where: {
        OR: [
          { organizerWallet: walletAddress },
          { members: { some: { walletAddress } } },
        ],
      },
      include: {
        members: true,
        cycles: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async registerMember(groupId: string, organizerWallet: string, dto: RegisterMemberDto) {
    const group = await this.getGroupById(groupId);
    if (group.organizerWallet !== organizerWallet) {
      throw new ForbiddenException('Only the circle organizer can register members');
    }

    if (group.members.length >= group.totalMembers) {
      throw new BadRequestException('Savings Circle is already at maximum capacity');
    }

    const existingPosition = group.members.find((m) => m.rotationPosition === dto.rotationPosition);
    if (existingPosition) {
      throw new BadRequestException(`Rotation position ${dto.rotationPosition} is already taken`);
    }

    const member = await this.prisma.groupMember.create({
      data: {
        groupId,
        walletAddress: dto.walletAddress,
        displayName: dto.displayName,
        rotationPosition: dto.rotationPosition,
        status: 'INVITED',
        rulesAccepted: false,
      },
    });

    // Update corresponding cycle recipient
    await this.prisma.contributionCycle.updateMany({
      where: {
        groupId,
        cycleIndex: dto.rotationPosition,
      },
      data: {
        recipientWallet: dto.walletAddress,
      },
    });

    return member;
  }

  async joinWithInvite(walletAddress: string, dto: JoinWithInviteDto) {
    const group = await this.prisma.savingsGroup.findUnique({
      where: { inviteToken: dto.inviteToken },
      include: { members: true },
    });

    if (!group) {
      throw new NotFoundException('Invalid invitation link');
    }

    if (group.members.length >= group.totalMembers) {
      throw new BadRequestException('Group is full');
    }

    const alreadyMember = group.members.find((m) => m.walletAddress === walletAddress);
    if (alreadyMember) {
      return alreadyMember;
    }

    const positionTaken = group.members.find((m) => m.rotationPosition === dto.rotationPosition);
    if (positionTaken) {
      throw new BadRequestException(`Rotation position ${dto.rotationPosition} is already occupied`);
    }

    const member = await this.prisma.groupMember.create({
      data: {
        groupId: group.id,
        walletAddress,
        displayName: dto.displayName || 'Member',
        rotationPosition: dto.rotationPosition,
        status: 'ACTIVE',
        rulesAccepted: true,
      },
    });

    // Update cycle
    await this.prisma.contributionCycle.updateMany({
      where: {
        groupId: group.id,
        cycleIndex: dto.rotationPosition,
      },
      data: {
        recipientWallet: walletAddress,
      },
    });

    return member;
  }

  async acceptRules(groupId: string, memberWallet: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_walletAddress: {
          groupId,
          walletAddress: memberWallet,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member record not found in this circle');
    }

    return this.prisma.groupMember.update({
      where: { id: member.id },
      data: {
        rulesAccepted: true,
        status: 'ACTIVE',
      },
    });
  }
}
