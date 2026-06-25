import { defineConfig } from "vitest/config";

// snarkjs/ffjavascript crean Workers para el motor BLS12-381; el pool por defecto
// (worker_threads) rompe los workers anidados. `forks` corre cada test en un proceso
// hijo, donde la generación de pruebas funciona.
export default defineConfig({
  test: {
    pool: "forks",
    testTimeout: 60000,
  },
});
