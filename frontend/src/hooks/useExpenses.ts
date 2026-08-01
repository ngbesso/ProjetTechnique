import { useState, useCallback } from "react";
import type { Expense, ExpenseInput } from "../types";
import {
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../lib/api/expenses";

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (params?: { q?: string; category?: string; start?: string; end?: string }) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchExpenses(params);
        setExpenses(res.items);
        setTotal(res.total);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const add = useCallback(async (data: ExpenseInput) => {
    const created = await createExpense(data);
    setExpenses((prev) => [created, ...prev]);
    return created;
  }, []);

  const edit = useCallback(async (id: number, data: Partial<ExpenseInput>) => {
    const updated = await updateExpense(id, data);
    setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  }, []);

  const remove = useCallback(async (id: number) => {
    await deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { expenses, total, loading, error, load, add, edit, remove };
}
