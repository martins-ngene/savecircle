import { Address, BASE_FEE, Contract, nativeToScVal, Networks, rpc, scValToNative, StrKey, TransactionBuilder, xdr } from "@stellar/stellar-sdk";
import { apiRequest } from "./api";

type BlockchainConfig = {
  network: string;
  networkPassphrase: string;
  rpcUrl: string;
  contractId: string;
  usdcTokenId: string;
  explorerBaseUrl: string;
};

type Invocation =
  | { method: "create_group"; name: string; contributionAmount: string; totalMembers: number; cycleDurationLedgers: number; approvalThreshold: number }
  | { method: "register_member"; groupId: number; member: string; rotationPosition: number }
  | { method: "accept_rules"; groupId: number }
  | { method: "contribute"; groupId: number; cycleIndex: number; amount: string }
  | { method: "execute_payout"; groupId: number; cycleIndex: number }
  | { method: "request_withdrawal"; groupId: number; amount: string; recipient: string }
  | { method: "approve_withdrawal" | "execute_withdrawal"; groupId: number; requestId: number };

type Query =
  | { method: "get_group"; groupId: number }
  | { method: "get_member"; groupId: number; member: string };

type TransactionStatus = { success: boolean; status: string; ledger?: number };
const hashPattern = /^[a-f0-9]{64}$/i;

export async function getBlockchainConfig(signal?: AbortSignal) {
  const config = await apiRequest<BlockchainConfig>("blockchain/config", { signal });
  if (config.network !== "TESTNET" || config.networkPassphrase !== Networks.TESTNET ||
      new URL(config.rpcUrl).protocol !== "https:" ||
      !StrKey.isValidContract(config.contractId) || !StrKey.isValidContract(config.usdcTokenId)) {
    throw new Error("SaveCircle requires a valid Stellar Testnet configuration.");
  }
  return config;
}

export function getTransactionStatus(hash: string, signal?: AbortSignal) {
  if (!hashPattern.test(hash)) throw new Error("Enter a valid Stellar transaction hash.");
  return apiRequest<TransactionStatus>(`blockchain/tx/${hash.toLowerCase()}`, { signal });
}

function uint(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 0xffffffff) throw new Error("Invalid Stellar group, cycle, or position.");
  return nativeToScVal(value, { type: "u32" });
}

function account(value: string) {
  if (!StrKey.isValidEd25519PublicKey(value)) throw new Error("Enter a valid Stellar account address.");
  return Address.fromString(value).toScVal();
}

function usdc(value: string) {
  const match = /^(\d+)(?:\.(\d{1,7}))?$/.exec(value.trim());
  if (!match) throw new Error("Enter a USDC amount with up to seven decimal places.");
  const units = BigInt(match[1]) * BigInt(10_000_000) + BigInt((match[2] ?? "").padEnd(7, "0"));
  if (units <= 0 || units >= (BigInt(1) << BigInt(127))) throw new Error("Enter a positive USDC amount within Stellar’s supported range.");
  return nativeToScVal(units, { type: "i128" });
}

function invocationArgs(wallet: string, config: BlockchainConfig, request: Invocation): xdr.ScVal[] {
  const signer = account(wallet);
  switch (request.method) {
    case "create_group": return [signer, nativeToScVal(request.name, { type: "string" }), Address.fromString(config.usdcTokenId).toScVal(),
      usdc(request.contributionAmount), uint(request.totalMembers), uint(request.cycleDurationLedgers), uint(request.approvalThreshold)];
    case "register_member": return [signer, uint(request.groupId), account(request.member), uint(request.rotationPosition)];
    case "accept_rules": return [signer, uint(request.groupId)];
    case "contribute": return [signer, uint(request.groupId), uint(request.cycleIndex), usdc(request.amount)];
    case "execute_payout": return [signer, uint(request.groupId), uint(request.cycleIndex)];
    case "request_withdrawal": return [signer, uint(request.groupId), usdc(request.amount), account(request.recipient)];
    case "approve_withdrawal":
    case "execute_withdrawal": return [signer, uint(request.groupId), uint(request.requestId)];
  }
}

