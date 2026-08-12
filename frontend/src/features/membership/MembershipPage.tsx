import { useEffect, useState } from "react";
import styles from "./MembershipPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";
import { useChurches } from "../../hooks/useChurches";
import { useParameters } from "../../hooks/useParameters";
import { fetchPublicSettings } from "../../lib/api/settings";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
import { MembershipCard, MembershipSuccess } from "./MembershipCard";
import { MembershipForm } from "./MembershipForm";
import { MembershipIntro } from "./MembershipIntro";
import { useMembershipRequest } from "./useMembershipRequest";

/** Enveloppe commune : en-tête et pied de page du site public. */
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

export function MembershipPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { churches, load } = useChurches();
  const { values: sexeOptions, load: loadSexe } = useParameters("sexe");
  const { values: familyOptions, load: loadFamily } = useParameters("family_status");
  const [autoApprove, setAutoApprove] = useState(false);

  const request = useMembershipRequest(churches);

  useEffect(() => {
    load({ activeOnly: true });
    loadSexe();
    loadFamily();
    fetchPublicSettings()
      .then((s) => setAutoApprove(s.auto_approve_members === "true"))
      .catch(() => {});
  }, [load, loadSexe, loadFamily]);

  // Session en cours de vérification : on n'affiche ni le formulaire ni le
  // message « déjà membre » pour éviter qu'un visiteur connecté voie le
  // formulaire clignoter avant d'être remplacé.
  if (authLoading) {
    return (
      <PageShell>
        <div className={styles.authCheck}>Chargement…</div>
      </PageShell>
    );
  }

  if (user) {
    return (
      <PageShell>
        <section className={styles.formSection}>
          <div className={styles.formInner}>
            <MembershipCard>
              <MembershipSuccess
                title="Vous êtes déjà membre ✓"
                actionLabel="Accéder à mon espace"
                onAction={() => navigate("espace")}
              >
                Votre compte est déjà actif. Retrouvez vos informations
                et gérez votre profil dans votre espace membre.
              </MembershipSuccess>
            </MembershipCard>
          </div>
        </section>
      </PageShell>
    );
  }

  const { outcome } = request;

  return (
    <PageShell>
      <MembershipIntro />

      <section id="formulaire" className={styles.formSection}>
        <div className={styles.formInner}>
          <aside className={styles.formSidebar}>
            <h2 className={styles.sidebarTitle}>Votre demande d'adhésion</h2>
            <p className={styles.sidebarText}>
              {autoApprove
                ? "Remplissez le formulaire ci-contre. Votre adhésion sera approuvée immédiatement et vous recevrez un courriel pour activer votre compte."
                : "Remplissez le formulaire ci-contre. Un administrateur examinera votre demande sous 48h et vous recevrez un courriel de confirmation."}
            </p>
            <ul className={styles.checkList}>
              <li>Gratuit et sans engagement</li>
              <li>Validation par un responsable</li>
              <li>Courriel de confirmation</li>
              <li>Accès à votre espace membre</li>
            </ul>
          </aside>

          <MembershipCard>
            {outcome ? (
              <MembershipSuccess
                title={outcome.approved ? "Adhésion approuvée !" : "Demande envoyée"}
                actionLabel="Retour à l'accueil"
                onAction={() => navigate("home")}
              >
                {outcome.approved ? (
                  <>
                    Bienvenue ! Votre adhésion à <strong>{outcome.church}</strong> a
                    été approuvée. Surveillez votre boîte courriel : un lien pour
                    activer votre compte vient de vous être envoyé.
                  </>
                ) : (
                  <>
                    Votre demande d'adhésion à <strong>{outcome.church}</strong> a
                    bien été reçue. Un administrateur l'examinera prochainement
                    et vous recevrez un courriel de confirmation.
                  </>
                )}
              </MembershipSuccess>
            ) : (
              <MembershipForm
                values={request.form}
                onChange={request.update}
                fieldErrors={request.fieldErrors}
                onClearFieldError={request.clearFieldError}
                churches={churches}
                sexeOptions={sexeOptions}
                familyOptions={familyOptions}
                error={request.error}
                submitting={request.submitting}
                onSubmit={request.submit}
                onBack={() => navigate("home")}
              />
            )}
          </MembershipCard>
        </div>
      </section>
    </PageShell>
  );
}
