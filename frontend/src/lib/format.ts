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

export function formatCurrency(amount: number, currency = "CAD"): string {
    return amount.toLocaleString("fr-CA", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
    });
}
