// Formatage partagé (date/heure/devise) — fr-CA partout dans l'application.
// Évite de réimplémenter ces mêmes toLocaleDateString/toLocaleString dans
// chaque panneau.

export function formatDate(iso: string | null | undefined): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("fr-CA", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

/**
 * Date seule (`yyyy-mm-dd`, sans heure ni fuseau) rendue en toutes lettres.
 *
 * Volontairement distincte de `formatDate` malgré des options identiques :
 * `new Date("2000-06-15")` est interprété comme minuit UTC, ce qui affiche la
 * veille dans tout fuseau négatif (America/Montreal inclus). On reconstruit
 * donc la date en heure locale. À utiliser pour les champs `date` du backend
 * (naissance, adhésion à un ministère) ; `formatDate` reste correct pour les
 * horodatages complets.
 */
export function formatLongDate(iso: string): string {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("fr-CA", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

/** Horodatage complet en toutes lettres : « 3 mai 2026 · 19:00 ». */
export function formatEventDateTime(iso: string): string {
    return `${formatDate(iso)} · ${formatTime(iso)}`;
}

export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("fr-CA", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/** Date du jour au format `yyyy-mm-dd` — borne `max` des champs `<input type="date">`
 *  pour lesquels le jour même est valide (date de conversion). */
export const TODAY = new Date().toISOString().split("T")[0];

/** Veille au format `yyyy-mm-dd` — borne `max` de la date de naissance, que le
 *  backend exige strictement antérieure à aujourd'hui. */
export const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];

export function formatTime(iso: string | null | undefined): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("fr-CA", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

/** Plage d'un événement : « 3 mai 2026 · 19:00 – 21:00 » si début et fin
 *  tombent le même jour, « 3 mai 2026 – 5 mai 2026 » sinon, et la seule date
 *  de début avec son heure lorsqu'aucune fin n'est renseignée. */
export function formatDateRange(startIso: string, endIso: string | null): string {
    const startLabel = formatEventDateTime(startIso);
    if (!endIso) return startLabel;
    const sameDay = new Date(startIso).toDateString() === new Date(endIso).toDateString();
    if (sameDay) return `${startLabel} – ${formatTime(endIso)}`;
    return `${formatDate(startIso)} – ${formatDate(endIso)}`;
}

export function formatCurrency(amount: number, currency = "CAD"): string {
    return amount.toLocaleString("fr-CA", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
    });
}
