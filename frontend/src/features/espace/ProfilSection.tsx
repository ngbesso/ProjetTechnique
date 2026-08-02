import { useEffect, useState } from "react";
import admin from "../admin/AdminPage.module.css";
import styles from "./EspacePage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useParameters } from "../../hooks/useParameters";
import { fetchMyProfile, updateMyProfile } from "../../lib/api/members";
import { formatLongDate } from "../../lib/format";
import { validatePhone, validateAddress } from "../../lib/validation";
import { ReadOnlyField } from "./ReadOnlyField";
import type { Member, MemberSelfInput } from "../../types";

const STATUS_LABEL: Record<string, string> = {
  active: "Actif",
  pending: "En attente",
  inactive: "Inactif",
  rejected: "Refusé",
};

interface ProfilSectionProps {
  churchName: (id: number | null | undefined) => string;
  onRequestChange: () => void;
}

export function ProfilSection({ churchName, onRequestChange }: ProfilSectionProps) {
  const { member: contextMember, setMember } = useAuth();
  const [m, setM] = useState<Member | null>(contextMember);
  const [loading, setLoading] = useState(!contextMember);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ telephone?: string; address?: string }>({});
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const { values: familyOptions, load: loadFamily } = useParameters("family_status");

  useEffect(() => {
    fetchMyProfile()
      .then((data) => {
        setM(data);
        setMember(data);
      })
      .catch(() => setError("Aucune fiche membre n'est liée à votre compte."))
      .finally(() => setLoading(false));
    loadFamily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadFamily]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!m) return;

    const errs = {
      telephone: validatePhone(m.telephone ?? "") ?? undefined,
      address: validateAddress(m.address ?? "") ?? undefined,
    };
    const hasErrors = Object.values(errs).some(Boolean);
    setFieldErrors(errs);
    if (hasErrors) return;

    setBusy(true);
    setSaved(false);
    setError("");
    try {
      const payload: MemberSelfInput = {
        address: m.address,
        telephone: m.telephone,
        family_status: m.family_status,
      };
      const updated = await updateMyProfile(payload);
      setM(updated);
      setMember(updated);
      setSaved(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'enregistrement.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className={admin.stateMsg}>Chargement…</p>;
  if (!m) return <p className={admin.errorMsg} role="alert">{error || "Aucune fiche membre associée à ce compte."}</p>;

  const initials = `${m.first_name[0] ?? ""}${m.last_name[0] ?? ""}`.toUpperCase();

  return (
    <div className={admin.rbacWrapper}>
      {/* ── Hero ── */}
      <div className={styles.hero}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.heroInfo}>
          <p className={styles.heroName}>{m.first_name} {m.last_name}</p>
          <div className={styles.heroMeta}>
            <span className={`${styles.statusBadge} ${styles[m.status] ?? ""}`}>
              {STATUS_LABEL[m.status] ?? m.status}
            </span>
            {m.member_code && <span className={styles.memberCode}>{m.member_code}</span>}
            <span className={styles.churchTag}>⛪ {churchName(m.church_id)}</span>
          </div>
        </div>
      </div>

      {saved && (
        <p className={styles.successMsg}><span>✓</span> Profil mis à jour avec succès.</p>
      )}
      {error && <p className={admin.errorMsg} role="alert">{error}</p>}

      {/* ── Identité (lecture seule) ── */}
      <section className={admin.card}>
        <h3 className={admin.cardTitle}>Informations personnelles</h3>
        <div className={styles.grid2}>
          <ReadOnlyField label="Prénom" value={m.first_name} />
          <ReadOnlyField label="Nom" value={m.last_name} />
          <ReadOnlyField label="Date de naissance" value={m.birth_date ? formatLongDate(m.birth_date) : "—"} />
          <ReadOnlyField label="Courriel" value={m.email} />
          <ReadOnlyField label="Sexe" value={m.sexe ?? "—"} />
        </div>
        <p className={styles.lockNote}>
          🔒 Pour modifier ces informations, contactez votre église.{" "}
          <button type="button" className={styles.inlineLinkBtn} onClick={onRequestChange}>
            Demander une modification
          </button>
        </p>
      </section>

      {/* ── Statut (lecture seule) ── */}
      <section className={admin.card}>
        <h3 className={admin.cardTitle}>Statut du compte</h3>
        <div className={styles.grid2}>
          <ReadOnlyField label="Statut" value={STATUS_LABEL[m.status] ?? m.status} />
          <ReadOnlyField label="Numéro de membre" value={m.member_code ?? "—"} />
          <ReadOnlyField label="Église" value={churchName(m.church_id)} />
          <ReadOnlyField label="Baptisé(e)" value={m.is_baptized ? "Oui" : "Non"} />
        </div>
      </section>

      {/* ── Coordonnées (modifiable) ── */}
      <section className={admin.card}>
        <h3 className={admin.cardTitle}>Modifier mes coordonnées</h3>
        <form onSubmit={save}>
          <div className={styles.grid2}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="address">Adresse</label>
              <input
                id="address"
                className={admin.input}
                value={m.address ?? ""}
                placeholder="ex. : 123 Rue principale, Montréal, QC"
                onChange={(e) => {
                  setM({ ...m, address: e.target.value || null });
                  setFieldErrors((fe) => ({ ...fe, address: undefined }));
                }}
              />
              {fieldErrors.address && <p className={admin.fieldError}>{fieldErrors.address}</p>}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="telephone">Téléphone</label>
              <input
                id="telephone"
                className={admin.input}
                type="tel"
                value={m.telephone ?? ""}
                placeholder="ex. : 514-123-4567"
                onChange={(e) => {
                  setM({ ...m, telephone: e.target.value || null });
                  setFieldErrors((fe) => ({ ...fe, telephone: undefined }));
                }}
              />
              {fieldErrors.telephone && <p className={admin.fieldError}>{fieldErrors.telephone}</p>}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="family_status">Statut matrimonial</label>
              <select
                id="family_status"
                className={admin.select}
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

          <div className={styles.formActions}>
            <button type="submit" className={admin.btnPrimary} disabled={busy}>
              {busy ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
