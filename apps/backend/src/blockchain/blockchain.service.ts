import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { rpc, Networks } from '@stellar/stellar-sdk';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly server: rpc.Server;
  private readonly contractId: string;
  private readonly usdcTokenId: string;
  private readonly networkPassphrase: string;

  constructor() {
    const rpcUrl = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
    this.server = new rpc.Server(rpcUrl);
    this.contractId = process.env.SAVECIRCLE_CONTRACT_ID || 'CDSNM3LJEEDHPHKQBEUA5FS42SUMAWTEEKWHAIVWJYYYT6QY3B5HNYNB';
    this.usdcTokenId = process.env.USDC_TOKEN_CONTRACT_ID || 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';
    this.networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;
  }

  getNetworkConfig() {
    return {
      network: 'TESTNET',
      rpcUrl: process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org',
      networkPassphrase: this.networkPassphrase,
      contractId: this.contractId,
      usdcTokenId: this.usdcTokenId,
      explorerBaseUrl: 'https://stellar.expert/explorer/testnet',
    };
  }

  async verifyTransaction(txHash: string): Promise<{ success: boolean; ledger?: number; status: string }> {
    try {
      const tx = await this.server.getTransaction(txHash);
      if (tx.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        return {
          success: true,
          ledger: tx.ledger,
          status: 'SUCCESS',
        };
      }
      return {
        success: false,
        status: tx.status,
      };
    } catch (err: any) {
      this.logger.warn(`Error verifying tx ${txHash}: ${err.message}`);
      return {
        success: false,
        status: 'NOT_FOUND_OR_PENDING',
      };
    }
  }

  async getLatestLedger(): Promise<number> {
    try {
      const latest = await this.server.getLatestLedger();
      return latest.sequence;
    } catch {
      return 0;
    }
  }
}
