import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// snarkjs / ffjavascript y @stellar/stellar-sdk asumen algunos builtins de Node
// (buffer, process, crypto, stream…). nodePolyfills los provee en el navegador.
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  // Lee el .env de la raíz del monorepo (VITE_* compartidas con el backend).
  envDir: repoRoot,
  server: { port: 5173 },
  optimizeDeps: {
    // snarkjs trae wasm/ESM que conviene no pre-bundlear de forma agresiva.
    exclude: ["snarkjs"],
  },
});
