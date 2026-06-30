// Flujo completo de Capa 1 desde el frontend:
//   wallet -> consentimiento -> DNI -> datos -> cara -> [enroll + prueba ZK + on-chain]
//   -> is_verified == true.
//
// Privacidad: la PII (imágenes) va al gate y no se persiste; el `secret` se genera y queda
// en el device; on-chain sólo van commitment/proof/nullifier/issuerRoot.
//
// Anti-Sybil (dos candados, ambos visibles):
//   1) de-dup por documento en el issuer  -> "este documento ya fue validado".
//   2) nullifier on-chain en verify_and_register -> "este humano ya tiene identidad".
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Consent } from "./Consent";
import { DocumentUpload } from "./DocumentUpload";
import { Attributes, type AttributesInput } from "./Attributes";
import { FaceScan } from "./FaceScan";
import { connectWallet, ensureFunded } from "./wallet";
import { enroll, verifyDocumentData } from "./api";
import { computeCommitment, generateProof, randomSecret, type GeneratedProof } from "./zk";
import { initIfNeeded, isVerified, verifyAndRegister, ContractError } from "./chain";
import { CONTRACT_ID } from "./stellar";
import { loadCredential, saveCredential, type StoredCredential } from "./credentialStore";

type Step = "connect" | "checking" | "already" | "consent" | "document" | "attributes" | "scan" | "processing" | "done" | "error";

const REASON: Record<string, string> = {
  already_enrolled: "Este documento ya fue validado (anti-Sybil). No puede crear otra identidad.",
  face_mismatch: "La cara no coincide con la del documento.",
  no_liveness_motion: "No se detectó vivacidad (parpadeo/giro).",
  not_an_id_document: "La imagen no es un documento de identidad.",
  no_face_in_document: "No se detecta cara en el documento.",
  no_face_in_selfie: "No se detecta tu cara en el escaneo.",
  data_mismatch: "Los datos declarados no coinciden con el DNI.",
  document_unreadable: "No se pudo leer el documento (subí una foto más nítida).",
};

// Por qué se rebota un DNI (cotejo de datos): nombres de campo → texto.
const DATA_REASON: Record<string, string> = {
  doc_number: "el número de documento",
  birth_year: "el año de nacimiento",
  country: "el país",
  document_unreadable: "no se pudo leer el documento",
  not_an_id_document: "no parece un documento de identidad",
  no_face_in_document: "no se detecta la cara en el documento",
};

