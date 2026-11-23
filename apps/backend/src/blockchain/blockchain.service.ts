import { BadRequestException, ConflictException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Address, rpc, Networks, scValToNative, TransactionBuilder } from '@stellar/stellar-sdk';
import { Prisma } from '@prisma/client';

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

  async verifyGroupCreation(hash: string, expected: {
    organizerWallet: string;
    name: string;
    usdcToken: string;
    contributionAmount: Prisma.Decimal;
    totalMembers: number;
    approvalThreshold: number;
  }): Promise<number> {
    let result: rpc.Api.GetTransactionResponse;
    try {
      result = await this.server.getTransaction(hash);
    } catch {
      throw new ServiceUnavailableException('Stellar transaction lookup is unavailable. Retry linking with the same hash.');
    }
    if (result.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
      throw new ConflictException('The group creation transaction is not available yet. Check its status before submitting again.');
    }
    if (result.status !== rpc.Api.GetTransactionStatus.SUCCESS || result.feeBump) {
      throw new BadRequestException('Expected a successful SaveCircle group creation transaction');
    }
    const transaction = TransactionBuilder.fromXDR(result.envelopeXdr, this.networkPassphrase);
    const operations = 'operations' in transaction ? transaction.operations : [];
    const operation = operations[0];
    if (operations.length !== 1 || operation?.type !== 'invokeHostFunction' || operation.func.switch().name !== 'hostFunctionTypeInvokeContract') {
      throw new BadRequestException('Expected a single SaveCircle contract invocation');
    }
    const invocation = operation.func.invokeContract();
    const args = invocation.args().map(scValToNative);
    const amount = expected.contributionAmount.mul(10_000_000).toFixed();
    if (Address.fromScAddress(invocation.contractAddress()).toString() !== this.contractId ||
      invocation.functionName().toString() !== 'create_group' || args.length !== 7 ||
      args[0] !== expected.organizerWallet || args[1] !== expected.name || args[2] !== expected.usdcToken ||
      String(args[3]) !== amount || args[4] !== expected.totalMembers || args[6] !== expected.approvalThreshold) {
      throw new BadRequestException('The on-chain group does not match this savings circle');
    }
    if (result.returnValue?.switch().name !== 'scvU32' || result.returnValue.u32() === 0) {
      throw new BadRequestException('The transaction did not return a group ID');
    }
    return result.returnValue.u32();
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
