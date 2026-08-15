// ── Téléphone ─────────────────────────────────────────────────────────────────
// Accepte les formats nord-américains et internationaux.
// Caractères autorisés : chiffres, espaces, tirets, parenthèses, point, +
// Le nombre de chiffres (sans ponctuation) doit être compris entre 7 et 15.

/** Vérifie uniquement le jeu de caractères, pour un retour immédiat pendant
 * la saisie (avant même que le nombre de chiffres soit connu). */
export function validatePhoneFormat(value: string): string | null {
  if (!value.trim()) return null; // champ optionnel
  if (!/^[+\d\s\-.()[\]]+$/.test(value)) {
    return "Le téléphone ne peut contenir que des chiffres, espaces, tirets, parenthèses ou le signe +.";
  }
  return null;
}

export function validatePhone(value: string): string | null {
  const formatError = validatePhoneFormat(value);
  if (formatError) return formatError;
  if (!value.trim()) return null; // champ optionnel
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) {
    return "Le numéro doit contenir au moins 7 chiffres (ex. : 514-123-4567).";
  }
  if (digits.length > 15) {
    return "Le numéro ne peut pas dépasser 15 chiffres.";
  }
  return null;
}

// Filtre appliqué au fil de la saisie (onChange) : retire immédiatement tout
// caractère qui ne serait de toute façon jamais valide dans un téléphone
// (lettres, symboles...), plutôt que d'attendre la validation au submit pour
// signaler l'erreur. Les caractères autorisés reprennent exactement ceux de
// validatePhone ci-dessus.
export function sanitizePhoneInput(value: string): string {
  return value.replace(/[^+\d\s\-.()[\]]/g, "");
}

// ── Courriel ──────────────────────────────────────────────────────────────────

export function validateEmail(value: string): string | null {
  if (!value.trim()) return "L'adresse courriel est requise.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())) {
    return "L'adresse courriel doit être au format nom@domaine.ca (ex. : jean.dupont@exemple.com).";
  }
  return null;
}

export function validateEmailOptional(value: string): string | null {
  if (!value.trim()) return null;
  return validateEmail(value);
}

// ── Nom / prénom ─────────────────────────────────────────────────────────────
// Doit contenir au moins une lettre : rejette un nom composé uniquement de
// chiffres (ex. "12345"), sans interdire les tirets, apostrophes ou espaces
// (ex. "Jean-Pierre", "O'Brien").

export function validateName(value: string): string | null {
  if (!value.trim()) return "Ce champ est requis.";
  if (!/\p{L}/u.test(value)) {
    return "Doit contenir au moins une lettre.";
  }
  return null;
}

// ── Adresse ───────────────────────────────────────────────────────────────────
// Format attendu : numéro de rue + nom de rue (minimum 5 caractères).

export function validateAddress(value: string): string | null {
  if (!value.trim()) return null; // champ optionnel
  if (value.trim().length < 5) {
    return "L'adresse doit contenir au moins 5 caractères (ex. : 123 Rue principale, Montréal, QC).";
  }
  return null;
}
