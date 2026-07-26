import { useEffect, useState } from "react";
import styles from "./LeadershipPage.module.css";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
import { useNavigate } from "../../context/RouterContext";
import { useParameters } from "../../hooks/useParameters";
import { getLeaders } from "../../lib/api/leaders";
import type { Leader } from "../../types";

const DISTRICTS = ["Ouest", "Est", "Centre", "Sud", "Outremer", "National"];

function initials(leader: Leader): string {
  return `${leader.first_name[0] ?? ""}${leader.last_name[0] ?? ""}`.toUpperCase();
}

export function LeadershipPage() {
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [role, setRole] = useState("");
  const [district, setDistrict] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { values: roleValues, load: loadRoles } = useParameters("leader_role");

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    setLoading(true);
    setError("");
    getLeaders({
      role: role || undefined,
      district: district || undefined,
    })
      .then((result) => setLeaders(result.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement."))
      .finally(() => setLoading(false));
  }, [role, district]);

  return (
    <div className={styles.page}>
      <SiteHeader activePage="leadership" />

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.heroEyebrow}>✝ Nos responsables</span>
          <h1 className={styles.heroTitle}>Corps de Leadership</h1>
          <p className={styles.heroSubtitle}>Nos pasteurs et responsables</p>
        </div>
        <div className={styles.heroDecor} aria-hidden="true" />
      </section>

      <main className={styles.main}>
        <div className={styles.filters}>
          <select
            className={styles.filterSelect}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">Tous les rôles</option>
            {roleValues.map((r) => (
              <option key={r.id} value={r.label}>{r.label}</option>
            ))}
          </select>

          <select
            className={styles.filterSelect}
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          >
            <option value="">Tous les districts</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className={styles.errorMsg} role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className={styles.stateMsg}>Chargement…</p>
        ) : leaders.length === 0 ? (
          <div className={styles.emptyState}>Aucun responsable trouvé.</div>
        ) : (
          <div className={styles.grid}>
            {leaders.map((leader) => (
              <article key={leader.id} className={styles.card}>
                <div className={styles.photoWrap}>
                  {leader.photo_url ? (
                    <img
                      className={styles.photo}
                      src={leader.photo_url}
                      alt={`${leader.first_name} ${leader.last_name}`}
                    />
                  ) : (
                    <div className={styles.photoPlaceholder}>{initials(leader)}</div>
                  )}
                </div>
                <h2 className={styles.name}>
                  {leader.first_name} {leader.last_name}
                </h2>
                <p className={styles.title}>{leader.title}</p>
                {leader.district && (
                  <span className={styles.district}>{leader.district}</span>
                )}
                {leader.bio && <p className={styles.bio}>{leader.bio}</p>}
                <button
                  className={styles.btnDetail}
                  onClick={() => navigate("leadership", { leader: leader.id })}
                >
                  Voir le profil
                </button>
              </article>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
