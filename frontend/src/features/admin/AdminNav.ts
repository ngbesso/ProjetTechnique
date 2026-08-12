// Composition du menu latéral de l'administration. Raison de changer : les
// modules offerts et les droits qui conditionnent leur affichage.
import type { ComponentType } from "react";
import {
  IconBot,
  IconBriefcase,
  IconCalendar,
  IconChurch,
  IconClipboardList,
  IconCreditCard,
  IconDollar,
  IconFileText,
  IconGift,
  IconHeart,
  IconKey,
  IconLayoutDashboard,
  IconMic,
  IconNewspaper,
  IconPen,
  IconSettings,
  IconSparkles,
  IconTicket,
  IconTrendingUp,
  IconUserPlus,
  IconUsers,
} from "../../components/ui/icons";

export type Section =
  | "dashboard"
  | "membres"
  | "anniversaires"
  | "ministeres"
  | "eglises"
  | "leadership"
  | "finances-revenus"
  | "finances-depenses"
  | "finances-rapport"
  | "sermons"
  | "blog"
  | "actualites"
  | "evenements"
  | "organisateurs"
  | "prieres"
  | "benevolat"
  | "demandes-membres"
  | "pages"
  | "utilisateurs"
  | "parametres"
  | "assistant";

export interface NavItem {
  id: Section;
  label: string;
  /** Icône vectorielle plutôt qu'un emoji : le rendu des emojis dépend du
   *  système et donne un aspect non fini. */
  icon: ComponentType;
  globalOnly?: boolean;
  group?: string;
}

export const ALL_NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Tableau de bord", icon: IconLayoutDashboard },
  { id: "membres", label: "Membres", icon: IconUsers, group: "Communauté" },
  { id: "anniversaires", label: "Anniversaires", icon: IconGift, globalOnly: true, group: "Communauté" },
  { id: "ministeres", label: "Ministères", icon: IconSparkles, group: "Communauté" },
  { id: "eglises", label: "Églises", icon: IconChurch, globalOnly: true, group: "Organisation" },
  { id: "leadership", label: "Leadership", icon: IconBriefcase, globalOnly: true, group: "Organisation" },
  { id: "finances-revenus", label: "Revenus", icon: IconDollar, globalOnly: true, group: "Finances" },
  { id: "finances-depenses", label: "Dépenses", icon: IconCreditCard, globalOnly: true, group: "Finances" },
  { id: "finances-rapport", label: "Rapport", icon: IconTrendingUp, globalOnly: true, group: "Finances" },
  { id: "sermons", label: "Sermons", icon: IconMic, group: "Contenu" },
  { id: "blog", label: "Blog", icon: IconPen, group: "Contenu" },
  { id: "actualites", label: "Actualités", icon: IconNewspaper, group: "Contenu" },
  { id: "evenements", label: "Événements", icon: IconCalendar, group: "Contenu" },
  { id: "organisateurs", label: "Organisateurs", icon: IconTicket, globalOnly: true, group: "Contenu" },
  { id: "prieres", label: "Demandes de prière", icon: IconHeart, group: "Demandes" },
  { id: "benevolat", label: "Bénévolat", icon: IconUserPlus, group: "Demandes" },
  { id: "demandes-membres", label: "Demandes des membres", icon: IconClipboardList, group: "Demandes" },
  { id: "pages", label: "Pages & Menu", icon: IconFileText, globalOnly: true, group: "Système" },
  { id: "utilisateurs", label: "Utilisateurs", icon: IconKey, globalOnly: true, group: "Système" },
  { id: "parametres", label: "Paramètres", icon: IconSettings, globalOnly: true, group: "Système" },
  { id: "assistant", label: "Assistant IA", icon: IconBot, globalOnly: true },
];

/** Entrées visibles pour un utilisateur donné : un organisateur pur n'accède
 *  qu'aux Événements, les entrées globalOnly sont réservées à l'admin global. */
export function visibleNavItems(
  items: NavItem[],
  { isGlobalAdmin, isOrganisateurOnly }: { isGlobalAdmin: boolean; isOrganisateurOnly: boolean },
): NavItem[] {
  if (isOrganisateurOnly) return items.filter((item) => item.id === "evenements");
  return items.filter((item) => !item.globalOnly || isGlobalAdmin);
}

export interface NavSection {
  group?: string;
  items: NavItem[];
}

/** Découpe la liste plate en tranches consécutives partageant un même groupe.
 *  Les entrées hors groupe forment leurs propres tranches. Sert à ce que le
 *  filet vertical puisse courir le long d'un groupe entier. */
export function toNavSections(items: NavItem[]): NavSection[] {
  const sections: NavSection[] = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    if (last && last.group === item.group) last.items.push(item);
    else sections.push({ group: item.group, items: [item] });
  }
  return sections;
}

/** Groupe à déplier pour que la section active soit visible. */
export function groupOf(section: Section): string | undefined {
  return ALL_NAV_ITEMS.find((i) => i.id === section)?.group;
}
