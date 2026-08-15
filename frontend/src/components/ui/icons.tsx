// Icônes SVG partagées, réutilisées par les panneaux admin (KPI, badges de
// statut, actions) — évite de redéfinir la même icône dans chaque panneau.

export function IconCheckCircle() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10" />
      <polyline points="8 12 11 15 16 9" />
    </svg>
  );
}

export function IconXCircle() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

export function IconFileEdit() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M12 18l4-4-1.5-1.5L10.5 16.5V18H12z" />
    </svg>
  );
}

export function IconEye() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Œil barré — état « mot de passe visible » du bouton de révélation. */
export function IconEyeOff() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M6.61 6.61A18.15 18.15 0 0 0 1 12s4 8 11 8a9.12 9.12 0 0 0 5.39-1.61" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export function IconClock() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function IconTrendingUp() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

export function IconDollar() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

export function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

export function IconUser() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// ── Icônes de navigation (menu latéral de l'administration) ──────────────────

export function IconLayoutDashboard() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

export function IconGift() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M5 12v9h14v-9" />
      <line x1="12" y1="8" x2="12" y2="21" />
      <path d="M12 8S10.5 3 8 3a2.5 2.5 0 0 0 0 5z" />
      <path d="M12 8s1.5-5 4-5a2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}

export function IconSparkles() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
      <path d="M18 15l.9 2.1 2.1.9-2.1.9L18 21l-.9-2.1-2.1-.9 2.1-.9z" />
    </svg>
  );
}

export function IconChurch() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <line x1="12" y1="2" x2="12" y2="8" />
      <line x1="9" y1="5" x2="15" y2="5" />
      <path d="M12 8l-6 4v9h12v-9z" />
      <path d="M10 21v-5h4v5" />
    </svg>
  );
}

export function IconBriefcase() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <line x1="2" y1="13" x2="22" y2="13" />
    </svg>
  );
}

export function IconCreditCard() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="6" y1="15" x2="10" y2="15" />
    </svg>
  );
}

export function IconMic() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  );
}

export function IconPen() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <line x1="12" y1="20" x2="21" y2="20" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

export function IconNewspaper() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 4h13a1 1 0 0 1 1 1v14a2 2 0 0 0 2 2H5a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1z" />
      <path d="M18 8h2a1 1 0 0 1 1 1v10a2 2 0 0 1-2 2" />
      <line x1="7" y1="8" x2="14" y2="8" />
      <line x1="7" y1="12" x2="14" y2="12" />
      <line x1="7" y1="16" x2="11" y2="16" />
    </svg>
  );
}

export function IconTicket() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6z" />
      <line x1="13" y1="6" x2="13" y2="18" strokeDasharray="2 3" />
    </svg>
  );
}

export function IconUserPlus() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

export function IconClipboardList() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <line x1="8" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="14" y2="15" />
    </svg>
  );
}

export function IconFileText() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  );
}

export function IconKey() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="7.5" cy="15.5" r="4.5" />
      <line x1="10.8" y1="12.2" x2="21" y2="2" />
      <path d="M15.5 7.5l3 3L21.5 7.5l-3-3" />
    </svg>
  );
}

export function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function IconBot() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <line x1="12" y1="8" x2="12" y2="5" />
      <circle cx="12" cy="4" r="1" />
      <line x1="9" y1="13" x2="9" y2="14" />
      <line x1="15" y1="13" x2="15" y2="14" />
      <line x1="2" y1="14" x2="4" y2="14" />
      <line x1="20" y1="14" x2="22" y2="14" />
    </svg>
  );
}

// ── Icônes des piliers « Qui sommes-nous » ───────────────────────────────────

export function IconTarget() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}

export function IconGem() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 3h12l4 6-10 12L2 9z" />
      <path d="M2 9h20" />
      <path d="M12 21L8 9l2-6" />
      <path d="M12 21l4-12-2-6" />
    </svg>
  );
}

export function IconBook() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <line x1="4" y1="17.5" x2="20" y2="17.5" />
      <line x1="12" y1="2" x2="12" y2="17.5" />
    </svg>
  );
}

export function IconScale() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <line x1="12" y1="4" x2="12" y2="21" />
      <line x1="7" y1="21" x2="17" y2="21" />
      <line x1="4" y1="7" x2="20" y2="7" />
      <circle cx="12" cy="4" r="1.5" />
      <path d="M4 7l-2.5 5a2.5 2.5 0 0 0 5 0z" />
      <path d="M20 7l-2.5 5a2.5 2.5 0 0 0 5 0z" />
    </svg>
  );
}

export function IconLogOut() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function IconChevronRight() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
