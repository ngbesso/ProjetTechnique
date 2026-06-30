import { usePage } from "./context/RouterContext";
import { useAuth } from "./context/AuthContext";
import { HomePage } from "./features/home/HomePage";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { AdminPage } from "./features/admin/AdminPage";
import {MembershipPage} from "./features/membership/MembershipPage";
import { DonationPage } from "./features/donation/DonationPage";

export default function App() {
  const page = usePage();
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Chargement…</div>;

  if (page === "login") return <LoginPage />;
  if (page === "register") return <RegisterPage />;
  if (page === "adhesion") return <MembershipPage />;
  if (page === "donation") return <DonationPage />;

  if (page === "admin") {
    if (!user) return <LoginPage />;
    return <AdminPage />;
  }

  return <HomePage />;
}
