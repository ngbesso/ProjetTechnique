import { http } from "./client";
import type { Expense, ExpenseInput, ExpenseListResult } from "../../types";

export function fetchExpenses(params?: {
  q?: string;
  category?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
}): Promise<ExpenseListResult> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.category) qs.set("category", params.category);
  if (params?.start) qs.set("start", params.start);
  if (params?.end) qs.set("end", params.end);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return http.get<ExpenseListResult>(`/expenses${suffix}`);
}

export function fetchExpenseCategories(): Promise<string[]> {
  return http.get<string[]>("/expenses/categories");
}

export function createExpense(data: ExpenseInput): Promise<Expense> {
  return http.post<Expense>("/expenses", data);
}

export function updateExpense(id: number, data: Partial<ExpenseInput>): Promise<Expense> {
  return http.patch<Expense>(`/expenses/${id}`, data);
}

export function deleteExpense(id: number): Promise<void> {
  return http.del(`/expenses/${id}`);
}

export function uploadExpenseAttachment(id: number, file: File): Promise<Expense> {
  const fd = new FormData();
  fd.append("file", file);
  return http.postMultipart<Expense>(`/expenses/${id}/attachment`, fd);
}

export function deleteExpenseAttachment(id: number): Promise<void> {
  return http.del(`/expenses/${id}/attachment`);
}

export function downloadExpenseAttachment(id: number): Promise<Blob> {
  return http.getBlob(`/expenses/${id}/attachment`);
}
