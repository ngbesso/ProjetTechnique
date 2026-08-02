// Chargé avant chaque fichier de test (voir `test.setupFiles` dans
// vite.config.ts) : ajoute les matchers DOM de jest-dom (toBeInTheDocument,
// toHaveValue…) et remet à zéro le DOM entre deux tests.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom n'implémente pas matchMedia, dont SiteHeader se sert pour refermer le
// panneau mobile au retour en format bureau. Doublure inerte : elle ne déclenche
// jamais de changement de palier, ce qui correspond à un viewport fixe.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => {
  cleanup();
});
