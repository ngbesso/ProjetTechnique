import { useEffect, useState } from "react";
import { fetchPublicSettings } from "../lib/api/settings";
import { fetchMenu } from "../lib/api/content";
import type { MenuItem } from "../types";

// Valeurs de repli — identiques au contenu historiquement codé en dur, pour
// que le site public ne montre jamais une section vide si le fetch échoue
// ou si une clé n'est pas encore initialisée en base.
const ABOUT_WELCOME =
  "L'Église Évangélique de la Nouvelle Jérusalem du Canada (EENOJEC) est une " +
  "congrégation chrétienne évangélique établie à Montréal, Québec, Canada, dirigée " +
  "par un conseil d'Anciens dont le président et pasteur principal est le " +
  "Dr Bruel Gérançon. Nous sommes une Église qui adore Dieu en esprit et en vérité, " +
  "et qui dispense fidèlement la parole de Dieu, dans le but de former des disciples " +
  "pour Christ dans toutes les nations.";

const DEFAULT_SETTINGS = {
  site_name: "Église Évangélique de la Nouvelle Jérusalem du Canada",
  site_tagline: "EENOJEC — Montréal, Québec",
  site_logo_url: "",
  hero_eyebrow: "Une famille de foi, au-delà des frontières",
  hero_title: "Bienvenue dans notre communauté de foi",
  hero_subtitle:
    "Adorer Dieu en esprit et en vérité, dispenser fidèlement sa parole, et former des disciples pour Christ dans toutes les nations.",
  about_eyebrow: "Qui sommes-nous",
  about_title: "Ce qui nous rassemble et nous guide",
  about_description: ABOUT_WELCOME,

  // Les 5 piliers résumés sur l'accueil.
  pillar_vision_label: "Vision",
  pillar_vision_desc: "Former des disciples pour Christ, jusqu'à la stature parfaite de Christ.",
  pillar_mission_label: "Mission",
  pillar_mission_desc: "Adorer, édifier, secourir et évangéliser pour former des disciples.",
  pillar_valeurs_label: "Valeurs",
  pillar_valeurs_desc: "Six engagements qui façonnent notre vie d'Église.",
  pillar_credo_label: "Crédo",
  pillar_credo_desc: "Les onze points de la foi que nous confessons.",
  pillar_principes_label: "Principes",
  pillar_principes_desc: "Fidélité à la parole, rigueur dans l'étude, croissance du disciple.",

  // Page « Qui sommes-nous ». Les trois listes fonctionnent en
  // « une ligne = un élément » ; une section vide n'est pas rendue.
  about_page_eyebrow: "Qui sommes-nous",
  about_page_title: "Notre identité",
  about_welcome: ABOUT_WELCOME,
  about_vision_text:
    "Former des disciples pour Christ en les enseignant et les instruisant en toute sagesse afin qu'ils parviennent à la mesure de la stature parfaite de Christ.",
  about_mission_text:
    "Glorifier Dieu par une adoration authentique, par l'édification des frères et sœurs, par la manifestation de la compassion envers tous, ainsi que par l'évangélisation des perdus, dans le but de former des disciples pour Christ.",
  about_valeurs_list: [
    "Une église remplie de l'Esprit Saint",
    "Une église qui s'attache aux saines paroles du Seigneur Jésus-Christ",
    "Une église qui étudie la parole de Dieu et la met en pratique",
    "Une église qui cultive une vie de prière",
    "Une église qui glorifie Dieu et témoigne de sa grâce",
    "Une église qui persévère dans la communion fraternelle",
  ].join("\n"),
  about_principes_list: [
    "La fidélité à la parole de Dieu et à la proclamation de l'Évangile centrée sur Christ",
    "La rigueur dans l'étude des Écritures",
    "La nécessité de la croissance et de la maturité spirituelles du disciple de Jésus-Christ",
  ].join("\n"),
  about_credo_list: [
    "Nous croyons en un seul Dieu existant en trois personnes distinctes : le Père, le Fils et le Saint-Esprit",
    "Nous croyons que Dieu est le créateur de l'univers",
    "Nous croyons que la Bible est inspirée de Dieu",
    "Nous croyons que la Bible est le seul livre sacré faisant autorité absolue en matière de foi",
    "Nous croyons que Jésus-Christ est Dieu fait homme",
    "Nous croyons que Jésus-Christ est mort et ressuscité pour le pardon de nos péchés et qu'il reviendra à la fin des temps",
    "Nous croyons à la résurrection des morts, à la vie éternelle et au jugement dernier",
    "Nous croyons que la vie éternelle s'obtient uniquement par la grâce, au moyen de la foi en Jésus-Christ",
    "Nous croyons que le Saint-Esprit est celui promis par le Père, répandu par le Fils",
    "Nous croyons que le Saint-Esprit habite éternellement en chaque croyant",
    "Nous croyons que toute personne qui professe la foi en Jésus-Christ doit être baptisée par immersion",
  ].join("\n"),

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
