import { useEffect } from "react";
import admin from "../admin/AdminPage.module.css";
import styles from "./EspacePage.module.css";
import { useParameters } from "../../hooks/useParameters";
import { ProfileContactForm } from "./profil/ProfileContactForm";
import { ProfileHero } from "./profil/ProfileHero";
import { ProfileIdentityCard, ProfileStatusCard } from "./profil/ProfileReadOnlyCards";
import { useMyProfile } from "./profil/useMyProfile";

interface ProfilSectionProps {
  churchName: (id: number | null | undefined) => string;
  onRequestChange: () => void;
}

export function ProfilSection({ churchName, onRequestChange }: ProfilSectionProps) {
  const { values: familyOptions, load: loadFamily } = useParameters("family_status");
  const profile = useMyProfile();

  useEffect(() => { loadFamily(); }, [loadFamily]);

  if (profile.loading) return <p className={admin.stateMsg}>Chargement…</p>;

  const m = profile.member;
  if (!m) {
    return (
      <p className={admin.errorMsg} role="alert">
        {profile.error || "Aucune fiche membre associée à ce compte."}
      </p>
    );
  }

  return (
    <div className={admin.rbacWrapper}>
      <ProfileHero
        values={{
          first_name: m.first_name,
          last_name: m.last_name,
          status: m.status,
          member_code: m.member_code,
          church_id: m.church_id,
        }}
        churchName={churchName}
      />

      {profile.saved && (
        <p className={styles.successMsg}><span>✓</span> Profil mis à jour avec succès.</p>
      )}
      {profile.error && <p className={admin.errorMsg} role="alert">{profile.error}</p>}

      <ProfileIdentityCard
        values={{
          first_name: m.first_name,
          last_name: m.last_name,
          birth_date: m.birth_date,
          email: m.email,
          sexe: m.sexe,
        }}
        onRequestChange={onRequestChange}
      />

      <ProfileStatusCard
        values={{
          status: m.status,
          member_code: m.member_code,
          church_id: m.church_id,
          is_baptized: m.is_baptized,
        }}
        churchName={churchName}
      />

      <ProfileContactForm
        values={{ address: m.address, telephone: m.telephone, family_status: m.family_status }}
        onChange={profile.update}
        errors={profile.fieldErrors}
        onClearError={profile.clearFieldError}
        familyOptions={familyOptions}
        busy={profile.busy}
        onSubmit={profile.save}
      />
    </div>
  );
}
