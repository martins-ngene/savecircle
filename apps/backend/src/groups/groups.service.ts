import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto, RegisterMemberDto, JoinWithInviteDto } from './dto/groups.dto';
import { Prisma } from '@prisma/client';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class GroupsService {
  private readonly idempotencyCache = new Map<string, { groupId: string; timestamp: number }>();

  constructor(private readonly prisma: PrismaService, private readonly blockchain: BlockchainService) {}

  async createGroup(organizerWallet: string, dto: CreateGroupDto, idempotencyKey?: string) {
    if (idempotencyKey) {
      const cacheKey = `${organizerWallet}:${idempotencyKey}`;
      const cached = this.idempotencyCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 15 * 60 * 1000) {
        return this.getGroupById(cached.groupId);
      }
    }

    const contributionPerMember = new Prisma.Decimal(dto.contributionAmount);
    const targetAmount = contributionPerMember.mul(dto.totalMembers);
    const frequency = dto.paymentFrequency || 'MONTHLY';
    const durationDays = dto.cycleDurationDays || 30;
    const approvalThreshold = dto.approvalThreshold || Math.min(3, dto.totalMembers);
    const usdcToken = this.blockchain.getNetworkConfig().usdcTokenId;
    if (dto.onChainGroupId != null || dto.creationTxHash != null) {
      if (!dto.creationTxHash || dto.onChainGroupId == null) {
        throw new BadRequestException('Provide both onChainGroupId and creationTxHash, or link the circle after creation');
      }
      const verifiedId = await this.blockchain.verifyGroupCreation(dto.creationTxHash, {
        organizerWallet, usdcToken, name: dto.name, contributionAmount: contributionPerMember,
        totalMembers: dto.totalMembers, approvalThreshold,
      });
      if (verifiedId !== dto.onChainGroupId) throw new BadRequestException('The on-chain group ID differs from the transaction result');
    }

    const group = await this.prisma.$transaction(async (tx) => {
      const created = await tx.savingsGroup.create({
        data: {
          name: dto.name,
          description: dto.description,
          organizerWallet,
          usdcToken,
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
      });

      const now = new Date();
      for (let i = 1; i <= dto.totalMembers; i++) {
        const dueDate = new Date(now.getTime() + i * durationDays * 24 * 60 * 60 * 1000);
        await tx.contributionCycle.create({
          data: {
            groupId: created.id,
            cycleIndex: i,
            recipientWallet: i === 1 ? organizerWallet : 'UNASSIGNED',
            targetAmount,
            status: i === 1 ? 'PENDING' : 'UPCOMING',
            dueDate,
          },
        });
      }

      return created;
    });

    if (idempotencyKey) {
      this.idempotencyCache.set(`${organizerWallet}:${idempotencyKey}`, {
        groupId: group.id,
        timestamp: Date.now(),
      });
    }

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

  async linkOnChain(id: string, organizerWallet: string, hash: string) {
    const group = await this.getGroupById(id);
    if (group.organizerWallet !== organizerWallet) throw new ForbiddenException('Only the organizer can link a circle');
    if (group.onChainGroupId != null) return group;
    if (group.payoutModel !== 'ROTATING') throw new BadRequestException('Only rotating circles support this contract');
    const onChainGroupId = await this.blockchain.verifyGroupCreation(hash, group);
    try {
      await this.prisma.savingsGroup.updateMany({
        where: { id, organizerWallet, onChainGroupId: null },
        data: { onChainGroupId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This Stellar group is already linked to another circle');
      }
      throw error;
    }
    const linked = await this.getGroupById(id);
    if (linked.onChainGroupId !== onChainGroupId) throw new ConflictException('This circle was linked to a different Stellar group');
    return linked;
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

    if (!Number.isInteger(dto.rotationPosition) || dto.rotationPosition < 1 || dto.rotationPosition > group.totalMembers) {
      throw new BadRequestException('Choose a valid rotation position');
    }

    return this.reserveMember(groupId, dto.walletAddress, dto.rotationPosition, dto.displayName, false);
  }

  async joinWithInvite(walletAddress: string, dto: JoinWithInviteDto) {
    const group = await this.prisma.savingsGroup.findUnique({
      where: { inviteToken: dto.inviteToken },
      include: { members: true },
    });
    if (!group) throw new NotFoundException('Invalid invitation link');

    const alreadyMember = group.members.find((member) => member.walletAddress === walletAddress);
    if (alreadyMember) return alreadyMember;
    if (group.members.length >= group.totalMembers) throw new BadRequestException('Group is full');
    if (!Number.isInteger(dto.rotationPosition) || dto.rotationPosition < 1 || dto.rotationPosition > group.totalMembers) {
      throw new BadRequestException('Choose a valid rotation position');
    }
    if (group.members.some((member) => member.rotationPosition === dto.rotationPosition)) {
      throw new ConflictException('This payout spot is occupied. Reopen the invitation to see available spots.');
    }

    return this.reserveMember(group.id, walletAddress, dto.rotationPosition, dto.displayName || 'Member', true);
  }

  private async reserveMember(groupId: string, walletAddress: string, rotationPosition: number, displayName: string | undefined, accepted: boolean) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.user.upsert({ where: { walletAddress }, update: {}, create: { walletAddress } });
        const member = await tx.groupMember.create({
          data: {
            groupId, walletAddress, displayName, rotationPosition,
            status: accepted ? 'ACTIVE' : 'INVITED',
            rulesAccepted: accepted,
          },
        });
        await tx.contributionCycle.updateMany({
          where: { groupId, cycleIndex: rotationPosition },
          data: { recipientWallet: walletAddress },
        });
        return member;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This wallet or payout spot already has a reservation. Refresh the circle and try again.');
      }
      throw error;
    }
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

    if (!member) throw new NotFoundException('Member record not found in this circle');
    if (member.status !== 'INVITED' && member.status !== 'ACTIVE') {
      throw new ForbiddenException('This membership cannot accept rules');
    }
    if (member.rulesAccepted && member.status === 'ACTIVE') return member;

    return this.prisma.groupMember.update({
      where: { id: member.id },
      data: {
        rulesAccepted: true,
        status: 'ACTIVE',
      },
    });
  }
}
