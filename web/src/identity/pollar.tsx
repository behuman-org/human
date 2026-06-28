// Integración de Pollar SOLO como onboarding amigable: crear una wallet Stellar con email.
//
// ⚠️ Pollar (login email) es CUSTODIAL: genera/guarda la clave en su server. Por eso NUNCA
// firma nada de beHuman ni participa del anonimato. Acá lo usamos exclusivamente para que un
// usuario sin wallet cree una cuenta de forma fácil. El anonimato ZK no depende de Pollar:
//   - el `secret` (raíz del anonimato) se genera/guarda SOLO client-side (credentialStore),
//   - `platformId = Poseidon(secret, scope)` se deriva en el navegador,
//   - las acciones anónimas usan wallets EFÍMERAS (friendbot), nunca la wallet de Pollar,
//   - el email vive solo en Pollar; beHuman no lo guarda ni lo mapea a platformId.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PollarProvider, usePollar } from "@pollar/react";
import "@pollar/react/styles.css";
import { Button } from "../components/ui/Button";

const POLLAR_KEY = import.meta.env.VITE_POLLAR_PUBLISHABLE_KEY ?? "";
/** Pollar disponible solo si hay key configurada (testnet por prefijo de la key). */
export const POLLAR_ENABLED = POLLAR_KEY.length > 0;

/** Monta el PollarProvider solo si está configurado; si no, no envuelve nada. */
export function PollarRoot({ children }: { children: ReactNode }) {
  if (!POLLAR_ENABLED) return <>{children}</>;
  // O2: sin override de appConfig → el modal refleja los métodos REALES habilitados en el
  // dashboard de Pollar (email/Google/…) y usa los estilos/logo reales de la app.
  return (
    <PollarProvider client={{ apiKey: POLLAR_KEY, stellarNetwork: "testnet" }}>
      {children}
    </PollarProvider>
  );
}

/**
 * Botón "Crear cuenta con email": abre el modal de Pollar (email + código). Cuando la wallet
 * queda creada (isAuthenticated), llama onReady(). NO usamos la wallet para nada más.
 * Solo se renderiza dentro de <PollarRoot> (cuando POLLAR_ENABLED).
 */
export function PollarEmailLogin({ onReady }: { onReady: () => void }) {
  const { openLoginModal, isAuthenticated, verified } = usePollar();
  const [requested, setRequested] = useState(false);
  const fired = useRef(false);

  // O1: avanzamos al onboarding apenas la SESIÓN está confirmada (isAuthenticated || verified),
  // SIN esperar a que Pollar termine de crear/provisionar la wallet (no la necesitamos para el
  // flujo anónimo). Evita quedar trabado en el "Loading..." del provisioning de la wallet.
  useEffect(() => {
    if (requested && (isAuthenticated || verified) && !fired.current) {
      fired.current = true;
      onReady();
    }
  }, [requested, isAuthenticated, verified, onReady]);

  return (
    <Button
      variant="secondary"
      onClick={() => {
        setRequested(true);
        openLoginModal();
      }}
    >
      Crear cuenta con Google o email
    </Button>
  );
}
