import { usePage } from "./context/RouterContext";
import { useAuth } from "./context/AuthContext";
import { HomePage } from "./features/home/HomePage";
import { LoginPage } from "./features/auth/LoginPage";
/*import { RegisterPage } from "./features/auth/RegisterPage";*/
import { AdminPage } from "./features/admin/AdminPage";
import {MembershipPage} from "./features/membership/MembershipPage";
import { DonationPage } from "./features/donation/DonationPage";
import {SetPasswordPage} from "./features/auth/SetPasswordPage";
import {MyProfilePage} from "./features/member/MyProfilePage";

export default function App() {
  const page = usePage();
  const { user, loading } = useAuth();

  const inviteToken = new URLSearchParams(window.location.search).get("token");
  if (inviteToken) return <SetPasswordPage token={inviteToken} />;

  if (loading) return <div className="loading">Chargement…</div>;

  if (page === "login") return <LoginPage />;
  /*if (page === "register") return <RegisterPage />;*/
  if (page === "adhesion") return <MembershipPage />;
  if (page === "donation") return <DonationPage />;
  if (page === "mon-profil") return user ? <MyProfilePage /> : <LoginPage />;
  if (page === "admin") {
    if (!user) return <LoginPage />;
    return <AdminPage />;
  }

  return <HomePage />;
}
