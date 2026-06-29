/** Logos del marquee de tecnologías en `web/public/logos/`. */
export const techLogos: Record<string, string> = {
  stellar: "/logos/stellar.svg",
  soroban: "/logos/soroban.svg",
  "zk-proofs": "/logos/zk-proofs.svg",
  defindex: "/logos/defindex.svg",
  blend: "/logos/blend.png",
  "trustless-work": "/logos/trustless-work.ico",
  "stellar-wallets": "/logos/stellar-wallets.svg",
  pollar: "/logos/pollar.png",
};

export function getTechLogo(id: string): string | undefined {
  return techLogos[id];
}
