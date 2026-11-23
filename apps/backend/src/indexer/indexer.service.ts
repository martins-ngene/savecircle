import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { nativeToScVal, rpc, scValToNative, xdr } from '@stellar/stellar-sdk';
import { Prisma, WithdrawalStatus } from '@prisma/client';

const withdrawalStatuses = [undefined, WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED, WithdrawalStatus.EXECUTED, WithdrawalStatus.REJECTED];

@Injectable()
export class IndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IndexerService.name);
  private readonly server: rpc.Server;
  private readonly contractId: string;
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {
    const rpcUrl = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
    this.server = new rpc.Server(rpcUrl);
    this.contractId = process.env.SAVECIRCLE_CONTRACT_ID || 'CDSNM3LJEEDHPHKQBEUA5FS42SUMAWTEEKWHAIVWJYYYT6QY3B5HNYNB';
  }

  async onModuleInit() {
    if (process.env.INDEXER_ENABLED === 'false') {
      this.logger.log('Indexer disabled via INDEXER_ENABLED=false');
      return;
    }
    this.logger.log(`Starting Soroban RPC Indexer targeting contract: ${this.contractId}`);
    this.isRunning = true;
    this.pollEvents();
  }

  onModuleDestroy() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  private async pollEvents() {
    if (!this.isRunning) return;

    try {
      await this.syncEvents();
    } catch (err: any) {
      this.logger.debug(`Indexer sync check: ${err.message}`);
    }

    const interval = parseInt(process.env.INDEXER_POLL_INTERVAL_MS || '5000', 10);
    this.timer = setTimeout(() => this.pollEvents(), interval);
  }

  async syncEvents() {
    const syncState = await this.prisma.syncState.findUnique({ where: { id: 'savecircle-events' } });
    const cursor = syncState?.lastCursor;
    let startLedger = Number(syncState?.lastLedger ?? 0);
    if (!cursor && !startLedger) {
      const { sequence } = await this.server.getLatestLedger();
      startLedger = Math.max(1, sequence - 100);
    }

    const response = await this.server.getEvents({
      ...(cursor ? { cursor } : { startLedger }),
      filters: [{ type: 'contract', contractIds: [this.contractId] }],
      limit: 50,
    });

    if (!response.events.length && response.latestLedger > startLedger) {
      await this.prisma.syncState.upsert({
        where: { id: 'savecircle-events' },
        update: { lastLedger: BigInt(response.latestLedger), lastCursor: null },
        create: { id: 'savecircle-events', lastLedger: BigInt(response.latestLedger) },
      });
      return;
    }

    for (const event of response.events) {
      await this.processEvent(event);
      await this.prisma.syncState.upsert({
        where: { id: 'savecircle-events' },
        update: { lastLedger: BigInt(event.ledger), lastCursor: event.id },
        create: { id: 'savecircle-events', lastLedger: BigInt(event.ledger), lastCursor: event.id },
      });
    }
  }

  private async processEvent(event: rpc.Api.EventResponse) {
    const [name, onChainGroupId, cycleIndex] = event.topic.map((topic) => scValToNative(topic));
    if (name === 'wdr_req' || name === 'wdr_app' || name === 'wdr_exec') {
      await this.indexWithdrawal(event, onChainGroupId, cycleIndex, name);
      return;
    }
    if (name !== 'contrib' && name !== 'payout') return;

    const [walletAddress, rawAmount] = scValToNative(event.value);
    const amount = new Prisma.Decimal(String(rawAmount)).div(10_000_000);
    const group = await this.prisma.savingsGroup.findUnique({ where: { onChainGroupId } });
    if (!group) return;

    await this.prisma.$transaction(async (tx) => {
      const key = { groupId: group.id, cycleIndex };
      if (name === 'payout') {
        const updated = await tx.contributionCycle.updateMany({
          where: { ...key, payoutTxHash: null },
          data: { status: 'PAID', paidAt: new Date(event.ledgerClosedAt), payoutTxHash: event.txHash },
        });
        if (updated.count) await tx.groupMember.updateMany({
          where: { groupId: group.id, walletAddress },
          data: { totalReceived: { increment: amount } },
        });
        return;
      }

      const cycle = await tx.contributionCycle.findUnique({ where: { groupId_cycleIndex: key } });
      if (!cycle) return;
      const inserted = await tx.paymentRecord.createMany({
        data: {
          groupId: group.id,
          cycleId: cycle.id,
          memberWallet: walletAddress,
          amount,
          txHash: event.txHash,
          onChainLedger: BigInt(event.ledger),
          createdAt: new Date(event.ledgerClosedAt),
        },
        skipDuplicates: true,
      });
      if (!inserted.count) return;

      const updated = await tx.contributionCycle.update({
        where: { id: cycle.id },
        data: { collectedAmount: { increment: amount } },
      });
      if (updated.status !== 'PAID') await tx.contributionCycle.update({
        where: { id: cycle.id },
        data: { status: updated.collectedAmount.gte(updated.targetAmount) ? 'FUNDED' : 'PENDING' },
      });
      await tx.groupMember.updateMany({
        where: { groupId: group.id, walletAddress },
        data: { totalContributed: { increment: amount } },
      });
    });
  }

  private async indexWithdrawal(event: rpc.Api.EventResponse, onChainGroupId: number, requestId: number, name: string) {
    const group = await this.prisma.savingsGroup.findUnique({ where: { onChainGroupId } });
    if (!group) return;

    const key = xdr.ScVal.scvVec([
      nativeToScVal('Withdrawal', { type: 'symbol' }),
      nativeToScVal(onChainGroupId, { type: 'u32' }),
      nativeToScVal(requestId, { type: 'u32' }),
    ]);
    const entry = await this.server.getContractData(this.contractId, key);
    const record = scValToNative(entry.val.contractData().val());
    const status = withdrawalStatuses[record.status];
    if (!status) throw new Error('Unknown withdrawal status from Stellar');
    const executed = name === 'wdr_exec' ? { executedAt: new Date(event.ledgerClosedAt), txHash: event.txHash } : {};
    const fields = {
      requesterWallet: record.requester,
      recipientWallet: record.recipient,
      amount: new Prisma.Decimal(String(record.amount)).div(10_000_000),
      approvalCount: record.approval_count,
      requiredApprovals: group.approvalThreshold,
      status,
      ...executed,
    };
    await this.prisma.withdrawalProposal.upsert({
      where: { groupId_requestId: { groupId: group.id, requestId } },
      update: fields,
      create: { groupId: group.id, requestId, ...fields, createdAt: new Date(event.ledgerClosedAt) },
    });
  }
}
