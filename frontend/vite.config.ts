/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // Fixe le fuseau des tests : les assertions sur les dates/heures formatées
    // supposent un rendu en UTC (comme les runners CI), indépendamment du
    // fuseau de la machine qui exécute `npm run test`.
    env: { TZ: "UTC" },
  },
});
