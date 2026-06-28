// Onboarding de identidad (Capa 1): corre el flujo KYC-ZK real (wallet → DNI + cotejo
// anti-fraude → cara → prueba ZK → registro on-chain) con el diseño del producto.
// Al terminar, "Entrar a la app" entra al feed con la identidad ya derivada.
import { Link, useNavigate } from "react-router-dom";
import { brand } from "../content/brand";
import { KycFlow } from "../kyc/KycFlow";
import "../styles/tokens.css";
import "../styles/global.css";
import "../styles/behuman-ui.css";

export function OnboardingPage() {
  const navigate = useNavigate();
  return (
    <main className="bh">
      <div className="bh-shell">
        <div className="bh-topbar">
          <Link to="/" className="bh-back">← Inicio</Link>
          <img src={brand.logoHorizontal} alt={brand.wordmark} style={{ height: 40 }} />
        </div>
        <KycFlow onDone={() => navigate("/app")} />
      </div>
    </main>
  );
}
