import { useEffect, useState } from "react";
import styles from "./MembershipPage.module.css";
import { useNavigate } from "../../context/RouterContext";
import { useChurches } from "../../hooks/useChurches";
import { requestMembership } from "../../lib/api/members";
import type { MembershipInput } from "../../types";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";

const FAMILY = ["Célibataire", "Marié(e)", "Veuf(ve)", "Divorcé(e)"];
const SEXE_OPTIONS = ["Masculin", "Féminin", "Autre"];
const TODAY = new Date().toISOString().split("T")[0];

const WHY_ITEMS = [
  {
    icon: "🤝",
    title: "Communauté fraternelle",
    text: "Des membres unis par la foi, qui se soutiennent et grandissent ensemble dans la prière et le service.",
  },
  {
    icon: "📖",
    title: "Formation & croissance",
    text: "Des parcours bibliques, séminaires et retraites pour approfondir votre foi et votre vocation.",
  },
  {
    icon: "🌍",
    title: "Mission & rayonnement",
    text: "Participer à des croisades, congrès et actions d'évangélisation sur tout le territoire et au-delà.",
  },
] as const;

interface FormState {
  church_id: string;
  first_name: string;
  last_name: string;
  email: string;
  address: string;
  birth_date: string;
  sexe: string;
  telephone: string;
  family_status: string;
  is_baptized: boolean;
}

const EMPTY: FormState = {
  church_id: "", first_name: "", last_name: "", email: "",
  address: "", birth_date: "", sexe: "", telephone: "", family_status: "", is_baptized: false,
};

