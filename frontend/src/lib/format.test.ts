import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatDateTime } from "./format";

describe("formatDate", () => {
    it("retourne un tiret pour une valeur absente", () => {
        expect(formatDate(null)).toBe("—");
        expect(formatDate(undefined)).toBe("—");
    });

    it("formate une date en fr-CA (jour, mois long, année)", () => {
        expect(formatDate("2026-07-24T12:00:00Z")).toBe("24 juillet 2026");
    });
});

describe("formatDateTime", () => {
    it("retourne un tiret pour une valeur absente", () => {
        expect(formatDateTime(null)).toBe("—");
        expect(formatDateTime(undefined)).toBe("—");
    });

    it("inclut l'année et l'heure (mois abrégé)", () => {
        const result = formatDateTime("2026-07-24T14:30:00Z");
        expect(result).toContain("2026");
        expect(result).toContain("juil");
        expect(result).toMatch(/14\s*h\s*30/);
    });
});

describe("formatCurrency", () => {
    it("formate un montant en CAD par défaut", () => {
        // Espace insécable entre le montant et le symbole selon l'ICU du
        // runtime : on vérifie le contenu plutôt qu'une égalité de chaîne exacte.
        expect(formatCurrency(12)).toMatch(/^12,00\s?\$$/);
    });

    it("gère le séparateur de milliers et les décimales", () => {
        expect(formatCurrency(1234.5)).toMatch(/^1\s?234,50\s?\$$/);
    });

    it("accepte une devise explicite (USD)", () => {
        const result = formatCurrency(12, "USD");
        expect(result).toContain("12,00");
        expect(result).toMatch(/\$/);
    });
});
