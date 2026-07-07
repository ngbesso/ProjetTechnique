// ── Téléphone ─────────────────────────────────────────────────────────────────
// Accepte les formats nord-américains et internationaux.
// Caractères autorisés : chiffres, espaces, tirets, parenthèses, point, +
// Le nombre de chiffres (sans ponctuation) doit être compris entre 7 et 15.

export function validatePhone(value: string): string | null {
  if (!value.trim()) return null; // champ optionnel
  const digits = value.replace(/\D/g, "");
  if (!/^[+\d\s\-.()\[\]]+$/.test(value)) {
    return "Le téléphone ne peut contenir que des chiffres, espaces, tirets, parenthèses ou le signe +.";
  }
  if (digits.length < 7) {
    return "Le numéro doit contenir au moins 7 chiffres (ex. : 514-123-4567).";
  }
  if (digits.length > 15) {
    return "Le numéro ne peut pas dépasser 15 chiffres.";
  }
  return null;
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

// ── Adresse ───────────────────────────────────────────────────────────────────
// Format attendu : numéro de rue + nom de rue (minimum 5 caractères).

export function validateAddress(value: string): string | null {
  if (!value.trim()) return null; // champ optionnel
  if (value.trim().length < 5) {
    return "L'adresse doit contenir au moins 5 caractères (ex. : 123 Rue principale, Montréal, QC).";
  }
  return null;
}
