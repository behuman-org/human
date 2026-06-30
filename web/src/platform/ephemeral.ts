// Cuenta efímera para pagar el fee on-chain — NUNCA el address del KYC.
// Se genera al vuelo y se fondea con friendbot (testnet). No tiene relación con la
// identidad del KYC: rompe el link address-KYC <-> actividad de plataforma.
import * as StellarSdk from "@stellar/stellar-sdk";
import { rpc } from "./stellar2";

const FRIENDBOT = import.meta.env.VITE_FRIENDBOT_URL ?? "https://friendbot.stellar.org";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function createFundedEphemeral(): Promise<StellarSdk.Keypair> {
  const kp = StellarSdk.Keypair.random();
  const res = await fetch(`${FRIENDBOT}?addr=${encodeURIComponent(kp.publicKey())}`);
  if (!res.ok) throw new Error(`friendbot no pudo fondear la cuenta efímera (${res.status})`);
  await res.json().catch(() => null);
  // friendbot confirma el envío, pero el RPC puede tardar en reflejar la cuenta nueva
  // (consistencia eventual) → "Account not found". Esperamos a que sea visible antes de usarla.
  for (let i = 0; i < 20; i++) {
    try {
      await rpc.getAccount(kp.publicKey());
      return kp;
    } catch {
      await sleep(1000);
    }
  }
  throw new Error("la cuenta efímera no apareció en el RPC tras el fondeo");
}

const STORAGE_KEY = "behuman.ephemeral.secret";

function loadStoredEphemeral(): StellarSdk.Keypair | null {
  try {
    const secret = localStorage.getItem(STORAGE_KEY);
    return secret ? StellarSdk.Keypair.fromSecret(secret) : null;
  } catch {
    return null;
  }
}

function storeEphemeral(kp: StellarSdk.Keypair): void {
  try {
    localStorage.setItem(STORAGE_KEY, kp.secret());
  } catch {
    /* sin storage disponible: se recreará una efímera nueva en la próxima sesión */
  }
}

/**
 * Cuenta efímera reutilizable, persistida en este device. Antes se creaba (y fondeaba con
 * friendbot) una cuenta NUEVA en cada publicación: el primer post de cada identidad encadena
 * 3 tx reales (init + register_identity + post) desde una cuenta recién fondeada, y la
 * consistencia eventual del RPC de testnet (la cuenta nueva tarda en reflejar su secuencia
 * actualizada entre tx) producía `txBadSeq` seguido — el usuario veía que tenía que reintentar
 * "publicar" 2-3 veces hasta que las 3 tx terminaban de encadenarse. Reusar la MISMA cuenta
 * efímera entre publicaciones no compromete el anonimato (el platformId ya es el seudónimo
 * público en cada post) y deja el `post` normal en una sola tx, sin re-fondear ni re-crear
 * cuenta cada vez.
 */
export async function getOrCreateFundedEphemeral(): Promise<StellarSdk.Keypair> {
  const stored = loadStoredEphemeral();
  if (stored) {
    try {
      await rpc.getAccount(stored.publicKey());
      return stored;
    } catch {
      // La cuenta guardada no existe en este RPC/red (ej. testnet reseteado): se recrea abajo.
    }
  }
  const kp = await createFundedEphemeral();
  storeEphemeral(kp);
  return kp;
}
