// Correspondance entre une page et la vue à afficher. Raison de changer :
// l'ajout d'une page ou la règle d'accès qui la protège.
import { HomePage } from "./features/home/HomePage";
import { LoginPage } from "./features/auth/LoginPage";
import { AdminPage } from "./features/admin/AdminPage";
import { MembershipPage } from "./features/membership/MembershipPage";
import { DonationPage } from "./features/donation/DonationPage";
import { SermonsPage } from "./features/sermons/SermonsPage";
import { EventsPage } from "./features/events/EventsPage";
import { EventDetailPage } from "./features/events/EventDetailPage";
import { LeadershipPage } from "./features/leadership/LeadershipPage";
import { LeaderDetailPage } from "./features/leadership/LeaderDetailPage";
import { BlogPage } from "./features/blog/BlogPage";
import { NewsPage } from "./features/news/NewsPage";
import { ForgotPasswordPage } from "./features/auth/ForgotPasswordPage";
import { EspacePage } from "./features/espace/EspacePage";
import { OrganiserEvenementsPage } from "./features/organisateur/OrganiserEvenementsPage";
import { PrivacyPage } from "./features/legal/PrivacyPage";
import { AboutPage } from "./features/about/AboutPage";
import type { Page, UserInfo } from "./types";

export interface ResolvedRoute {
  element: React.ReactNode;
  /** Le widget de discussion n'accompagne que les pages du site public. */
  withChat: boolean;
}

interface RouteRequest {
  page: Page;
  routeParams: Record<string, unknown>;
  user: UserInfo | null;
}

/** Pages publiques sans paramètre ni condition d'accès. */
const PUBLIC_PAGES: Partial<Record<Page, () => React.ReactNode>> = {
  login: () => <LoginPage />,
  "mot-de-passe-oublie": () => <ForgotPasswordPage />,
  adhesion: () => <MembershipPage />,
  donation: () => <DonationPage />,
  sermons: () => <SermonsPage />,
  blog: () => <BlogPage />,
  actualites: () => <NewsPage />,
};

/** Une page réservée renvoie vers la connexion tant que personne n'est connecté. */
function requireUser(user: UserInfo | null, element: React.ReactNode): ResolvedRoute {
  return { element: user ? element : <LoginPage />, withChat: false };
}

export function resolveRoute({ page, routeParams, user }: RouteRequest): ResolvedRoute {
  if (page === "evenements") {
    const eventId = routeParams.event;
    return {
      element: eventId ? <EventDetailPage eventId={Number(eventId)} /> : <EventsPage />,
      withChat: false,
    };
  }
  if (page === "leadership") {
    const leaderId = routeParams.leader;
    return {
      element: leaderId ? <LeaderDetailPage leaderId={Number(leaderId)} /> : <LeadershipPage />,
      withChat: false,
    };
  }
  if (page === "confidentialite") return { element: <PrivacyPage />, withChat: false };
  if (page === "qui-sommes-nous") return { element: <AboutPage />, withChat: false };

  // « mon-profil » est conservé comme alias (anciens liens/signets) de « espace »
  if (page === "mon-profil" || page === "espace") return requireUser(user, <EspacePage />);
  if (page === "admin") return requireUser(user, <AdminPage />);
  if (page === "organiser-evenements") {
    return requireUser(user, <OrganiserEvenementsPage />);
  }

  const publicPage = PUBLIC_PAGES[page];
  return { element: publicPage ? publicPage() : <HomePage />, withChat: true };
}
