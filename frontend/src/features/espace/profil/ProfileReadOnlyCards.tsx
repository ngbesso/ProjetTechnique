import admin from "../../admin/AdminPage.module.css";
import styles from "../EspacePage.module.css";
import { formatLongDate } from "../../../lib/format";
import { ReadOnlyField } from "../ReadOnlyField";
import { DASH, orDash, statusLabel } from "./profileLabels";
import type { Member } from "../../../types";

type IdentityFields = Pick<
  Member,
  "first_name" | "last_name" | "birth_date" | "email" | "sexe"
>;

interface ProfileIdentityCardProps {
  values: IdentityFields;
  onRequestChange: () => void;
}

/** Identité : modifiable seulement par l'église, sur demande du membre. */
export function ProfileIdentityCard({ values, onRequestChange }: ProfileIdentityCardProps) {
  return (
    <section className={admin.card}>
      <h3 className={admin.cardTitle}>Informations personnelles</h3>
      <div className={styles.grid2}>
        <ReadOnlyField label="Prénom" value={values.first_name} />
        <ReadOnlyField label="Nom" value={values.last_name} />
        <ReadOnlyField
          label="Date de naissance"
          value={values.birth_date ? formatLongDate(values.birth_date) : DASH}
        />
        <ReadOnlyField label="Courriel" value={values.email} />
        <ReadOnlyField label="Sexe" value={orDash(values.sexe)} />
      </div>
      <p className={styles.lockNote}>
        🔒 Pour modifier ces informations, contactez votre église.{" "}
        <button type="button" className={styles.inlineLinkBtn} onClick={onRequestChange}>
          Demander une modification
        </button>
      </p>
    </section>
  );
}

type StatusFields = Pick<Member, "status" | "member_code" | "church_id" | "is_baptized">;

interface ProfileStatusCardProps {
  values: StatusFields;
  churchName: (id: number | null | undefined) => string;
}

export function ProfileStatusCard({ values, churchName }: ProfileStatusCardProps) {
  return (
    <section className={admin.card}>
      <h3 className={admin.cardTitle}>Statut du compte</h3>
      <div className={styles.grid2}>
        <ReadOnlyField label="Statut" value={statusLabel(values.status)} />
        <ReadOnlyField label="Numéro de membre" value={orDash(values.member_code)} />
        <ReadOnlyField label="Église" value={churchName(values.church_id)} />
        <ReadOnlyField label="Baptisé(e)" value={values.is_baptized ? "Oui" : "Non"} />
      </div>
    </section>
  );
}
