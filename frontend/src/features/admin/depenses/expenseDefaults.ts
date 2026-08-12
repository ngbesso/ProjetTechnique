// Valeurs de départ d'une dépense. Raison de changer : ce qu'on propose par
// défaut à la saisie.
import type { ExpenseInput } from "../../../types";

export const EMPTY_EXPENSE: ExpenseInput = {
  amount: 0,
  expense_date: new Date().toISOString().slice(0, 10),
  category: "",
  comment: "",
};
