import { useState, useCallback } from "react";
import type { Post, PostInput } from "../types";
import {
  fetchPosts,
  fetchPostsAdmin,
  createPost,
  updatePost,
  deletePost,
} from "../lib/api/posts";
import { useAsyncList } from "./useAsyncList";

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const { loading, error, run } = useAsyncList();

  const load = useCallback(
    (params?: { q?: string; category?: string; limit?: number; offset?: number }) =>
      run(async () => {
        const res = await fetchPosts(params);
        setPosts(res.items);
        setTotal(res.total);
      }),
    [run],
  );

  const loadAdmin = useCallback(
    (params?: { q?: string; category?: string; status?: string; limit?: number; offset?: number }) =>
      run(async () => {
        const res = await fetchPostsAdmin(params);
        setPosts(res.items);
        setTotal(res.total);
      }),
    [run],
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
