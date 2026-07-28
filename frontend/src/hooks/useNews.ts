import { useState, useCallback } from "react";
import type { News, NewsInput } from "../types";
import {
  fetchNews,
  fetchNewsAdmin,
  createNews,
  updateNews,
  deleteNews,
} from "../lib/api/news";
import { useAsyncList } from "./useAsyncList";

export function useNews() {
  const [news, setNews] = useState<News[]>([]);
  const [total, setTotal] = useState(0);
  const { loading, error, run } = useAsyncList();

  const load = useCallback(
    (params?: { q?: string; category?: string; limit?: number; offset?: number }) =>
      run(async () => {
        const res = await fetchNews(params);
        setNews(res.items);
        setTotal(res.total);
      }),
    [run],
  );

  const loadAdmin = useCallback(
    (params?: { q?: string; category?: string; status?: string; limit?: number; offset?: number }) =>
      run(async () => {
        const res = await fetchNewsAdmin(params);
        setNews(res.items);
        setTotal(res.total);
      }),
    [run],
  );

  const add = useCallback(async (data: NewsInput) => {
    const created = await createNews(data);
    setNews((prev) => [created, ...prev]);
    return created;
  }, []);

  const edit = useCallback(async (id: number, data: Partial<NewsInput>) => {
    const updated = await updateNews(id, data);
    setNews((prev) => prev.map((n) => (n.id === id ? updated : n)));
    return updated;
  }, []);

  const remove = useCallback(async (id: number) => {
    await deleteNews(id);
    setNews((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { news, total, loading, error, load, loadAdmin, add, edit, remove };
}
