import { useEffect, useState, type ComponentType } from "react";
import admin from "../admin/AdminPage.module.css";
import styles from "./EspacePage.module.css";
import { hasAdminAccess, useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";
import { useChurches } from "../../hooks/useChurches";
import {
  IconCalendar,
  IconClipboardList,
  IconDollar,
  IconHeart,
  IconLogOut,
  IconSparkles,
  IconUser,
  IconUserPlus,
} from "../../components/ui/icons";
import { fetchMyProfile } from "../../lib/api/members";
import { BenevolatSection } from "./BenevolatSection";
import { DemandesSection } from "./DemandesSection";
import { DonsSection } from "./DonsSection";
import { InscriptionsSection } from "./InscriptionsSection";
import { MinisteresSection } from "./MinisteresSection";
import { PriereSection } from "./PriereSection";
import { ProfilSection } from "./ProfilSection";

type Section =
  | "profil"
  | "dons"
  | "inscriptions"
  | "ministeres"
  | "priere"
  | "benevolat"
  | "demandes";

// Mêmes icônes que les entrées équivalentes du menu d'administration, pour
// que le vocabulaire visuel soit commun aux deux espaces.
const NAV_ITEMS: { id: Section; label: string; icon: ComponentType }[] = [
  { id: "profil", label: "Mon profil", icon: IconUser },
  { id: "dons", label: "Mes dons", icon: IconDollar },
  { id: "inscriptions", label: "Mes inscriptions", icon: IconCalendar },
  { id: "ministeres", label: "Ministères", icon: IconSparkles },
  { id: "priere", label: "Demande de prière", icon: IconHeart },
  { id: "benevolat", label: "Bénévolat", icon: IconUserPlus },
  { id: "demandes", label: "Mes demandes", icon: IconClipboardList },
];

/** Type présélectionné par le lien « Demander une modification » du profil. */
const PROFILE_CHANGE_REQUEST_TYPE = "Modification de mes informations";

export function EspacePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("profil");
  const [prefilledRequestType, setPrefilledRequestType] = useState("");
  const { churches, load: loadChurches } = useChurches();

  const isAdmin = hasAdminAccess(user);
  // Un admin n'a généralement pas de fiche membre : /espace serait vide pour
  // lui. On vérifie et on le renvoie vers son tableau de bord le cas échéant —
  // sauf s'il a effectivement une fiche membre (ex. pasteur aussi inscrit).
  const [checkingAdminProfile, setCheckingAdminProfile] = useState(!!isAdmin);

  useEffect(() => {
    if (!isAdmin) return;
    fetchMyProfile()
      .then(() => setCheckingAdminProfile(false))
      .catch(() => navigate("admin"));
  }, [isAdmin, navigate]);

  useEffect(() => {
    loadChurches();
  }, [loadChurches]);

  function churchName(id: number | null | undefined): string {
    return churches.find((c) => c.id === id)?.name ?? "—";
  }

  const activeLabel = NAV_ITEMS.find((i) => i.id === section)?.label ?? "Mon espace";

  if (checkingAdminProfile) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
        Chargement…
      </div>
    );
  }

  return (
    <div className={admin.layout}>
      {/* ── Sidebar ── */}
      <aside className={admin.sidebar}>
        <button
          className={`${admin.sidebarBrand} ${styles.sidebarBrandBtn}`}
          onClick={() => navigate("home")}
        >
          <div className={admin.brandIcon} aria-hidden>+</div>
          <div>
            <p className={admin.brandName}>Mission Évangélique</p>
            <p className={admin.brandSub}>Mon espace</p>
          </div>
        </button>

        <nav className={admin.sidebarNav}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = section === item.id;
            return (
              <button
                key={item.id}
                // Aucune entrée n'appartient à un groupe ici : c'est le même cas
                // que « Tableau de bord » côté admin, donc le pavé plein.
                className={`${admin.navItem} ${isActive ? admin.navItemActiveSolo : ""}`}
                // Le libellé disparaît dans le rail réduit : on nomme le bouton.
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setSection(item.id)}
              >
                <span className={admin.navIcon} aria-hidden>
                  <Icon />
                </span>
                <span className={admin.navLabel}>{item.label}</span>
              </button>
            );
          })}
          <button className={styles.logoutNavItem} aria-label="Se déconnecter" onClick={logout}>
            <span className={admin.navIcon} aria-hidden>
              <IconLogOut />
            </span>
            <span className={admin.navLabel}>Se déconnecter</span>
          </button>
        </nav>
      </aside>

      {/* ── Main ── */}
      <div className={admin.main}>
        <header className={admin.topBar}>
          <h1 className={admin.topTitle}>{activeLabel}</h1>
        </header>

        <main className={admin.content}>
          {section === "profil" ? (
            <ProfilSection
              churchName={churchName}
              onRequestChange={() => {
                setPrefilledRequestType(PROFILE_CHANGE_REQUEST_TYPE);
                setSection("demandes");
              }}
            />
          ) : section === "dons" ? (
            <DonsSection churchName={churchName} />
          ) : section === "inscriptions" ? (
            <InscriptionsSection />
          ) : section === "ministeres" ? (
            <MinisteresSection />
          ) : section === "priere" ? (
            <PriereSection />
          ) : section === "demandes" ? (
            <DemandesSection prefilledType={prefilledRequestType} />
          ) : (
            <BenevolatSection />
          )}
        </main>
      </div>
    </div>
  );
}