export async function readSoroban(wallet: string, request: Query, signal?: AbortSignal): Promise<unknown> {
  if (!StrKey.isValidEd25519PublicKey(wallet)) throw new Error("Connect a valid Stellar wallet.");
  const config = await getBlockchainConfig(signal);
  const groupId = uint(request.groupId);
  const keyParts = request.method === "get_group"
    ? [xdr.ScVal.scvSymbol("GroupConfig"), groupId]
    : [xdr.ScVal.scvSymbol("Member"), groupId, account(request.member)];
  const key = xdr.LedgerKey.contractData(new xdr.LedgerKeyContractData({
    contract: Address.fromString(config.contractId).toScAddress(),
    key: xdr.ScVal.scvVec(keyParts),
    durability: xdr.ContractDataDurability.persistent(),
  }));
  signal?.throwIfAborted();
  const { entries } = await new rpc.Server(config.rpcUrl, { timeout: 10 }).getLedgerEntries(key);
  signal?.throwIfAborted();
  return entries.length ? scValToNative(entries[0].val.contractData().val()) : null;
}

type Submission = { hash: string; status: "SUCCESS" | "PENDING" };
type Options = { onSubmitted?: (hash: string) => void; signal?: AbortSignal };

export async function invokeSoroban(wallet: string, request: Invocation, { onSubmitted, signal }: Options = {}): Promise<Submission> {
  const config = await getBlockchainConfig(signal);
  const args = invocationArgs(wallet, config, request);
  const freighter = await import("@stellar/freighter-api");
  const network = await freighter.getNetwork();
  if (network.error || network.networkPassphrase !== config.networkPassphrase) {
    throw new Error("Unlock Freighter and switch to Stellar Testnet before signing.");
  }

  const rpcServer = new rpc.Server(config.rpcUrl, { timeout: 12 });
  let source;
  try {
    source = await rpcServer.getAccount(wallet);
  } catch {
    throw new Error("Could not load this Stellar Testnet account. Check the wallet and its Testnet XLM balance.");
  }
  const operation = new Contract(config.contractId).call(request.method, ...args);
  const draft = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: config.networkPassphrase })
    .addOperation(operation).setTimeout(180).build();
  let prepared;
  try {
    prepared = await rpcServer.prepareTransaction(draft);
  } catch (error) {
    throw new Error(`Stellar could not simulate this action. ${error instanceof Error ? error.message : "Check the group state and wallet balances."}`);
  }

  signal?.throwIfAborted();
  const proof = await freighter.signTransaction(prepared.toXDR(), { networkPassphrase: config.networkPassphrase, address: wallet });
  if (proof.error || !proof.signedTxXdr || proof.signerAddress !== wallet) {
    throw new Error("Approve the transaction in Freighter with the connected wallet to continue.");
  }
  const signed = TransactionBuilder.fromXDR(proof.signedTxXdr, config.networkPassphrase);
  const hash = signed.hash().toString("hex");
  if (hash !== prepared.hash().toString("hex") || !signed.signatures.length) {
    throw new Error("Freighter returned a different or unsigned transaction.");
  }

  signal?.throwIfAborted();
  let submission: rpc.Api.SendTransactionResponse;
  try {
    submission = await rpcServer.sendTransaction(signed);
  } catch {
    onSubmitted?.(hash);
    return { hash, status: "PENDING" };
  }
  if (submission.status === "TRY_AGAIN_LATER") throw new Error("Stellar RPC is busy. Try the transaction again shortly.");
  if (submission.status === "ERROR") {
    const code = submission.errorResult?.result().switch().name;
    throw new Error(`Stellar rejected the submission${code ? ` (${code})` : ""}. Refresh the circle before retrying.`);
  }

  onSubmitted?.(hash);
  for (let attempt = 0; attempt < 7; attempt++) {
    if (signal?.aborted) break;
    const status = await getTransactionStatus(hash, signal).catch(() => null);
    if (status?.success) return { hash, status: "SUCCESS" };
    if (status?.status === "FAILED") throw new Error("Stellar did not confirm the transaction. Check its status before retrying.");
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
  return { hash, status: "PENDING" };
}
