// Saisie d'une dépense, à la création comme à la modification. Raison de
// changer : ce qu'on exige d'une dépense et ce qu'on enregistre pour elle.
import { useState } from "react";
import { uploadExpenseAttachment } from "../../../lib/api/expenses";
import { useExpenses } from "../../../hooks/useExpenses";
import { EMPTY_EXPENSE } from "./expenseDefaults";
import type { Expense, ExpenseInput } from "../../../types";

type ExpensesApi = ReturnType<typeof useExpenses>;

const REQUIRED_MSG = "Montant, catégorie et commentaire (justification) sont requis.";

function isIncomplete(form: ExpenseInput): boolean {
  return !form.category || !form.comment.trim() || form.amount <= 0;
}

export function useCreateExpense(add: ExpensesApi["add"], onSaved: (category: string) => void) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ExpenseInput>(EMPTY_EXPENSE);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openModal() {
    setForm(EMPTY_EXPENSE);
    setAttachment(null);
    setError("");
    setOpen(true);
  }

  function update(patch: Partial<ExpenseInput>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  async function submit() {
    if (isIncomplete(form)) {
      setError(REQUIRED_MSG);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await add(form);
      if (attachment) await uploadExpenseAttachment(created.id, attachment);
      setOpen(false);
      onSaved(created.category);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  }

  return {
    open,
    form,
    saving,
    error,
    openModal,
    close: () => setOpen(false),
    update,
    setAttachment,
    submit,
  };
}

export function useEditExpense(edit: ExpensesApi["edit"], onSaved: (category: string) => void) {
  const [expense, setExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseInput>(EMPTY_EXPENSE);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function open(exp: Expense) {
    setExpense(exp);
    setForm({
      amount: exp.amount,
      expense_date: exp.expense_date,
      category: exp.category,
      comment: exp.comment,
    });
    setAttachment(null);
    setError("");
  }

  function update(patch: Partial<ExpenseInput>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  async function submit() {
    if (!expense) return;
    if (isIncomplete(form)) {
      setError(REQUIRED_MSG);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await edit(expense.id, form);
      if (attachment) await uploadExpenseAttachment(expense.id, attachment);
      setExpense(null);
      onSaved(form.category);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la modification");
    } finally {
      setSaving(false);
    }
  }

  return {
    expense,
    form,
    saving,
    error,
    open,
    close: () => setExpense(null),
    update,
    setAttachment,
    submit,
  };
}