export function MembershipPage() {
  const navigate = useNavigate();
  const { churches, load } = useChurches();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ church: string } | null>(null);

  useEffect(() => { load(); }, [load]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.church_id) { setError("Veuillez choisir une église."); return; }
    if (form.birth_date && form.birth_date > TODAY) {
      setError("La date de naissance ne peut pas être une date future.");
      return;
    }
    setSubmitting(true);
    setError("");
    const payload: MembershipInput = {
      church_id: Number(form.church_id),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      address: form.address.trim() || undefined,
      birth_date: form.birth_date || undefined,
      sexe: form.sexe || undefined,
      telephone: form.telephone.trim() || undefined,
      family_status: form.family_status || undefined,
      is_baptized: form.is_baptized,
    };
    try {
      await requestMembership(payload);
      const church = churches.find((c) => c.id === Number(form.church_id));
      setDone({ church: church?.name ?? "l'église choisie" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <SiteHeader />

      <main>
        {/* ── Hero ── */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>Rejoindre la mission</p>
            <h1 className={styles.heroTitle}>
              Devenez membre de<br />notre communauté
            </h1>
            <p className={styles.heroDesc}>
              Une famille de foi qui vous accueille, vous accompagne
              et vous envoie partout dans le monde.
            </p>
            <a href="#formulaire" className={styles.heroCta}>
              Remplir le formulaire ↓
            </a>
          </div>
          <div className={styles.heroImg} aria-hidden="true" />
        </section>

        {/* ── Pourquoi rejoindre ── */}
        <section className={styles.whySection}>
          <h2 className={styles.whySectionTitle}>Pourquoi rejoindre la mission ?</h2>
          <p className={styles.whySectionSub}>Ce qui vous attend au sein de notre communauté</p>
          <div className={styles.whyGrid}>
            {WHY_ITEMS.map((item) => (
              <div key={item.title} className={styles.whyCard}>
                <div className={styles.whyCardImg}>
                  <span className={styles.whyCardIcon}>{item.icon}</span>
                </div>
                <h3 className={styles.whyCardTitle}>{item.title}</h3>
                <p className={styles.whyCardText}>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Citation ── */}
        <section className={styles.quoteBand}>
          <blockquote className={styles.quote}>
            « Rejoindre cette mission a transformé ma vie.
            Je me sens entouré, formé et envoyé. »
            <cite className={styles.quoteCite}>— Pasteur A. Mensah, Région Est</cite>
          </blockquote>
        </section>

        {/* ── Formulaire ── */}
        <section id="formulaire" className={styles.formSection}>
          <div className={styles.formInner}>
            <aside className={styles.formSidebar}>
              <h2 className={styles.sidebarTitle}>Votre demande d'adhésion</h2>
              <p className={styles.sidebarText}>
                Remplissez le formulaire ci-contre. Un administrateur
                examinera votre demande sous 48h et vous recevrez un
                courriel de confirmation.
              </p>
              <ul className={styles.checkList}>
                <li>Gratuit et sans engagement</li>
                <li>Validation par un responsable</li>
                <li>Courriel de confirmation</li>
                <li>Accès à votre espace membre</li>
              </ul>
            </aside>

            <div className={styles.card}>
              <div className={styles.brandBar}>
                <div className={styles.brandIcon}>+</div>
                <div>
                  <p className={styles.brandName}>Mission Évangélique</p>
                  <p className={styles.brandSub}>Devenir membre</p>
                </div>
              </div>

              {done ? (
                <div className={styles.body}>
                  <div className={styles.successBox}>
                    <p className={styles.successIcon}>✓</p>
                    <h2 className={styles.successTitle}>Demande envoyée</h2>
                    <p className={styles.successText}>
                      Votre demande d'adhésion à <strong>{done.church}</strong> a
                      bien été reçue. Un administrateur l'examinera prochainement.
                    </p>
                    <button className={styles.submit} onClick={() => navigate("home")}>
                      Retour à l'accueil
                    </button>
                  </div>
                </div>
              ) : (
                <form className={styles.body} onSubmit={handleSubmit}>
                  <p className={styles.intro}>
                    Remplissez ce formulaire pour rejoindre l'une des Églises de la mission.
                  </p>

                  <label className={styles.label}>Église *</label>
                  <select className={styles.select} value={form.church_id} required
                    onChange={(e) => set("church_id", e.target.value)}>
                    <option value="">Choisir une église…</option>
                    {churches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.district ? ` — ${c.district}` : ""}
                      </option>
                    ))}
                  </select>

                  <div className={styles.row}>
                    <div className={styles.col}>
                      <label className={styles.label}>Prénom *</label>
                      <input className={styles.input} required value={form.first_name}
                        onChange={(e) => set("first_name", e.target.value)} />
                    </div>
                    <div className={styles.col}>
                      <label className={styles.label}>Nom *</label>
                      <input className={styles.input} required value={form.last_name}
                        onChange={(e) => set("last_name", e.target.value)} />
                    </div>
                  </div>

                  <label className={styles.label}>Courriel *</label>
                  <input className={styles.input} type="email" required
                    placeholder="vous@exemple.com" value={form.email}
                    onChange={(e) => set("email", e.target.value)} />

                  <label className={styles.label}>Adresse</label>
                  <input className={styles.input} value={form.address}
                    onChange={(e) => set("address", e.target.value)} />

                  <div className={styles.row}>
                    <div className={styles.col}>
                      <label className={styles.label}>Sexe</label>
                      <select className={styles.select} value={form.sexe}
                        onChange={(e) => set("sexe", e.target.value)}>
                        <option value="">—</option>
                        {SEXE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className={styles.col}>
                      <label className={styles.label}>Téléphone</label>
                      <input className={styles.input} type="tel" value={form.telephone}
                        placeholder="+1 (514) 000-0000"
                        onChange={(e) => set("telephone", e.target.value)} />
                    </div>
                  </div>

                  <div className={styles.row}>
                    <div className={styles.col}>
                      <label className={styles.label}>Date de naissance</label>
                      <input className={styles.input} type="date" value={form.birth_date}
                        max={TODAY}
                        onChange={(e) => set("birth_date", e.target.value)} />
                    </div>
                    <div className={styles.col}>
                      <label className={styles.label}>Statut familial</label>
                      <select className={styles.select} value={form.family_status}
                        onChange={(e) => set("family_status", e.target.value)}>
                        <option value="">—</option>
                        {FAMILY.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>

                  <label className={styles.label}>Baptême</label>
                  <div className={styles.radioRow}>
                    <label className={styles.radioOption}>
                      <input type="radio" name="bapt" checked={!form.is_baptized}
                        onChange={() => set("is_baptized", false)} />
                      Non baptisé(e)
                    </label>
                    <label className={styles.radioOption}>
                      <input type="radio" name="bapt" checked={form.is_baptized}
                        onChange={() => set("is_baptized", true)} />
                      Baptisé(e)
                    </label>
                  </div>

                  {error && <p className={styles.error} role="alert">{error}</p>}

                  <button type="submit" className={styles.submit} disabled={submitting}>
                    {submitting ? "Envoi…" : "Envoyer ma demande"}
                  </button>
                  <button type="button" className={styles.backLink}
                    onClick={() => navigate("home")}>
                    ← Retour à l'accueil
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
