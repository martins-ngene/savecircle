import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BlockchainService } from './blockchain.service';

@ApiTags('Blockchain & Soroban')
@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get current Soroban contract addresses, network passphrase and RPC endpoints' })
  getConfig() {
    return this.blockchainService.getNetworkConfig();
  }

  @Get('tx/:hash')
  @ApiOperation({ summary: 'Verify confirmed Stellar Testnet transaction status via Soroban RPC' })
  async verifyTx(@Param('hash') hash: string) {
    return this.blockchainService.verifyTransaction(hash);
  }
}
