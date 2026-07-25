import { describe, expect, it } from "vitest";
import {
    adminActionLabel,
    adminActionTarget,
    hasAdminAccess,
    hasPermission,
    isTrueAdmin,
} from "./AuthContext";
import type { UserInfo } from "../types";

function makeUser(overrides: Partial<UserInfo> = {}): UserInfo {
    return {
        id: 1,
        email: "test@example.com",
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        roles: [],
        permissions: [],
        is_global_admin: false,
        ...overrides,
    };
}

describe("hasAdminAccess", () => {
    it("est faux sans utilisateur", () => {
        expect(hasAdminAccess(null)).toBe(false);
        expect(hasAdminAccess(undefined)).toBe(false);
    });

    it("est vrai pour un administrateur global", () => {
        expect(hasAdminAccess(makeUser({ is_global_admin: true }))).toBe(true);
    });

    it("est vrai pour une permission hors du socle membre", () => {
        expect(hasAdminAccess(makeUser({ permissions: ["event:manage"] }))).toBe(true);
    });

    it("est vrai pour le joker '*'", () => {
        expect(hasAdminAccess(makeUser({ permissions: ["*"] }))).toBe(true);
    });

    it("est faux pour un membre n'ayant que les permissions de base", () => {
        const user = makeUser({ permissions: ["donation:create", "event:read", "sermon:read"] });
        expect(hasAdminAccess(user)).toBe(false);
    });
});

describe("hasPermission", () => {
    it("est faux sans utilisateur", () => {
        expect(hasPermission(null, "member:update")).toBe(false);
    });

    it("est vrai avec la permission exacte", () => {
        const user = makeUser({ permissions: ["member:update"] });
        expect(hasPermission(user, "member:update")).toBe(true);
    });

    it("est vrai avec le joker '*', peu importe le code demandé", () => {
        const user = makeUser({ permissions: ["*"] });
        expect(hasPermission(user, "member:update")).toBe(true);
    });

    it("est faux sans la permission demandée", () => {
        const user = makeUser({ permissions: ["event:manage"] });
        expect(hasPermission(user, "member:update")).toBe(false);
    });
});

describe("isTrueAdmin", () => {
    it("est vrai pour un administrateur global", () => {
        expect(isTrueAdmin(makeUser({ is_global_admin: true }))).toBe(true);
    });

    it("est vrai pour le rôle 'admin'", () => {
        expect(isTrueAdmin(makeUser({ roles: ["admin"] }))).toBe(true);
    });

    it("est faux pour un organisateur (contrairement à hasAdminAccess)", () => {
        const user = makeUser({ roles: ["organisateur"], permissions: ["event:manage"] });
        expect(isTrueAdmin(user)).toBe(false);
        expect(hasAdminAccess(user)).toBe(true);
    });

    it("est faux sans utilisateur", () => {
        expect(isTrueAdmin(null)).toBe(false);
    });
});

describe("adminActionLabel / adminActionTarget", () => {
    it("pointent vers le back-office complet pour un admin", () => {
        const user = makeUser({ roles: ["admin"] });
        expect(adminActionLabel(user)).toBe("Administration");
        expect(adminActionTarget(user)).toBe("admin");
    });

    it("pointent vers la page allégée pour un organisateur", () => {
        const user = makeUser({ roles: ["organisateur"] });
        expect(adminActionLabel(user)).toBe("Organiser un événement");
        expect(adminActionTarget(user)).toBe("organiser-evenements");
    });

    it("retombent sur Administration/admin par défaut", () => {
        const user = makeUser();
        expect(adminActionLabel(user)).toBe("Administration");
        expect(adminActionTarget(user)).toBe("admin");
    });
});
