// Rédaction d'une actualité, à la création comme à la modification. Raison de
// changer : ce que l'on demande au rédacteur et ce qu'on enregistre pour lui.
import { useState } from "react";
import { deleteNewsCover, uploadNewsCover } from "../../../lib/api/news";
import { useNews } from "../../../hooks/useNews";
import { EMPTY_NEWS } from "./newsDefaults";
import type { News, NewsInput } from "../../../types";

type NewsApi = ReturnType<typeof useNews>;

const REQUIRED_MSG = "Titre, contenu et auteur sont requis.";

function isIncomplete(form: NewsInput): boolean {
  return !form.title.trim() || !form.content.trim() || !form.author.trim();
}

export function useCreateNews(add: NewsApi["add"], onSaved: (title: string) => void) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewsInput>(EMPTY_NEWS);
  const [cover, setCover] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openModal() {
    setForm(EMPTY_NEWS);
    setCover(null);
    setError("");
    setOpen(true);
  }

  function update(patch: Partial<NewsInput>) {
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
      const created = await add({
        ...form,
        excerpt: form.excerpt?.trim() || undefined,
        category: form.category?.trim() || undefined,
      });
      if (cover) await uploadNewsCover(created.id, cover);
      setForm(EMPTY_NEWS);
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

export function useEditNews(edit: NewsApi["edit"], onSaved: (title: string) => void) {
  const [news, setNews] = useState<News | null>(null);
  const [form, setForm] = useState<NewsInput>(EMPTY_NEWS);
  const [cover, setCover] = useState<File | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function open(n: News) {
    setNews(n);
    setForm({
      title: n.title,
      content: n.content,
      excerpt: n.excerpt ?? "",
      author: n.author,
      status: n.status,
      category: n.category ?? "",
      is_featured: n.is_featured,
      position: n.position,
    });
    setCover(null);
    setCoverRemoved(false);
    setError("");
  }

  function update(patch: Partial<NewsInput>) {
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
    if (!news) return;
    if (isIncomplete(form)) {
      setError(REQUIRED_MSG);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await edit(news.id, {
        title: form.title,
        content: form.content,
        excerpt: form.excerpt?.trim() || undefined,
        author: form.author,
        status: form.status,
        category: form.category?.trim() || undefined,
        is_featured: form.is_featured,
        position: form.position,
      });
      if (cover) {
        await uploadNewsCover(news.id, cover);
      } else if (coverRemoved && news.cover_image_url) {
        await deleteNewsCover(news.id);
      }
      setNews(null);
      onSaved(form.title.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la modification");
    } finally {
      setSaving(false);
    }
  }

  return {
    news,
    form,
    cover,
    coverRemoved,
    saving,
    error,
    open,
    close: () => setNews(null),
    update,
    changeCover,
    removeCover,
    submit,
  };
}
