// Substitution de jetons {nom} dans les textes configurables par l'admin
// (messages d'événement et d'anniversaire, valeurs des statistiques d'accueil).
// Pendant du render_template() backend : simple remplacement de chaîne, jamais
// d'erreur sur une accolade littérale laissée dans le texte.

/**
 * Remplace chaque `{clé}` par sa valeur. Les jetons absents de `values` sont
 * laissés intacts — utiliser `stripTokens` pour les effacer quand la donnée
 * n'est pas disponible.
 */
export function renderTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.split(`{${key}}`).join(value),
    template,
  );
}

/** Efface les jetons `{…}` restants, pour ne jamais afficher « {eglises} » à
 *  l'écran quand la substitution n'a pas pu être faite. */
export function stripTokens(template: string): string {
  return template.replace(/\{[^{}]*\}/g, "").trim();
}
