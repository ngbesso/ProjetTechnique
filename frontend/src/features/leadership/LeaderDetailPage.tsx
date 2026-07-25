import { useEffect, useState } from "react";
import styles from "./LeadershipPage.module.css";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
import { useNavigate } from "../../context/RouterContext";
import { fetchChurches } from "../../lib/api/churches";
import { getLeader } from "../../lib/api/leaders";
import type { Church, Leader, LeaderRole } from "../../types";

interface LeaderDetailPageProps {
  leaderId: number;
}

const ROLE_LABELS: Record<LeaderRole, string> = {
  pastor: "Pasteur",
  elder: "Ancien",
  deacon: "Diacre",
  department_head: "Responsable de département",
};

function initials(leader: Leader): string {
  return `${leader.first_name[0] ?? ""}${leader.last_name[0] ?? ""}`.toUpperCase();
}

export function LeaderDetailPage({ leaderId }: LeaderDetailPageProps) {
  const navigate = useNavigate();
  const [leader, setLeader] = useState<Leader | null>(null);
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    getLeader(leaderId)
      .then(setLeader)
      .catch((err) => setError(err instanceof Error ? err.message : "Profil introuvable."))
      .finally(() => setLoading(false));
    fetchChurches().then(setChurches).catch(() => {});
  }, [leaderId]);

  const churchName = leader?.church_id
    ? churches.find((c) => c.id === leader.church_id)?.name
    : null;

  return (
    <div className={styles.page}>
      <SiteHeader activePage="leadership" />

      <main className={styles.main}>
        {loading ? (
          <p className={styles.stateMsg}>Chargement…</p>
        ) : error || !leader ? (
          <p className={styles.errorMsg} role="alert">
            {error || "Profil introuvable."}
          </p>
        ) : (
          <div className={styles.detailCard}>
            <button className={styles.btnBack} onClick={() => navigate("leadership")}>
              ← Retour au leadership
            </button>

            <div className={styles.detailHeader}>
              <div className={styles.detailPhotoWrap}>
                {leader.photo_url ? (
                  <img
                    className={styles.detailPhoto}
                    src={leader.photo_url}
                    alt={`${leader.first_name} ${leader.last_name}`}
                  />
                ) : (
                  <div className={styles.detailPhotoPlaceholder}>{initials(leader)}</div>
                )}
              </div>
              <div>
                <h1 className={styles.detailName}>
                  {leader.first_name} {leader.last_name}
                </h1>
                <p className={styles.detailTitle}>
                  {leader.title} · {ROLE_LABELS[leader.role]}
                </p>
                {leader.district && (
                  <p className={styles.detailMeta}>🗺️ District {leader.district}</p>
                )}
                {churchName && <p className={styles.detailMeta}>⛪ {churchName}</p>}
                {leader.years_of_service !== null && (
                  <p className={styles.detailMeta}>
                    ⏳ {leader.years_of_service} an{leader.years_of_service > 1 ? "s" : ""} de service
                  </p>
                )}
              </div>
            </div>

            {leader.bio && <p className={styles.detailBio}>{leader.bio}</p>}

            <div className={styles.detailContact}>
              {leader.email && (
                <a className={styles.contactBadge} href={`mailto:${leader.email}`}>
                  ✉️ {leader.email}
                </a>
              )}
              {leader.phone && (
                <span className={styles.contactBadge}>📞 {leader.phone}</span>
              )}
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
