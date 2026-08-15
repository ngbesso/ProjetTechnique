import { describe, expect, it } from "vitest";
import { ALL_NAV_ITEMS, toNavSections, visibleNavItems } from "./AdminNav";

const GLOBAL_ADMIN = { isGlobalAdmin: true, isOrganisateurOnly: false };
const SIMPLE_ADMIN = { isGlobalAdmin: false, isOrganisateurOnly: false };
const ORGANISATEUR = { isGlobalAdmin: false, isOrganisateurOnly: true };

describe("visibleNavItems", () => {
  it("donne tout au super-administrateur", () => {
    expect(visibleNavItems(ALL_NAV_ITEMS, GLOBAL_ADMIN)).toHaveLength(ALL_NAV_ITEMS.length);
  });

  it("masque les entrées globalOnly à un administrateur non global", () => {
    const ids = visibleNavItems(ALL_NAV_ITEMS, SIMPLE_ADMIN).map((i) => i.id);
    expect(ids).toContain("membres");
    expect(ids).not.toContain("utilisateurs");
    expect(ids).not.toContain("parametres");
  });

  it("ne laisse que les Événements à un organisateur pur", () => {
    expect(visibleNavItems(ALL_NAV_ITEMS, ORGANISATEUR).map((i) => i.id)).toEqual([
      "evenements",
    ]);
  });
});

describe("toNavSections", () => {
  it("isole les entrées hors groupe dans leur propre tranche", () => {
    const sections = toNavSections(visibleNavItems(ALL_NAV_ITEMS, GLOBAL_ADMIN));
    expect(sections[0]).toEqual({
      group: undefined,
      items: [expect.objectContaining({ id: "dashboard" })],
    });
    expect(sections[sections.length - 1]).toEqual({
      group: undefined,
      items: [expect.objectContaining({ id: "assistant" })],
    });
  });

  it("rassemble les entrées consécutives d'un même groupe", () => {
    const sections = toNavSections(visibleNavItems(ALL_NAV_ITEMS, GLOBAL_ADMIN));
    const finances = sections.find((s) => s.group === "Finances");
    expect(finances?.items.map((i) => i.id)).toEqual([
      "finances-revenus",
      "finances-depenses",
      "finances-rapport",
    ]);
  });

  it("n'ouvre qu'une tranche par groupe", () => {
    const groups = toNavSections(visibleNavItems(ALL_NAV_ITEMS, GLOBAL_ADMIN))
      .map((s) => s.group)
      .filter((g): g is string => g !== undefined);
    expect(new Set(groups).size).toBe(groups.length);
  });

  it("ne produit qu'une tranche pour un organisateur pur", () => {
    // « Événements » reste rattaché au groupe Contenu : la tranche conserve
    // donc son groupe, avec une seule entrée dedans.
    const sections = toNavSections(visibleNavItems(ALL_NAV_ITEMS, ORGANISATEUR));
    expect(sections).toHaveLength(1);
    expect(sections[0].group).toBe("Contenu");
    expect(sections[0].items).toHaveLength(1);
  });

  it("ne perd aucune entrée au regroupement", () => {
    const visible = visibleNavItems(ALL_NAV_ITEMS, SIMPLE_ADMIN);
    const regrouped = toNavSections(visible).flatMap((s) => s.items);
    expect(regrouped.map((i) => i.id)).toEqual(visible.map((i) => i.id));
  });

  it("ne laisse aucun groupe sans entrée", () => {
    for (const context of [GLOBAL_ADMIN, SIMPLE_ADMIN, ORGANISATEUR]) {
      for (const section of toNavSections(visibleNavItems(ALL_NAV_ITEMS, context))) {
        expect(section.items.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("ALL_NAV_ITEMS", () => {
  it("n'utilise plus d'emoji comme icône", () => {
    for (const item of ALL_NAV_ITEMS) {
      expect(typeof item.icon).toBe("function");
    }
  });
});
