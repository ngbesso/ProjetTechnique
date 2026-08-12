import styles from "./AdminPage.module.css";
import { IconChevronRight } from "../../components/ui/icons";
import type { NavItem, NavSection, Section } from "./AdminNav";

interface AdminSidebarProps {
  sections: NavSection[];
  active: Section;
  expandedGroups: Set<string>;
  pendingCount: number;
  onSelect: (section: Section) => void;
  onToggleGroup: (group: string) => void;
  onBack: () => void;
}

interface NavEntryProps {
  item: NavItem;
  isActive: boolean;
  /** Dans un groupe, l'entrée active se signale plus discrètement. */
  grouped: boolean;
  pendingCount: number;
  onSelect: (section: Section) => void;
}

function NavEntry({ item, isActive, grouped, pendingCount, onSelect }: NavEntryProps) {
  const Icon = item.icon;
  // Le pavé plein n'est conservé que pour les entrées hors groupe ; dans un
  // groupe, l'entrée active se signale par une barre d'accent et un fond très
  // discret.
  const soloOrGrouped = grouped ? styles.navItemActive : styles.navItemActiveSolo;
  const activeClass = isActive ? soloOrGrouped : "";

  return (
    <button
      className={`${styles.navItem} ${activeClass}`}
      // Sous 768px le libellé est masqué en CSS et l'icône est décorative :
      // sans ce nom explicite, le bouton serait annoncé « bouton » par un
      // lecteur d'écran.
      aria-label={item.label}
      aria-current={isActive ? "page" : undefined}
      onClick={() => onSelect(item.id)}
    >
      <span className={styles.navIcon} aria-hidden>
        <Icon />
      </span>
      {/* Le libellé est enveloppé pour pouvoir être masqué dans le rail réduit
          (<768px), où seule l'icône reste. */}
      <span className={styles.navLabel}>{item.label}</span>
      {item.id === "membres" && pendingCount > 0 && (
        <span className={styles.navBadge}>{pendingCount}</span>
      )}
    </button>
  );
}

export function AdminSidebar({
  sections,
  active,
  expandedGroups,
  pendingCount,
  onSelect,
  onToggleGroup,
  onBack,
}: AdminSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarBrand}>
        <div className={styles.brandIcon} aria-hidden>+</div>
        <div>
          <p className={styles.brandName}>Mission Évangélique</p>
          <p className={styles.brandSub}>Administration</p>
        </div>
      </div>

      <nav className={styles.sidebarNav}>
        {sections.map((navSection) => {
          const group = navSection.group;
          const expanded = group === undefined || expandedGroups.has(group);
          const entries = navSection.items.map((item) => (
            <NavEntry
              key={item.id}
              item={item}
              isActive={active === item.id}
              grouped={group !== undefined}
              pendingCount={pendingCount}
              onSelect={onSelect}
            />
          ));

          if (group === undefined) {
            return (
              <div key={navSection.items[0].id} className={styles.navSolo}>
                {entries}
              </div>
            );
          }

          return (
            <div key={group} className={styles.navGroup}>
              <button
                type="button"
                className={styles.navGroupLabel}
                aria-expanded={expanded}
                onClick={() => onToggleGroup(group)}
              >
                <span className={styles.navGroupText}>{group}</span>
                <span
                  className={`${styles.navChevron} ${expanded ? styles.navChevronOpen : ""}`}
                  aria-hidden
                >
                  <IconChevronRight />
                </span>
              </button>
              {expanded && <div className={styles.navGroupItems}>{entries}</div>}
            </div>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <button className={styles.backBtn} onClick={onBack}>
          ← Site public
        </button>
      </div>
    </aside>
  );
}