export function KycFlow({
  onDone,
  mode = "wallet",
}: { onDone?: () => void; mode?: "wallet" | "credential" } = {}) {
  // mode "wallet": flujo completo (conecta wallet + registra on-chain).
  // mode "credential": onboarding Pollar — solo crea la credencial ZK client-side (matcher),
  // sin conectar wallet ni firmar/registrar on-chain (Pollar ya creó la wallet por email).
  const [step, setStep] = useState<Step>(mode === "credential" ? "consent" : "connect");
  const [address, setAddress] = useState<string | null>(null);
  const [doc, setDoc] = useState<Blob | null>(null);
  const [attrs, setAttrs] = useState<AttributesInput | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [lastProof, setLastProof] = useState<GeneratedProof | null>(null);
  const [nullifierMsg, setNullifierMsg] = useState<string | null>(null);
  const [bounce, setBounce] = useState<string | null>(null);

  function fail(m: string) {
    setError(m);
    setStep("error");
  }

  // Anti-fraude: tras declarar los datos, se cotejan contra el DNI. Si no coinciden,
  // se "rebota" el DNI (vuelve al paso de subida) para cargar uno válido que coincida.
  async function onAttributes(a: AttributesInput) {
    setAttrs(a);
    if (!doc) return setStep("document");
    setStep("processing");
    setMsg("Cotejando tus datos con el DNI…");
    try {
      const r = await verifyDocumentData(doc, a);
      if (r.ok) return setStep("scan");
      const why = (r.mismatches.length ? r.mismatches : r.reasons).map((x) => DATA_REASON[x] ?? x).join(", ");
      setDoc(null);
      setBounce(`El DNI no coincide con tus datos (${why}). Subí un documento válido cuyos datos coincidan.`);
      setStep("document");
    } catch (e) {
      fail("No se pudo cotejar el documento: " + (e as Error).message);
    }
  }

  async function onConnect() {
    try {
      const addr = await connectWallet();
      setAddress(addr);
      setStep("checking");
      // Testnet: si la wallet es nueva (no fondeada), la fondeamos automáticamente. Si falla
      // (red caída, etc.) seguimos igual: el error real va a salir más claro al registrar.
      await ensureFunded(addr).catch(() => {});
      // Anti-Sybil temprano: si esta wallet YA tiene identidad, no se permite re-validar.
      let already = false;
      try {
        already = await isVerified(addr);
      } catch {
        already = false; // si el chequeo falla (red/contrato), no bloqueamos el alta
      }
      setStep(already ? "already" : "consent");
    } catch (e) {
      fail("No se pudo conectar la wallet: " + (e as Error).message);
    }
  }

  // Onboarding Pollar (credential): matcher → credencial ZK client-side, sin wallet ni on-chain.
  async function processCredentialOnly(frames: Blob[]) {
    if (!doc || !attrs) return fail("Faltan datos del flujo.");
    setStep("processing");
    try {
      let cred: StoredCredential | null = loadCredential(attrs.docId);
      if (!cred) {
        setMsg("Generando tu secreto e identidad (en el dispositivo)…");
        const secret = randomSecret();
        const commitment = await computeCommitment(attrs, secret);
        setMsg("Validando documento + cara y registrando en el issuer…");
        const en = await enroll(doc, frames, commitment, {
          docId: attrs.docId,
          birthYear: attrs.birthYear,
          countryCode: attrs.countryCode,
        });
        if (!en.ok) return fail(en.reasons.map((r) => REASON[r] ?? r).join(" "));
        cred = {
          attributes: attrs,
          secret,
          issuerRoot: en.issuerRoot!,
          pathElements: en.pathElements!,
          pathIndices: en.pathIndices!,
        };
        saveCredential(attrs.docId, cred);
      }
      setVerified(true);
      setStep("done");
    } catch (e) {
      fail((e as Error).message);
    }
  }

  async function process(frames: Blob[]) {
    if (mode === "credential") return processCredentialOnly(frames);
    if (!doc || !attrs || !address) return fail("Faltan datos del flujo.");
    setStep("processing");
    try {
      // Reanudar desde una credencial guardada (evita re-enrolar y el de-dup).
      let cred: StoredCredential | null = loadCredential(attrs.docId);
      if (cred) {
        setMsg("Recuperando tu credencial guardada en este dispositivo…");
      } else {
        setMsg("Generando tu secreto e identidad (en el dispositivo)…");
        const secret = randomSecret();
        const commitment = await computeCommitment(attrs, secret);

        setMsg("Validando documento + cara y registrando en el issuer…");
        const en = await enroll(doc, frames, commitment, {
          docId: attrs.docId,
          birthYear: attrs.birthYear,
          countryCode: attrs.countryCode,
        });
        if (!en.ok) {
          if (en.reasons.includes("already_enrolled")) {
            return fail(
              "Este documento ya fue validado en otra sesión/dispositivo y no tenemos tu credencial acá. " +
                "Usá “Ver mi estado” con tu wallet; si necesitás re-validar, pedí un reset del issuer.",
            );
          }
          return fail(en.reasons.map((r) => REASON[r] ?? r).join(" "));
        }
        cred = {
          attributes: attrs,
          secret,
          issuerRoot: en.issuerRoot!,
          pathElements: en.pathElements!,
          pathIndices: en.pathIndices!,
        };
        saveCredential(attrs.docId, cred); // resumible si falla el on-chain
      }

      setMsg("Generando la prueba ZK en tu dispositivo (la PII no sale)…");
      const gen = await generateProof(
        cred.attributes,
        cred.secret,
        cred.pathElements,
        cred.pathIndices,
        address,
      );
      setLastProof(gen);

      setMsg("Inicializando el registro on-chain si hace falta (firmá en la wallet)…");
      await initIfNeeded(address, cred.issuerRoot);

      setMsg("Registrando en Stellar — firmá en tu wallet…");
      let hash: string;
      try {
        hash = await verifyAndRegister(address, gen);
      } catch (e) {
        if (e instanceof ContractError && e.code === 3) {
          return fail("Este humano ya tiene identidad (rechazo on-chain por nullifier).");
        }
        throw e;
      }
      setTxHash(hash);

      setMsg("Confirmando on-chain…");
      setVerified(await isVerified(address));
      setStep("done");
    } catch (e) {
      fail((e as Error).message);
    }
  }

  // Demuestra el segundo candado: reenviar la misma prueba -> nullifier ya usado.
  async function retryRegister() {
    if (!address || !lastProof) return;
    setNullifierMsg("Reenviando la misma prueba…");
    try {
      await verifyAndRegister(address, lastProof);
      setNullifierMsg("(inesperado) se registró de nuevo.");
    } catch (e) {
      setNullifierMsg(
        e instanceof ContractError && e.code === 3
          ? "✅ Rechazado on-chain: " + e.message
          : "Error: " + (e as Error).message,
      );
    }
  }

  if (step === "connect")
    return (
      <section className="bh-card">
        <p className="bh-eyebrow">Verificación de identidad</p>
        <h2 className="bh-h2">Conectá tu wallet</h2>
        <p className="bh-sub">
          Vas a verificar que sos una persona real y única. Tu identidad queda registrada de
          forma anónima; nunca publicamos tus datos.
        </p>
        {!CONTRACT_ID && (
          <p className="bh-note bh-note--err">⚠️ Falta configurar el contrato verificador.</p>
        )}
        <div className="bh-actions">
          <Button onClick={onConnect}>Conectar wallet</Button>
        </div>
      </section>
    );

  if (step === "checking")
    return (
      <section className="bh-card">
        <h2 className="bh-h2">Un segundo…</h2>
        <p className="bh-sub">Comprobando si esta wallet ya tiene una identidad verificada.</p>
      </section>
    );

  if (step === "already")
    return (
      <section className="bh-card">
        <h2 className="bh-h2">✅ Ya estás verificado</h2>
        <p className="bh-sub">
          Esta wallet <strong>ya tiene una identidad verificada</strong>. No hace falta validar
          de nuevo: cada persona tiene una sola identidad.
        </p>
        <div className="bh-actions">
          {onDone ? (
            <Button onClick={onDone}>Entrar a la app</Button>
          ) : (
            <Button onClick={() => window.location.reload()}>Volver al inicio</Button>
          )}
        </div>
      </section>
    );

  if (step === "consent") return <Consent onAccept={() => setStep("document")} />;
  if (step === "document")
    return (
      <DocumentUpload
        notice={bounce}
        onNext={(d) => { setDoc(d); setBounce(null); setStep("attributes"); }}
      />
    );
  if (step === "attributes") return <Attributes onNext={onAttributes} />;
  if (step === "scan") return <FaceScan onCaptured={process} />;

  if (step === "processing")
    return (
      <section className="bh-card">
        <h2 className="bh-h2">Procesando…</h2>
        <p className="bh-sub">{msg}</p>
        <p className="bh-note">Puede pedirte firmar en la wallet.</p>
      </section>
    );

  if (step === "error")
    return (
      <section className="bh-card">
        <h2 className="bh-h2">No pudimos verificarte</h2>
        <p className="bh-sub">{error}</p>
        <div className="bh-actions">
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </section>
    );

  // done
  return (
    <section className="bh-card">
      <p className="bh-eyebrow">Listo</p>
      <h2 className="bh-h2">{verified ? "✅ Sos un humano verificado" : "Registrado (confirmando…)"}</h2>
      <p className="bh-sub">
        Tu identidad quedó verificada de forma anónima. Ya podés participar sin revelar quién sos.
      </p>
      {txHash && (
        <p className="bh-note">
          <a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} target="_blank" rel="noreferrer" className="bh-back">
            Ver el comprobante on-chain
          </a>
        </p>
      )}
      <div className="bh-actions">
        {onDone && <Button onClick={onDone}>Entrar a la app</Button>}
        {mode === "wallet" && lastProof && (
          <Button variant="ghost" onClick={retryRegister}>
            Probar el candado anti-duplicados
          </Button>
        )}
      </div>
      {nullifierMsg && <p className="bh-note">{nullifierMsg}</p>}
    </section>
  );
}
