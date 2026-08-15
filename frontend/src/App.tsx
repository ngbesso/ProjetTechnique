import { usePage, useRouteParams } from "./context/RouterContext";
import { useAuth } from "./context/AuthContext";
import { resolveRoute } from "./appRoutes";
import { SetPasswordPage } from "./features/auth/SetPasswordPage";
import { ResetPasswordPage } from "./features/auth/ResetPasswordPage";
import { ChatWidget } from "./components/chat/ChatWidget";

export default function App() {
  const page = usePage();
  const routeParams = useRouteParams();
  const { user, loading } = useAuth();

  // Les jetons reçus par courriel court-circuitent la navigation : la page
  // s'affiche quel que soit l'état de session.
  const params = new URLSearchParams(window.location.search);

  const resetToken = params.get("reset");
  if (resetToken) return <ResetPasswordPage token={resetToken} />;

  const inviteToken = params.get("token");
  if (inviteToken) return <SetPasswordPage token={inviteToken} />;

  if (loading) return <div className="loading">Chargement…</div>;

  const { element, withChat } = resolveRoute({ page, routeParams, user });
  if (!withChat) return <>{element}</>;

  return (
    <>
      {element}
      <ChatWidget />
    </>
  );
}
