import { useEffect, useState } from "react";
import { fetchPublicSettings } from "../lib/api/settings";
import { fetchMenu } from "../lib/api/content";
import type { MenuItem } from "../types";

// Valeurs de repli — identiques au contenu historiquement codé en dur, pour
// que le site public ne montre jamais une section vide si le fetch échoue
// ou si une clé n'est pas encore initialisée en base.
const DEFAULT_SETTINGS = {
  site_name: "Mission Évangélique",
  site_tagline: "unis dans la foi",
  site_logo_url: "",
  hero_eyebrow: "Une famille de foi, au-delà des frontières",
  hero_title: "Bienvenue dans notre communauté de foi",
  hero_subtitle:
    "Des Églises affiliées partout, une mission commune — servir, former et rayonner ensemble.",
  about_eyebrow: "Qui sommes-nous",
  about_title: "Ce qui nous rassemble et nous guide",
  about_description:
    "Fondée il y a plus de 40 ans, Mission Évangélique fédère des centaines d'Églises autour d'une vision commune : faire des disciples dans chaque communauté et chaque nation.",
  social_youtube_url: "",
  social_facebook_url: "",
  social_instagram_url: "",
  social_whatsapp_url: "",
};

export type SiteSettings = typeof DEFAULT_SETTINGS;

const DEFAULT_MENU: MenuItem[] = [
  { id: -1, label: "Accueil", target_page: "home", position: 0, is_visible: true },
  { id: -2, label: "Leadership", target_page: "leadership", position: 1, is_visible: true },
  { id: -3, label: "Sermons", target_page: "sermons", position: 2, is_visible: true },
  { id: -4, label: "Blog", target_page: "blog", position: 3, is_visible: true },
  { id: -5, label: "Actualités", target_page: "actualites", position: 4, is_visible: true },
  { id: -6, label: "Événements", target_page: "evenements", position: 5, is_visible: true },
  { id: -7, label: "Faire un don", target_page: "donation", position: 6, is_visible: true },
];

export function useSiteContent() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [menu, setMenu] = useState<MenuItem[]>(DEFAULT_MENU);

  useEffect(() => {
    fetchPublicSettings()
      .then((data) => setSettings((prev) => ({ ...prev, ...(data as Partial<SiteSettings>) })))
      .catch(() => {});
    fetchMenu()
      .then((items) => {
        if (items.length > 0) setMenu(items);
      })
      .catch(() => {});
  }, []);

  return { settings, menu };
}
