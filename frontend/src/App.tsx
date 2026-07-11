import { usePage } from "./context/RouterContext";
import { useAuth } from "./context/AuthContext";
import { HomePage } from "./features/home/HomePage";
import { LoginPage } from "./features/auth/LoginPage";
/*import { RegisterPage } from "./features/auth/RegisterPage";*/
import { AdminPage } from "./features/admin/AdminPage";
import {MembershipPage} from "./features/membership/MembershipPage";
import { DonationPage } from "./features/donation/DonationPage";
import { SermonsPage } from "./features/sermons/SermonsPage";
import { BlogPage } from "./features/blog/BlogPage";
import {SetPasswordPage} from "./features/auth/SetPasswordPage";
import {ResetPasswordPage} from "./features/auth/ResetPasswordPage";
import {ForgotPasswordPage} from "./features/auth/ForgotPasswordPage";
import {MyProfilePage} from "./features/member/MyProfilePage";
import { ChatWidget } from "./components/chat/ChatWidget";

export default function App() {
  const page = usePage();
  const { user, loading } = useAuth();

  const params = new URLSearchParams(window.location.search);

  const resetToken = params.get("reset");
  if (resetToken) return <ResetPasswordPage token={resetToken} />;

  const inviteToken = params.get("token");
  if (inviteToken) return <SetPasswordPage token={inviteToken} />;

  if (loading) return <div className="loading">Chargement…</div>;

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
