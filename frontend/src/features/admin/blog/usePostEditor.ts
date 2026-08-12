// Rédaction d'un article, à la création comme à la modification. Raison de
// changer : ce que l'on demande au rédacteur et ce qu'on enregistre pour lui.
import { useState } from "react";
import { deletePostCover, uploadPostCover } from "../../../lib/api/posts";
import { usePosts } from "../../../hooks/usePosts";
import { EMPTY_POST } from "./postDefaults";
import type { Post, PostInput } from "../../../types";

type PostsApi = ReturnType<typeof usePosts>;

const REQUIRED_MSG = "Titre, contenu et auteur sont requis.";

function isIncomplete(form: PostInput): boolean {
  return !form.title.trim() || !form.content.trim() || !form.author.trim();
}

/** Les champs facultatifs vides ne sont pas envoyés. */
function toPayload(form: PostInput): PostInput {
  return {
    ...form,
    excerpt: form.excerpt?.trim() || undefined,
    category: form.category?.trim() || undefined,
  };
}

export function useCreatePost(add: PostsApi["add"], onSaved: (title: string) => void) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PostInput>(EMPTY_POST);
  const [cover, setCover] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openModal() {
    setForm(EMPTY_POST);
    setCover(null);
    setError("");
    setOpen(true);
  }

  function update(patch: Partial<PostInput>) {
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
      const created = await add(toPayload(form));
      if (cover) await uploadPostCover(created.id, cover);
      setForm(EMPTY_POST);
      setCover(null);
      setOpen(false);
      onSaved(created.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  }

  return {
    open,
    form,
    cover,
    saving,
    error,
    openModal,
    close: () => setOpen(false),
    update,
    setCover,
    submit,
  };
}

export function useEditPost(edit: PostsApi["edit"], onSaved: (title: string) => void) {
  const [post, setPost] = useState<Post | null>(null);
  const [form, setForm] = useState<PostInput>(EMPTY_POST);
  const [cover, setCover] = useState<File | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function open(p: Post) {
    setPost(p);
    setForm({
      title: p.title,
      content: p.content,
      excerpt: p.excerpt ?? "",
      author: p.author,
      status: p.status,
      category: p.category ?? "",
    });
    setCover(null);
    setCoverRemoved(false);
    setError("");
  }

  function update(patch: Partial<PostInput>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  /** Reposer un fichier annule une suppression demandée juste avant. */
  function changeCover(file: File | null) {
    setCover(file);
    if (!file) setCoverRemoved(false);
  }

  function removeCover() {
    setCoverRemoved(true);
    setCover(null);
  }

  async function submit() {
    if (!post) return;
    if (isIncomplete(form)) {
      setError(REQUIRED_MSG);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await edit(post.id, {
        title: form.title,
        content: form.content,
        excerpt: form.excerpt?.trim() || undefined,
        author: form.author,
        status: form.status,
        category: form.category?.trim() || undefined,
      });
      if (cover) {
        await uploadPostCover(post.id, cover);
      } else if (coverRemoved && post.cover_image_url) {
        await deletePostCover(post.id);
      }
      setPost(null);
      onSaved(form.title.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la modification");
    } finally {
      setSaving(false);
    }
  }

  return {
    post,
    form,
    cover,
    coverRemoved,
    saving,
    error,
    open,
    close: () => setPost(null),
    update,
    changeCover,
    removeCover,
    submit,
  };
}
