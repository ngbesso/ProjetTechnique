import styles from "../EspacePage.module.css";
import { initialsOf, statusLabel } from "./profileLabels";
import type { Member } from "../../../types";

type HeroFields = Pick<
  Member,
  "first_name" | "last_name" | "status" | "member_code" | "church_id"
>;

interface ProfileHeroProps {
  values: HeroFields;
  churchName: (id: number | null | undefined) => string;
}

export function ProfileHero({ values, churchName }: ProfileHeroProps) {
  return (
    <div className={styles.hero}>
      <div className={styles.avatar}>{initialsOf(values.first_name, values.last_name)}</div>
      <div className={styles.heroInfo}>
        <p className={styles.heroName}>{values.first_name} {values.last_name}</p>
        <div className={styles.heroMeta}>
          <span className={`${styles.statusBadge} ${styles[values.status] ?? ""}`}>
            {statusLabel(values.status)}
          </span>
          {values.member_code && <span className={styles.memberCode}>{values.member_code}</span>}
          <span className={styles.churchTag}>⛪ {churchName(values.church_id)}</span>
        </div>
      </div>
    </div>
  );
}
