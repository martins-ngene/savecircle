import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { rpc, xdr, scValToNative } from '@stellar/stellar-sdk';
import { Prisma } from '@prisma/client';

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
    // Read last synced ledger from database
    let lastLedger = 0;
    try {
      const syncState = await this.prisma.syncState.findUnique({
        where: { id: 'savecircle-events' },
      });
      if (syncState) {
        lastLedger = Number(syncState.lastLedger);
      }
    } catch {
      return;
    }

    if (lastLedger === 0) {
      try {
        const latest = await this.server.getLatestLedger();
        lastLedger = Math.max(1, latest.sequence - 100);
      } catch {
        return;
      }
    }

    try {
      const response = await this.server.getEvents({
        startLedger: lastLedger,
        filters: [
          {
            type: 'contract',
            contractIds: [this.contractId],
          },
        ],
        limit: 50,
      });

      if (!response.events || response.events.length === 0) {
        return;
      }

      for (const event of response.events) {
        await this.processEvent(event);
      }

      const newestLedger = response.events[response.events.length - 1].ledger;
      await this.prisma.syncState.upsert({
        where: { id: 'savecircle-events' },
        update: { lastLedger: BigInt(newestLedger + 1) },
        create: { id: 'savecircle-events', lastLedger: BigInt(newestLedger + 1) },
      });
    } catch (err: any) {
      this.logger.debug(`getEvents polling: ${err.message}`);
    }
  }

  private async processEvent(event: any) {
    try {
      const topicVals = event.topic.map((t) => scValToNative(xdr.ScVal.fromXDR(t, 'base64')));
      const eventName = topicVals[0];

      if (eventName === 'contrib') {
        const onChainGroupId = topicVals[1];
        const cycleIndex = topicVals[2];
        const value = scValToNative(xdr.ScVal.fromXDR(event.value, 'base64'));
        const memberWallet = value[0];
        const amount = Number(value[1]) / 10_000_000;

        this.logger.log(`Indexed contribution: Group ${onChainGroupId}, Cycle ${cycleIndex}, Member ${memberWallet}, Amount ${amount}`);

        const group = await this.prisma.savingsGroup.findUnique({
          where: { onChainGroupId },
        });

        if (group) {
          const cycle = await this.prisma.contributionCycle.findUnique({
            where: {
              groupId_cycleIndex: {
                groupId: group.id,
                cycleIndex,
              },
            },
          });

          if (cycle) {
            await this.prisma.paymentRecord.upsert({
              where: { txHash: event.txHash },
              update: {},
              create: {
                groupId: group.id,
                cycleId: cycle.id,
                memberWallet,
                amount: new Prisma.Decimal(amount),
                txHash: event.txHash,
                onChainLedger: BigInt(event.ledger),
              },
            });

            await this.prisma.contributionCycle.update({
              where: { id: cycle.id },
              data: {
                collectedAmount: { increment: new Prisma.Decimal(amount) },
              },
            });

            await this.prisma.groupMember.updateMany({
              where: {
                groupId: group.id,
                walletAddress: memberWallet,
              },
              data: {
                totalContributed: { increment: new Prisma.Decimal(amount) },
              },
            });
          }
        }
      } else if (eventName === 'payout') {
        const onChainGroupId = topicVals[1];
        const cycleIndex = topicVals[2];
        const value = scValToNative(xdr.ScVal.fromXDR(event.value, 'base64'));
        const recipient = value[0];
        const amount = Number(value[1]) / 10_000_000;

        this.logger.log(`Indexed rotating payout: Group ${onChainGroupId}, Cycle ${cycleIndex}, Recipient ${recipient}, Amount ${amount}`);

        const group = await this.prisma.savingsGroup.findUnique({
          where: { onChainGroupId },
        });

        if (group) {
          await this.prisma.contributionCycle.updateMany({
            where: {
              groupId: group.id,
              cycleIndex,
            },
            data: {
              status: 'PAID',
              paidAt: new Date(),
              payoutTxHash: event.txHash,
            },
          });

          await this.prisma.groupMember.updateMany({
            where: {
              groupId: group.id,
              walletAddress: recipient,
            },
            data: {
              totalReceived: { increment: new Prisma.Decimal(amount) },
            },
          });
        }
      }
    } catch (err: any) {
      this.logger.debug(`Error processing event: ${err.message}`);
    }
  }
}
