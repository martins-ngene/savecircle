import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health & Monitoring')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'System Health Check',
    description: 'Returns service uptime, database connectivity status, and active Stellar/Soroban network configuration.',
  })
  @ApiResponse({
    status: 200,
    description: 'System is healthy and responsive.',
    schema: {
      example: {
        status: 'ok',
        service: 'savecircle-backend',
        timestamp: '2026-11-21T21:20:00.000Z',
        uptimeSeconds: 120,
        database: 'healthy',
        stellar: {
          network: 'TESTNET',
          contractId: 'CDSNM3LJEEDHPHKQBEUA5FS42SUMAWTEEKWHAIVWJYYYT6QY3B5HNYNB',
          usdcToken: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
        },
      },
    },
  })
  async getHealth() {
    let dbStatus = 'healthy';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'degraded';
    }

    return {
      status: 'ok',
      service: 'savecircle-backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: dbStatus,
      stellar: {
        network: this.configService.get<string>('STELLAR_NETWORK', 'TESTNET'),
        contractId: this.configService.get<string>(
          'SAVECIRCLE_CONTRACT_ID',
          'CDSNM3LJEEDHPHKQBEUA5FS42SUMAWTEEKWHAIVWJYYYT6QY3B5HNYNB',
        ),
        usdcToken: this.configService.get<string>(
          'USDC_TOKEN_CONTRACT_ID',
          'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
        ),
      },
    };
  }
}
