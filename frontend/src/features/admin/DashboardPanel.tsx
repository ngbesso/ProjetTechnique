import { useEffect, useState } from "react";
import styles from "./DashboardPanel.module.css";
import { KpiCard } from "../../components/ui/KpiCard";
import { fetchDashboardStats, ActivityType, DashboardStats } from "../../lib/api/dashboard";
import type { Section } from "./AdminPage";

interface DashboardPanelProps {
  onNavigate: (section: Section) => void;
}

// ── Icônes KPI ────────────────────────────────────────────────────────────────

function IconClock() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconHandHeart() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 11c0-1.5-1.5-3-3-1.5l-1 1-1-1c-1.5-1.5-3 0-3 1.5 0 1.5 4 4.5 4 4.5s4-3 4-4.5z" />
    </svg>
  );
}

// ── Actions rapides ───────────────────────────────────────────────────────────

interface QuickAction {
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}

function QuickActionCard({ action }: { action: QuickAction }) {
  return (
    <button className={styles.quickActionCard} onClick={action.onClick}>
      <span className={styles.quickActionIcon}>{action.icon}</span>
      <span className={styles.quickActionBody}>
        <span className={styles.quickActionTitle}>{action.title}</span>
        <br />
        <span className={styles.quickActionSubtitle}>{action.subtitle}</span>
      </span>
    </button>
  );
}

// ── Activité récente ──────────────────────────────────────────────────────────

const ACTIVITY_ICON: Record<ActivityType, string> = {
  member: "👤",
  donation: "💝",
  sermon: "🎙",
  post: "✍️",
  event_registration: "📅",
  prayer_request: "🙏",
  volunteer_request: "🤝",
};

const ACTIVITY_SECTION: Record<ActivityType, Section> = {
  member: "membres",
  donation: "dons",
  sermon: "sermons",
  post: "blog",
  event_registration: "evenements",
  prayer_request: "prieres",
  volunteer_request: "benevolat",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-CA", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Composant principal ───────────────────────────────────────────────────────

export function DashboardPanel({ onNavigate }: DashboardPanelProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch(() => setError("Impossible de charger les statistiques."));
  }, []);

  const today = new Date().toLocaleDateString("fr-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalAttention = stats
    ? stats.membres_pending + stats.prieres.pending + stats.benevolat.pending
    : 0;

  const quickActions: QuickAction[] = stats
    ? [
        {
          icon: "📅",
          title: "Créer un événement",
          subtitle: "Ajouter au calendrier",
          onClick: () => onNavigate("evenements"),
        },
        {
          icon: "🎙",
          title: "Publier un sermon",
          subtitle: "Ajouter un message",
          onClick: () => onNavigate("sermons"),
        },
        {
          icon: "✍️",
          title: "Publier un article",
          subtitle: "Ajouter au blog",
          onClick: () => onNavigate("blog"),
        },
        {
          icon: "⛪",
          title: "Ajouter une église",
          subtitle: "Nouvelle église",
          onClick: () => onNavigate("eglises"),
        },
      ]
    : [];

  return (
    <div className={styles.panel}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Tableau de bord</h1>
        <p className={styles.pageSubtitle}>{today}</p>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      {!stats ? (
        <div className={styles.loader}>Chargement des statistiques…</div>
      ) : (
        <>
          <div className={`${styles.attentionBanner} ${totalAttention === 0 ? styles.allClear : ""}`}>
            {totalAttention === 0
              ? "✓ Aucun élément ne nécessite votre attention aujourd'hui."
              : `Vous avez ${totalAttention} élément${totalAttention > 1 ? "s" : ""} qui nécessite${totalAttention > 1 ? "nt" : ""} votre attention aujourd'hui.`}
          </div>

          {/* Cartes d'alerte */}
          <div className={styles.kpiGrid}>
            <button className={styles.kpiLink} onClick={() => onNavigate("membres")}>
              <KpiCard
                color="amber"
                icon={<IconClock />}
                value={stats.membres_pending}
                label="Membres en attente"
                sub="à approuver"
              />
            </button>
            <button className={styles.kpiLink} onClick={() => onNavigate("prieres")}>
              <KpiCard
                color="violet"
                icon={<IconBell />}
                value={stats.prieres.pending}
                label="Demandes de prière"
                sub="en attente"
              />
            </button>
            <button className={styles.kpiLink} onClick={() => onNavigate("benevolat")}>
              <KpiCard
                color="blue"
                icon={<IconHandHeart />}
                value={stats.benevolat.pending}
                label="Demandes de bénévolat"
                sub="en attente"
              />
            </button>
          </div>

          {/* Actions rapides */}
          <p className={styles.sectionTitle}>Actions rapides</p>
          <div className={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <QuickActionCard key={action.title} action={action} />
            ))}
          </div>

          {/* Activité récente */}
          <div className={styles.activityCard}>
            <div className={styles.sectionTitle}>Activité récente</div>
            {stats.recent_activity.length === 0 ? (
              <p className={styles.emptyState}>Aucune activité récente</p>
            ) : (
              <div className={styles.activityList}>
                {stats.recent_activity.map((a, i) => (
                  <button
                    key={i}
                    className={styles.activityRow}
                    onClick={() => onNavigate(ACTIVITY_SECTION[a.type])}
                  >
                    <span className={styles.activityIcon}>{ACTIVITY_ICON[a.type] ?? "•"}</span>
                    <span className={styles.activityLabel}>{a.label}</span>
                    <span className={styles.activityDate}>{formatDateTime(a.date)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
