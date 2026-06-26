// Cliente del backend de Funding ZK (CAPA 3). Campañas, donación anónima, posición
// (yield), hitos, release 2-de-3, refund todo-o-nada y opiniones por campaña.
import type { Campaign, CampaignOpinion, Sentiment } from "@behuman/shared";

const BASE = import.meta.env.VITE_FUNDING_API_URL ?? "http://localhost:8789";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}
const post = (path: string, body: unknown) =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export async function listCampaigns(): Promise<Campaign[]> {
  return json(await fetch(`${BASE}/campaigns`));
}

export interface MembershipProof {
  proof: unknown;
  publicSignals: string[];
}

export async function donate(
  campaignId: string,
  donorWallet: string,
  amount: string,
  membershipProof: MembershipProof,
): Promise<{ ok: boolean; raisedAmount?: string; xdr?: string }> {
  return json(await post(`/campaigns/${campaignId}/donate`, { donorWallet, amount, membershipProof }));
}

export interface Position {
  shares: string;
  underlying: string;
  apy: number;
}
export async function getPosition(campaignId: string, wallet: string): Promise<Position> {
  return json(await fetch(`${BASE}/campaigns/${campaignId}/position?wallet=${encodeURIComponent(wallet)}`));
}

export async function approveMilestone(campaignId: string, milestoneId: string, approver: string) {
  return json(await post(`/campaigns/${campaignId}/milestones/${milestoneId}/approve`, { approver }));
}

export async function release(campaignId: string, signers: string[]) {
  return json<{ ok: boolean; state: string; txHash: string; capitalPlusYield: string }>(
    await post(`/campaigns/${campaignId}/release`, { signers }),
  );
}

export async function refund(campaignId: string, donorWallet: string) {
  return json<{ ok: boolean; refundedTo: string; amount: string }>(
    await post(`/campaigns/${campaignId}/refund`, { donorWallet }),
  );
}

export interface OpinionProof {
  proof: unknown;
  publicSignals: string[]; // [issuerRoot, platformId, nullifier, scope, nullScope, contentHash]
}

export async function postOpinion(
  campaignId: string,
  content: string,
  sentiment: Sentiment,
  opinionProof: OpinionProof,
  txHash?: string,
): Promise<CampaignOpinion> {
  return json(await post(`/campaigns/${campaignId}/opinions`, { content, sentiment, opinionProof, txHash }));
}

export async function getOpinions(
  campaignId: string,
): Promise<{ opinions: CampaignOpinion[]; sentiment: { support: number; oppose: number } }> {
  return json(await fetch(`${BASE}/campaigns/${campaignId}/opinions`));
}
