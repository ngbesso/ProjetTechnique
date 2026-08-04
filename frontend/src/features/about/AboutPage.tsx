import type { ComponentType } from "react";
import styles from "./AboutPage.module.css";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
import {
  IconBook,
  IconEye,
  IconGem,
  IconScale,
  IconTarget,
} from "../../components/ui/icons";
import { useSiteContent } from "../../hooks/useSiteContent";

/** Découpe un réglage multiligne : une ligne non vide = un élément de liste. */
function toLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: ComponentType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionIcon} aria-hidden>
          <Icon />
        </span>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

/** Paragraphes issus d'un réglage multiligne. */
function Paragraphs({ text }: { text: string }) {
  return (
    <div className={styles.sectionText}>
      {toLines(text).map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </div>
  );
}

function OrderedList({ items }: { items: string[] }) {
  return (
    <ol className={styles.list}>
      {items.map((item, i) => (
        <li key={i} className={styles.listItem}>
          {item}
        </li>
      ))}
    </ol>
  );
}

export function AboutPage() {
  const { settings } = useSiteContent();

  const valeurs = toLines(settings.about_valeurs_list);
  const principes = toLines(settings.about_principes_list);
  const credo = toLines(settings.about_credo_list);

  // Le texte long prime, le résumé de la carte d'accueil sert de repli tant
  // que le contenu détaillé n'a pas été saisi.
  const visionText = settings.about_vision_text.trim() || settings.pillar_vision_desc;
  const missionText = settings.about_mission_text.trim() || settings.pillar_mission_desc;

  const hasContent =
    settings.about_welcome.trim() !== "" ||
    visionText.trim() !== "" ||
    missionText.trim() !== "" ||
    valeurs.length > 0 ||
    principes.length > 0 ||
    credo.length > 0;

  return (
    <div className={styles.page}>
      <SiteHeader activePage="qui-sommes-nous" />

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.heroEyebrow}>{settings.about_page_eyebrow}</span>
          <h1 className={styles.heroTitle}>{settings.about_page_title}</h1>
        </div>
        <div className={styles.heroDecor} aria-hidden="true" />
      </section>

      <main className={styles.main}>
        {settings.about_welcome.trim() && (
          <div className={styles.welcome}>
            {toLines(settings.about_welcome).map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}

        {visionText.trim() && (
          <Section icon={IconEye} title={settings.pillar_vision_label}>
            <Paragraphs text={visionText} />
          </Section>
        )}

        {missionText.trim() && (
          <Section icon={IconTarget} title={settings.pillar_mission_label}>
            <Paragraphs text={missionText} />
          </Section>
        )}

        {valeurs.length > 0 && (
          <Section icon={IconGem} title={settings.pillar_valeurs_label}>
            <OrderedList items={valeurs} />
          </Section>
        )}

        {principes.length > 0 && (
          <Section icon={IconScale} title={settings.pillar_principes_label}>
            <OrderedList items={principes} />
          </Section>
        )}

        {credo.length > 0 && (
          <Section icon={IconBook} title={settings.pillar_credo_label}>
            <OrderedList items={credo} />
          </Section>
        )}

        {!hasContent && (
          <p className={styles.empty}>
            Le contenu de cette page n'a pas encore été renseigné. Il se configure
            depuis l'administration, section « Pages &amp; Menu ».
          </p>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
