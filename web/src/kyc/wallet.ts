// Conexión de wallet vía Stellar Wallets Kit (Freighter, xBull, LOBSTR…).
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
} from "@creit.tech/stellar-wallets-kit";

const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  selectedWalletId: FREIGHTER_ID,
  modules: allowAllModules(),
});

/** Abre el modal de selección de wallet y devuelve el address conectado. */
export async function connectWallet(): Promise<string> {
  return new Promise((resolve, reject) => {
    kit
      .openModal({
        onWalletSelected: async (option) => {
          try {
            kit.setWallet(option.id);
            const { address } = await kit.getAddress();
            resolve(address);
          } catch (e) {
            reject(e as Error);
          }
        },
        onClosed: (err) => reject(err ?? new Error("modal cerrado")),
      })
      .catch(reject);
  });
}

/** Firma un XDR con la wallet conectada; devuelve el XDR firmado. */
export async function signXdr(xdr: string, networkPassphrase: string): Promise<string> {
  const { signedTxXdr } = await kit.signTransaction(xdr, { networkPassphrase });
  return signedTxXdr;
}
