// Config Stellar para el frontend (testnet por defecto).
import * as StellarSdk from "@stellar/stellar-sdk";

export const RPC_URL = import.meta.env.VITE_STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE =
  import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE ?? StellarSdk.Networks.TESTNET;
export const CONTRACT_ID = import.meta.env.VITE_KYC_VERIFIER_CONTRACT_ID ?? "";

export const rpc = new StellarSdk.rpc.Server(RPC_URL, {
  allowHttp: RPC_URL.startsWith("http://"),
});
