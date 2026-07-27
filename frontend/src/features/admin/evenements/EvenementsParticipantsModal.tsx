import adminStyles from "../AdminPage.module.css";
import styles from "../EvenementsPanel.module.css";
import { Button } from "../../../components/ui/Button";
import type { EventItem, EventRegistration } from "../../../types";

interface EvenementsParticipantsModalProps {
  event: EventItem;
  participants: EventRegistration[];
  participantsLoading: boolean;
  exporting: boolean;
  onClose: () => void;
  onExportCsv: () => void;
}

export function EvenementsParticipantsModal({
  event,
  participants,
  participantsLoading,
  exporting,
  onClose,
  onExportCsv,
}: EvenementsParticipantsModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.participantsCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.formHeader}>
          <div className={styles.formHeaderIcon}>👥</div>
          <div>
            <p className={styles.formHeaderTitle}>Participants</p>
            <p className={styles.formHeaderSub}>{event.title}</p>
          </div>
          <button
            type="button"
            className={styles.formHeaderClose}
            onClick={onClose}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        <div className={styles.participantsBody}>
          <div className={styles.participantsActions}>
            <Button type="button" variant="outline" onClick={onExportCsv} disabled={exporting}>
              {exporting ? "Export…" : "⬇ Exporter CSV"}
            </Button>
          </div>
          {participantsLoading ? (
            <p className={adminStyles.stateMsg}>Chargement…</p>
          ) : participants.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyIcon}>👥</p>
              <p className={styles.emptyText}>Aucune inscription pour le moment.</p>
            </div>
          ) : (
            participants.map((p) => (
              <div key={p.id} className={styles.participantRow}>
                <span className={styles.participantName}>{p.first_name} {p.last_name}</span>
                <span className={styles.participantMeta}>
                  {p.email} · inscrit le{" "}
                  {new Date(p.registered_at).toLocaleDateString("fr-CA")}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
