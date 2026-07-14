import { useState, useCallback } from "react";
import type { Post, PostInput } from "../types";
import {
  fetchPosts,
  fetchPostsAdmin,
  createPost,
  updatePost,
  deletePost,
} from "../lib/api/posts";

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (params?: { q?: string; category?: string; limit?: number; offset?: number }) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchPosts(params);
        setPosts(res.items);
        setTotal(res.total);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const loadAdmin = useCallback(
    async (params?: { q?: string; category?: string; status?: string; limit?: number; offset?: number }) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchPostsAdmin(params);
        setPosts(res.items);
        setTotal(res.total);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const add = useCallback(async (data: PostInput) => {
    const created = await createPost(data);
    setPosts((prev) => [created, ...prev]);
    return created;
  }, []);

  const edit = useCallback(async (id: number, data: Partial<PostInput>) => {
    const updated = await updatePost(id, data);
    setPosts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, []);

  const remove = useCallback(async (id: number) => {
    await deletePost(id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { posts, total, loading, error, load, loadAdmin, add, edit, remove };
}
