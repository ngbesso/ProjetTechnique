import { usePage, useRouteParams } from "./context/RouterContext";
import { useAuth } from "./context/AuthContext";
import { HomePage } from "./features/home/HomePage";
import { LoginPage } from "./features/auth/LoginPage";
/*import { RegisterPage } from "./features/auth/RegisterPage";*/
import { AdminPage } from "./features/admin/AdminPage";
import {MembershipPage} from "./features/membership/MembershipPage";
import { DonationPage } from "./features/donation/DonationPage";
import { SermonsPage } from "./features/sermons/SermonsPage";
import { EventsPage } from "./features/events/EventsPage";
import { EventDetailPage } from "./features/events/EventDetailPage";
import { BlogPage } from "./features/blog/BlogPage";
import {SetPasswordPage} from "./features/auth/SetPasswordPage";
import {ResetPasswordPage} from "./features/auth/ResetPasswordPage";
import {ForgotPasswordPage} from "./features/auth/ForgotPasswordPage";
import {EspacePage} from "./features/espace/EspacePage";
import {PrivacyPage} from "./features/legal/PrivacyPage";
import {MyProfilePage} from "./features/member/MyProfilePage";
import { ChatWidget } from "./components/chat/ChatWidget";

export default function App() {
  const page = usePage();
  const routeParams = useRouteParams();
  const { user, loading } = useAuth();

  const params = new URLSearchParams(window.location.search);

  const resetToken = params.get("reset");
  if (resetToken) return <ResetPasswordPage token={resetToken} />;

  const inviteToken = params.get("token");
  if (inviteToken) return <SetPasswordPage token={inviteToken} />;

  if (loading) return <div className="loading">Chargement…</div>;

  if (page === "login") return <LoginPage />;
  if (page === "mot-de-passe-oublie") return <ForgotPasswordPage />;
  /*if (page === "register") return <RegisterPage />;*/
  if (page === "adhesion") return <MembershipPage />;
  if (page === "donation") return <DonationPage />;
  if (page === "sermons") return <SermonsPage />;
  if (page === "evenements") {
    const eventId = routeParams.event;
    return eventId ? <EventDetailPage eventId={Number(eventId)} /> : <EventsPage />;
  }
  if (page === "blog") return <BlogPage />;
  if (page === "confidentialite") return <PrivacyPage />;

  // "mon-profil" est conservé comme alias (anciens liens/signets) de "espace"
  if (page === "mon-profil" || page === "espace") {
    return user ? <EspacePage /> : <LoginPage />;
  }
  if (page === "admin") {
    if (!user) return <LoginPage />;
    return <AdminPage />;
  }

  let content: React.ReactNode;
  if (page === "login") content = <LoginPage />;
  else if (page === "mot-de-passe-oublie") content = <ForgotPasswordPage />;
  else if (page === "adhesion") content = <MembershipPage />;
  else if (page === "donation") content = <DonationPage />;
  else if (page === "sermons") content = <SermonsPage />;
  else if (page === "blog") content = <BlogPage />;
  else if (page === "mon-profil") content = user ? <MyProfilePage /> : <LoginPage />;
  else content = <HomePage />;

  return (
    <>
      {content}
      <ChatWidget />
    </>
  );
}
