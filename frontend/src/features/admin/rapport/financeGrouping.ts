// Lecture des transactions par catégorie. Raison de changer : la façon dont on
// agrège les mouvements financiers pour les présenter.
import { CATEGORY_LABELS as DONATION_CATEGORY_LABELS } from "../revenus/donationLabels";
import type { FinanceTransaction } from "../../../types";

// Les dons stockent une catégorie sous forme de slug (soutien_spirituel...) ;
// les dépenses stockent déjà un libellé français lisible — rien à traduire
// de ce côté.
export function categoryLabel(tx: FinanceTransaction): string {
  return tx.type === "revenu"
    ? (DONATION_CATEGORY_LABELS[tx.category] ?? tx.category)
    : tx.category;
}

export interface CategoryGroup {
  key: string;
  category: string;
  type: FinanceTransaction["type"];
  currency: string;
  total: number;
  count: number;
}

/** Regroupe par (type, catégorie, devise) — jamais additionner CAD et USD
 * dans un même sous-total, sous peine de montant faux et trompeur. */
export function groupByCategory(transactions: FinanceTransaction[]): CategoryGroup[] {
  const map = new Map<string, CategoryGroup>();
  for (const t of transactions) {
    const category = categoryLabel(t);
    const key = `${t.type}::${category}::${t.currency}`;
    const existing = map.get(key);
    if (existing) {
      existing.total += t.amount;
      existing.count += 1;
    } else {
      map.set(key, {
        key,
        category,
        type: t.type,
        currency: t.currency,
        total: t.amount,
        count: 1,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/** Transactions composant un groupe, reprises des données déjà chargées. */
export function transactionsOf(
  transactions: FinanceTransaction[],
  group: CategoryGroup,
): FinanceTransaction[] {
  return transactions.filter(
    (t) =>
      t.type === group.type &&
      t.currency === group.currency &&
      categoryLabel(t) === group.category,
  );
}
