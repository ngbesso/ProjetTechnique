import { useEffect, useState } from "react";
import styles from "./MyProfilePage.module.css";
import { fetchMyProfile, updateMyProfile } from "../../lib/api/members";
import { useNavigate } from "../../context/RouterContext";
import { useParameters } from "../../hooks/useParameters";
import { validatePhone, validateEmail, validateAddress } from "../../lib/validation";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
import type { Member } from "../../types";

type FieldErrors = { telephone?: string; email?: string; address?: string };

const TODAY = new Date().toISOString().split("T")[0];

const STATUS_LABEL: Record<string, string> = {
    active: "Actif",
    pending: "En attente",
    inactive: "Inactif",
    rejected: "Refusé",
};

export function MyProfilePage() {
    const navigate = useNavigate();
    const [m, setM] = useState<Member | null>(null);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [saved, setSaved] = useState(false);
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const { values: sexeOptions, load: loadSexe } = useParameters("sexe");
    const { values: familyOptions, load: loadFamily } = useParameters("family_status");

    useEffect(() => {
        fetchMyProfile()
            .then(setM)
            .catch(() => setError("Aucune fiche membre n'est liée à votre compte."))
            .finally(() => setLoading(false));
        loadSexe();
        loadFamily();
    }, [loadSexe, loadFamily]);

    async function save(e: React.FormEvent) {
        e.preventDefault();
        if (!m) return;
        if (m.birth_date && m.birth_date > TODAY) {
            setError("La date de naissance ne peut pas être une date future.");
            return;
        }

        const errs: FieldErrors = {
            telephone: validatePhone(m.telephone ?? "") ?? undefined,
            email:     validateEmail(m.email) ?? undefined,
            address:   validateAddress(m.address ?? "") ?? undefined,
        };
        const hasErrors = Object.values(errs).some(Boolean);
        setFieldErrors(errs);
        if (hasErrors) return;

        setBusy(true);
        setSaved(false);
        setError("");
        try {
            const updated = await updateMyProfile({
                first_name: m.first_name,
                last_name: m.last_name,
                email: m.email,
                address: m.address,
                birth_date: m.birth_date,
                sexe: m.sexe,
                telephone: m.telephone,
                family_status: m.family_status,
            });
            setM(updated);
            setSaved(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur d'enregistrement.");
        } finally {
            setBusy(false);
        }
    }

    const initials = m
        ? `${m.first_name[0] ?? ""}${m.last_name[0] ?? ""}`.toUpperCase()
        : "…";

    return (
        <div className={styles.page}>
            <SiteHeader activePage="mon-profil" />

            <main className={styles.main}>
                {loading ? (
                    <div className={styles.loader}>Chargement du profil…</div>
                ) : (
                    <form className={styles.container} onSubmit={save} noValidate>

                        {/* ── Hero ── */}
                        {m && (
                            <div className={styles.hero}>
                                <div className={styles.avatar}>{initials}</div>
                                <div className={styles.heroInfo}>
                                    <p className={styles.heroName}>
                                        {m.first_name} {m.last_name}
                                    </p>
                                    <div className={styles.heroBadges}>
                                        <span className={`${styles.statusBadge} ${styles[m.status]}`}>
                                            {STATUS_LABEL[m.status] ?? m.status}
                                        </span>
                                        {m.member_code && (
                                            <span className={styles.memberCode}>
                                                {m.member_code}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Feedback ── */}
                        {error && (
                            <p className={styles.errorMsg} role="alert">{error}</p>
                        )}
                        {saved && (
                            <p className={styles.successMsg}>
                                <span>✓</span> Profil mis à jour avec succès.
                            </p>
                        )}

                        {m && (
                            <>
                                {/* ── Section : Informations personnelles ── */}
                                <div className={styles.card}>
                                    <div className={styles.cardHeader}>
                                        <p className={styles.cardTitle}>Informations personnelles</p>
                                    </div>
                                    <div className={styles.cardDivider} />
                                    <div className={styles.cardBody}>
                                        <div className={styles.grid2}>
                                            <div className={styles.fieldGroup}>
                                                <label className={styles.label} htmlFor="first_name">
                                                    Prénom
                                                </label>
                                                <input
                                                    id="first_name"
                                                    className={styles.input}
                                                    value={m.first_name}
                                                    onChange={(e) => setM({ ...m, first_name: e.target.value })}
                                                    required
                                                />
                                            </div>

                                            <div className={styles.fieldGroup}>
                                                <label className={styles.label} htmlFor="last_name">
                                                    Nom
                                                </label>
                                                <input
                                                    id="last_name"
                                                    className={styles.input}
                                                    value={m.last_name}
                                                    onChange={(e) => setM({ ...m, last_name: e.target.value })}
                                                    required
                                                />
                                            </div>

                                            <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                                                <label className={styles.label} htmlFor="address">
                                                    Adresse
                                                </label>
                                                <input
                                                    id="address"
                                                    className={`${styles.input} ${fieldErrors.address ? styles.inputError : ""}`}
                                                    value={m.address ?? ""}
                                                    placeholder="ex. : 123 Rue principale, Montréal, QC"
                                                    onChange={(e) => { setM({ ...m, address: e.target.value || null }); setFieldErrors((fe) => ({ ...fe, address: undefined })); }}
                                                />
                                                {fieldErrors.address && <p className={styles.fieldError} role="alert">{fieldErrors.address}</p>}
                                            </div>

                                            <div className={styles.fieldGroup}>
                                                <label className={styles.label} htmlFor="sexe">
                                                    Sexe
                                                </label>
                                                <select
                                                    id="sexe"
                                                    className={styles.select}
                                                    value={m.sexe ?? ""}
                                                    onChange={(e) => setM({ ...m, sexe: e.target.value || null })}
                                                >
                                                    <option value="">—</option>
                                                    {sexeOptions.map((s) => (
                                                        <option key={s.id} value={s.label}>{s.label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className={styles.fieldGroup}>
                                                <label className={styles.label} htmlFor="telephone">
                                                    Téléphone
                                                </label>
                                                <input
                                                    id="telephone"
                                                    className={`${styles.input} ${fieldErrors.telephone ? styles.inputError : ""}`}
                                                    type="tel"
                                                    value={m.telephone ?? ""}
                                                    placeholder="ex. : 514-123-4567 ou +1 514 123 4567"
                                                    onChange={(e) => { setM({ ...m, telephone: e.target.value || null }); setFieldErrors((fe) => ({ ...fe, telephone: undefined })); }}
                                                />
                                                {fieldErrors.telephone && <p className={styles.fieldError} role="alert">{fieldErrors.telephone}</p>}
                                            </div>

                                            <div className={styles.fieldGroup}>
                                                <label className={styles.label} htmlFor="birth_date">
                                                    Date de naissance
                                                </label>
                                                <input
                                                    id="birth_date"
                                                    className={styles.input}
                                                    type="date"
                                                    value={m.birth_date ?? ""}
                                                    max={TODAY}
                                                    onChange={(e) => setM({ ...m, birth_date: e.target.value || null })}
                                                />
                                            </div>

                                            <div className={styles.fieldGroup}>
                                                <label className={styles.label} htmlFor="family_status">
                                                    Statut familial
                                                </label>
                                                <select
                                                    id="family_status"
                                                    className={styles.select}
                                                    value={m.family_status ?? ""}
                                                    onChange={(e) => setM({ ...m, family_status: e.target.value || null })}
                                                >
                                                    <option value="">—</option>
                                                    {familyOptions.map((f) => (
                                                        <option key={f.id} value={f.label}>{f.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Section : Compte ── */}
                                <div className={styles.card}>
                                    <div className={styles.cardHeader}>
                                        <p className={styles.cardTitle}>Compte</p>
                                    </div>
                                    <div className={styles.cardDivider} />
                                    <div className={styles.cardBody}>
                                        <div className={styles.fieldGroup}>
                                            <label className={styles.label} htmlFor="email">
                                                Adresse courriel
                                            </label>
                                            <input
                                                id="email"
                                                className={`${styles.input} ${fieldErrors.email ? styles.inputError : ""}`}
                                                type="email"
                                                value={m.email}
                                                onChange={(e) => { setM({ ...m, email: e.target.value }); setFieldErrors((fe) => ({ ...fe, email: undefined })); }}
                                                required
                                                autoComplete="email"
                                            />
                                            {fieldErrors.email && <p className={styles.fieldError} role="alert">{fieldErrors.email}</p>}
                                        </div>
                                        <p className={styles.emailNotice}>
                                            ⚠ Ce courriel sert également à la connexion. En le modifiant, vous devrez utiliser la nouvelle adresse pour vous connecter.
                                        </p>
                                    </div>
                                </div>

                                {/* ── Actions ── */}
                                <div className={styles.actions}>
                                    <button
                                        type="button"
                                        className={styles.btnGhost}
                                        onClick={() => navigate("home")}
                                    >
                                        ← Retour à l'accueil
                                    </button>
                                    <button
                                        type="submit"
                                        className={styles.btnPrimary}
                                        disabled={busy}
                                    >
                                        {busy ? "Enregistrement…" : "Enregistrer les modifications"}
                                    </button>
                                </div>
                            </>
                        )}

                        {!m && !loading && (
                            <div className={styles.card}>
                                <div className={styles.cardBody}>
                                    <p style={{ color: "#64748b", textAlign: "center" }}>
                                        Aucune fiche membre associée à ce compte.
                                    </p>
                                </div>
                            </div>
                        )}
                    </form>
                )}
            </main>

            <SiteFooter />
        </div>
    );
}
