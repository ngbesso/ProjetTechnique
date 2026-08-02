import { useEffect, useState } from "react";
import admin from "../admin/AdminPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useParameters } from "../../hooks/useParameters";
import { fetchMyMinistries, joinMinistry, leaveMinistry } from "../../lib/api/ministryAffiliations";
import { formatLongDate } from "../../lib/format";
import type { MinistryAffiliation } from "../../types";

export function MinisteresSection() {
  const { member } = useAuth();
  const { values: ministries, load: loadMinistries } = useParameters("ministry");
  const [myMinistries, setMyMinistries] = useState<MinistryAffiliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joiningLabel, setJoiningLabel] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<number | null>(null);

  function load() {
    setLoading(true);
    fetchMyMinistries()
      .then(setMyMinistries)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    loadMinistries();
  }, [loadMinistries]);

  async function handleJoin(label: string) {
    setJoiningLabel(label);
    setError("");
    try {
      await joinMinistry(label);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setJoiningLabel(null);
    }
  }

  async function handleLeave(affiliationId: number) {
    setLeavingId(affiliationId);
    setError("");
    try {
      await leaveMinistry(affiliationId);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLeavingId(null);
    }
  }

  const active = myMinistries.filter((a) => !a.left_at);
  const activeLabels = new Set(active.map((a) => a.ministry));
  const available = ministries.filter(
    (m) =>
      !activeLabels.has(m.label) &&
      (!m.restricted_to_sexe || m.restricted_to_sexe === member?.sexe),
  );

  return (
    <div className={admin.rbacWrapper}>
      {error && <p className={admin.errorMsg} role="alert">{error}</p>}

      <section className={admin.card}>
        <h3 className={admin.cardTitle}>Mes ministères</h3>
        {loading ? (
          <p className={admin.stateMsg}>Chargement…</p>
        ) : active.length === 0 ? (
          <p className={admin.empty}>Vous n'êtes affilié(e) à aucun ministère pour le moment.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: ".6rem" }}>
            {active.map((a) => (
              <li key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>
                  {a.ministry}{" "}
                  <span style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>
                    — depuis le {formatLongDate(a.joined_at)}
                  </span>
                </span>
                <button
                  className={admin.btnOutlineSm}
                  disabled={leavingId === a.id}
                  onClick={() => handleLeave(a.id)}
                >
                  {leavingId === a.id ? "…" : "Quitter"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={admin.card}>
        <h3 className={admin.cardTitle}>Rejoindre un ministère</h3>
        {available.length === 0 ? (
          <p className={admin.empty}>Vous participez déjà à tous les ministères disponibles.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: ".6rem" }}>
            {available.map((m) => (
              <li key={m.id}>
                <button
                  className={admin.btnOutlineSm}
                  disabled={joiningLabel === m.label}
                  onClick={() => handleJoin(m.label)}
                >
                  {joiningLabel === m.label ? "…" : `+ ${m.label}`}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
