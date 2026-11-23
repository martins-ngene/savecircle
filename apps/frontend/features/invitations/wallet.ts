import { apiRequest } from "@/lib/api";
import type { WalletSession } from "@/lib/wallet-session";

export async function connectFreighter(): Promise<WalletSession> {
  const wallet = await import("@stellar/freighter-api");
  if (!(await wallet.isConnected()).isConnected) {
    throw new Error("Install and unlock the Freighter browser extension, then try again.");
  }

  const { address, error } = await wallet.requestAccess();
  if (error || !address) throw new Error("Freighter access was declined or unavailable. Unlock your wallet and try again.");

  const { message } = await apiRequest<{ message: string }>("auth/challenge", { body: { walletAddress: address } });
  const result = await wallet.signMessage(message, { address });
  if (result.error || !result.signedMessage || result.signerAddress !== address) {
    throw new Error("Sign the login message in Freighter with the connected account to continue.");
  }

  const signature = typeof result.signedMessage === "string" ? result.signedMessage : result.signedMessage.toString("base64");
  return apiRequest<WalletSession>("auth/verify", { body: { walletAddress: address, signature, message } });
}
