import { describe, expect, it } from "vitest";
import { renderTemplate, stripTokens } from "./template";

describe("renderTemplate", () => {
    it("remplace un jeton par sa valeur", () => {
        expect(renderTemplate("{eglises} Églises", { eglises: "12" })).toBe("12 Églises");
    });

    it("remplace toutes les occurrences d'un même jeton", () => {
        expect(renderTemplate("{n} et {n}", { n: "3" })).toBe("3 et 3");
    });

    it("laisse le texte intact quand il ne contient aucun jeton", () => {
        expect(renderTemplate("40 ans", { eglises: "12" })).toBe("40 ans");
    });

    it("laisse intacts les jetons absents des valeurs fournies", () => {
        expect(renderTemplate("{eglises} / {membres}", { eglises: "12" })).toBe("12 / {membres}");
    });

    it("ne casse pas sur une accolade littérale non appariée", () => {
        expect(renderTemplate("100 % { ok", { eglises: "12" })).toBe("100 % { ok");
    });
});

describe("stripTokens", () => {
    it("efface un jeton non substitué", () => {
        expect(stripTokens("{eglises}")).toBe("");
    });

    it("conserve le texte autour du jeton effacé", () => {
        expect(stripTokens("plus de {membres} membres")).toBe("plus de  membres");
    });

    it("laisse une valeur sans jeton inchangée", () => {
        expect(stripTokens("40 ans")).toBe("40 ans");
    });
});
