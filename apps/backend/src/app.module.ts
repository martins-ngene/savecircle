import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GroupsModule } from './groups/groups.module';
import { SchedulesModule } from './schedules/schedules.module';
import { LedgerModule } from './ledger/ledger.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { IndexerModule } from './indexer/indexer.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule,
    GroupsModule,
    SchedulesModule,
    LedgerModule,
    BlockchainModule,
    IndexerModule,
    NotificationsModule,
  ],
})
export class AppModule {}
