import { Address, nativeToScVal, rpc, scValToNative, xdr } from "@stellar/stellar-sdk";

type BlockchainConfig = { contractId: string; usdcTokenId: string; rpcUrl: string };

export const contractStatus = {
  activeMember: 2,
  paidCycle: 4,
  pendingWithdrawal: 1,
  approvedWithdrawal: 2,
  executedWithdrawal: 3,
  rejectedWithdrawal: 4,
} as const;

export type ChainGroup = {
  organizer: string;
  usdc_token: string;
  total_members: number;
  approval_threshold: number;
};
export type ChainMember = { status: number; rules_accepted: boolean };
export type ChainCycle = {
  cycle_index: number;
  recipient: string;
  target_amount: bigint;
  collected_amount: bigint;
  status: number;
};
export type ChainAccounting = { available_balance: bigint; total_funds_paid_out: bigint };
export type ChainWithdrawal = {
  request_id: number;
  requester: string;
  recipient: string;
  amount: bigint;
  approval_count: number;
  status: number;
};

export function uint(value: number) {
  return nativeToScVal(value, { type: "u32" });
}

export function storageKey(name: string, groupId: number, ...parts: xdr.ScVal[]) {
  return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(name), uint(groupId), ...parts]);
}

export function contractStorage(config: BlockchainConfig) {
  const server = new rpc.Server(config.rpcUrl, { timeout: 10 });
  const contract = Address.fromString(config.contractId).toScAddress();

  return async function read(keys: xdr.ScVal[]) {
    const ledgerKeys = keys.map((key) => xdr.LedgerKey.contractData(new xdr.LedgerKeyContractData({
      contract,
      key,
      durability: xdr.ContractDataDurability.persistent(),
    })));
    const { entries } = await server.getLedgerEntries(...ledgerKeys);
    const values = new Map(entries.map((entry) => {
      const data = entry.val.contractData();
      return [data.key().toXDR("base64"), scValToNative(data.val())];
    }));

    return function get<T>(key: xdr.ScVal) {
      return values.get(key.toXDR("base64")) as T | undefined;
    };
  };
}

export async function readChainCircle(config: BlockchainConfig, id: number, organizer: string, wallet: string) {
  if (!Number.isInteger(id) || id < 1 || id > 0xffffffff) throw new Error("Invalid on-chain circle ID.");
  const key = (name: string, ...parts: xdr.ScVal[]) => storageKey(name, id, ...parts);
  const read = contractStorage(config);
  const groupKey = key("GroupConfig");
  const memberKey = key("Member", Address.fromString(wallet).toScVal());
  const accountingKey = key("Accounting");
  const result = await read([groupKey, memberKey, accountingKey]);
  const group = result<ChainGroup>(groupKey);
  const accounting = result<ChainAccounting>(accountingKey);
  if (!group || !accounting) throw new Error("The linked group is unavailable on Stellar Testnet.");
  if (group.organizer !== organizer || group.usdc_token !== config.usdcTokenId) {
    throw new Error("The linked group’s organizer or token differs from the SaveCircle record.");
  }
  return { group, accounting, member: result<ChainMember>(memberKey), read, key };
}

export function displayUsdc(amount: bigint) {
  const units = amount.toString().padStart(8, "0");
  const fraction = units.slice(-7).replace(/0+$/, "").padEnd(2, "0");
  return `${units.slice(0, -7)}.${fraction} USDC`;
}

export function isActiveMember(member?: ChainMember) {
  return member?.status === contractStatus.activeMember && member.rules_accepted;
}
