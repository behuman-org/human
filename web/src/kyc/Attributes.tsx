// Datos declarados (testnet). En producción los atesta RENAPER/OCR.
// El nº de documento se usa SOLO para el de-dup (hash con pepper); nunca se guarda en claro.
import { useState } from "react";

export interface AttributesInput {
  birthYear: number;
  countryCode: number; // ISO 3166-1 numérico (coincide con el circuito)
  docId: string;
}

const COUNTRIES = [
  { code: 32, name: "Argentina" },
  { code: 76, name: "Brasil" },
  { code: 152, name: "Chile" },
  { code: 858, name: "Uruguay" },
];

export function Attributes({ onNext }: { onNext: (a: AttributesInput) => void }) {
  const [birthYear, setBirthYear] = useState("");
  const [countryCode, setCountryCode] = useState(32);
  const [docId, setDocId] = useState("");

  const year = Number(birthYear);
  const valid = year >= 1900 && year <= 2026 && docId.trim().length >= 4;

  return (
    <section className="app__card">
      <h2>3 · Tus datos</h2>
      <p>El circuito sólo prueba <strong>mayor de edad</strong> y <strong>país permitido</strong> — los valores no se publican.</p>
      <label style={{ display: "block", marginBottom: 8 }}>
        Año de nacimiento
        <input type="number" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="1995" />
      </label>
      <label style={{ display: "block", marginBottom: 8 }}>
        País
        <select value={countryCode} onChange={(e) => setCountryCode(Number(e.target.value))}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </label>
      <label style={{ display: "block", marginBottom: 8 }}>
        Nº de documento (para evitar duplicados; no se guarda)
        <input value={docId} onChange={(e) => setDocId(e.target.value)} placeholder="12345678" />
      </label>
      <button type="button" disabled={!valid} onClick={() => onNext({ birthYear: year, countryCode, docId: docId.trim() })}>
        Continuar al escaneo de cara
      </button>
    </section>
  );
}
