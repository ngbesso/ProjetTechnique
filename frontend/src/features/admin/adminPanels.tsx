// Correspondance entre une entrée de menu et le panneau correspondant. Raison
// de changer : l'ajout ou le retrait d'un module d'administration.
//
// Les sections dont le panneau demande des données de la page (tableau de bord,
// membres) restent rendues par AdminPage : elles ne sont pas dans cette table.
import { AnniversairesPanel } from "./AnniversairesPanel";
import { AssistantPanel } from "./AssistantPanel";
import { BenevolatPanel } from "./BenevolatPanel";
import { BlogPanel } from "./BlogPanel";
import { DemandesMembresPanel } from "./DemandesMembresPanel";
import { DepensesPanel } from "./DepensesPanel";
import { EglisesPanel } from "./EglisesPanel";
import { EvenementsPanel } from "./EvenementsPanel";
import { LeadershipPanel } from "./LeadershipPanel";
import { NewsPanel } from "./NewsPanel";
import { MinisteresPanel } from "./MinisteresPanel";
import { OrganisateursPanel } from "./OrganisateursPanel";
import { PagesPanel } from "./PagesPanel";
import { ParametresPanel } from "./ParametresPanel";
import { PrieresPanel } from "./PrieresPanel";
import { RapportPanel } from "./RapportPanel";
import { RbacPanel } from "./RbacPanel";
import { RevenusPanel } from "./RevenusPanel";
import { SermonsPanel } from "./SermonsPanel";
import { UsersPanel } from "./UsersPanel";
import type { Section } from "./AdminNav";

export const ADMIN_PANELS: Partial<Record<Section, () => React.ReactNode>> = {
  utilisateurs: () => (
    <>
      <UsersPanel />
      <RbacPanel />
    </>
  ),
  eglises: () => <EglisesPanel />,
  leadership: () => <LeadershipPanel />,
  anniversaires: () => <AnniversairesPanel />,
  ministeres: () => <MinisteresPanel />,
  "finances-revenus": () => <RevenusPanel />,
  "finances-depenses": () => <DepensesPanel />,
  "finances-rapport": () => <RapportPanel />,
  sermons: () => <SermonsPanel />,
  evenements: () => <EvenementsPanel />,
  organisateurs: () => <OrganisateursPanel />,
  blog: () => <BlogPanel />,
  actualites: () => <NewsPanel />,
  prieres: () => <PrieresPanel />,
  benevolat: () => <BenevolatPanel />,
  "demandes-membres": () => <DemandesMembresPanel />,
  pages: () => <PagesPanel />,
  parametres: () => <ParametresPanel />,
  assistant: () => <AssistantPanel />,
};
