import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function getIsolatedDatabaseUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;
  try {
    const parsed = new URL(rawUrl);
    const schema = parsed.searchParams.get('schema');
    if (!schema || schema === 'public') {
      parsed.searchParams.set('schema', 'savecircle');
      return parsed.toString();
    }
    return rawUrl;
  } catch {
    if (!rawUrl.includes('schema=')) {
      return rawUrl.includes('?') ? `${rawUrl}&schema=savecircle` : `${rawUrl}?schema=savecircle`;
    }
    return rawUrl;
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const isolatedUrl = getIsolatedDatabaseUrl();
    super(
      isolatedUrl
        ? {
            datasources: {
              db: {
                url: isolatedUrl,
              },
            },
          }
        : undefined,
    );
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to PostgreSQL via Prisma (schema: savecircle)');
    } catch (err: any) {
      this.logger.warn(`PostgreSQL not connected at bootstrap: ${err.message}. Offline mock mode active.`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch (_) {}
  }
}
