import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { fetchBirthdaysOverview, sendBirthdayGreetings } from "../../lib/api/members";
import { TemplateSettingField } from "./ParametresPanel";
import type { BirthdaysOverview } from "../../types";

const MONTHS_FR = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function formatDayMonth(iso: string): string {
    const [, m, d] = iso.split("-").map(Number);
    return `${d} ${MONTHS_FR[m - 1]}`;
}

export function AnniversairesPanel() {
    const [overview, setOverview] = useState<BirthdaysOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        fetchBirthdaysOverview()
            .then(setOverview)
            .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
            .finally(() => setLoading(false));
    }, []);

    async function handleSendMonthly() {
        setSending(true);
        setError("");
        setSendResult("");
        try {
            const month = new Date().getMonth() + 1;
            const result = await sendBirthdayGreetings(month);
            setSendResult(
                `${result.sent} message${result.sent > 1 ? "s" : ""} envoyé${result.sent > 1 ? "s" : ""}.`,
            );
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur");
        } finally {
            setSending(false);
        }
    }

    return (
        <div className={styles.rbacWrapper}>
            <section className={styles.card}>
                <h3 className={styles.cardTitle}>Anniversaires</h3>

                {error && <p className={styles.errorMsg} role="alert">{error}</p>}

                {loading ? (
                    <p className={styles.stateMsg}>Chargement…</p>
                ) : overview && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        <div>
                            <p style={{ margin: "0 0 .5rem", fontWeight: 600, fontSize: ".85rem", color: "var(--text-muted)" }}>
                                Aujourd'hui
                            </p>
                            {overview.today.length === 0 ? (
                                <p className={styles.empty}>Aucun anniversaire aujourd'hui.</p>
                            ) : (
                                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
                                    {overview.today.map((m) => (
                                        <li
                                            key={m.id}
                                            style={{ background: "var(--neutral-bg)", borderRadius: "var(--radius)", padding: ".35rem .75rem", fontSize: ".85rem" }}
                                        >
                                            {m.first_name} {m.last_name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".5rem", flexWrap: "wrap", gap: ".5rem" }}>
                                <p style={{ margin: 0, fontWeight: 600, fontSize: ".85rem", color: "var(--text-muted)" }}>
                                    Ce mois-ci ({overview.this_month.length})
                                </p>
                                <button
                                    className={styles.btnPrimarySm}
                                    onClick={handleSendMonthly}
                                    disabled={sending || overview.this_month.length === 0}
                                >
                                    {sending ? "Envoi…" : "Envoyer maintenant"}
                                </button>
                            </div>
                            {overview.this_month.length === 0 ? (
                                <p className={styles.empty}>Aucun anniversaire ce mois-ci.</p>
                            ) : (
                                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: ".35rem" }}>
                                    {overview.this_month.map((m) => (
                                        <li key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: ".85rem" }}>
                                            <span>{m.first_name} {m.last_name}</span>
                                            <span style={{ color: "var(--text-muted)" }}>{formatDayMonth(m.birth_date)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {sendResult && (
                                <p style={{ color: "var(--vivid-violet)", fontSize: ".85rem", marginTop: ".5rem" }}>
                                    {sendResult}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </section>

            <TemplateSettingField
                settingKey="birthday_message_template"
                title="Message d'anniversaire individuel"
                description="Envoyé automatiquement le jour de l'anniversaire de chaque membre actif. Variables disponibles : {prenom}, {nom}."
            />
            <TemplateSettingField
                settingKey="birthday_monthly_message_template"
                title="Message groupé mensuel d'anniversaire"
                description="Envoyé automatiquement le 1er de chaque mois (ou avec le bouton « Envoyer maintenant » ci-dessus) à tous les membres actifs nés ce mois-ci. Variables disponibles : {prenom}, {nom}."
            />
        </div>
    );
}
