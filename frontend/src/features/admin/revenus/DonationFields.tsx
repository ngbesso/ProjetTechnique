import styles from "../AdminPage.module.css";
import { CATEGORY_LABELS, CONTRIBUTION_LABELS } from "./donationLabels";
import type { Church, DonationManualInput } from "../../../types";

export type DonationFields = Pick<
  DonationManualInput,
  "amount" | "currency" | "contribution_type" | "received_on" | "category" | "church_id"
>;

interface DonationFieldsProps {
  values: DonationFields;
  onChange: (patch: Partial<DonationFields>) => void;
  churches: Church[];
}

export function DonationFieldsGroup({ values, onChange, churches }: DonationFieldsProps) {
  return (
    <>
      <input className={styles.input} type="number" step="0.01" min="0.01"
        placeholder="Montant *" required
        value={values.amount || ""}
        onChange={(e) => onChange({ amount: Number(e.target.value) })} />
      <select className={styles.select} value={values.currency}
        onChange={(e) => onChange({ currency: e.target.value as DonationManualInput["currency"] })}>
        <option value="CAD">CAD</option>
        <option value="USD">USD</option>
      </select>
      <select className={styles.select} required value={values.contribution_type}
        onChange={(e) =>
          onChange({ contribution_type: e.target.value as DonationManualInput["contribution_type"] })
        }>
        {Object.entries(CONTRIBUTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <input className={styles.input} type="date" value={values.received_on}
        onChange={(e) => onChange({ received_on: e.target.value })} />
      <select className={styles.select} value={values.category ?? ""}
        onChange={(e) =>
          onChange({ category: (e.target.value || undefined) as DonationManualInput["category"] })
        }>
        <option value="">Catégorie (optionnel)</option>
        {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <select className={styles.select} value={values.church_id ?? ""}
        onChange={(e) => onChange({ church_id: e.target.value ? Number(e.target.value) : undefined })}>
        <option value="">Église (optionnel)</option>
        {churches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </>
  );
}
