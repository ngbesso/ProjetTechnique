from pydantic import BaseModel, ConfigDict

# Clés autorisées avec leur description
SETTING_META: dict[str, str] = {
    "auto_approve_members": "Approuver automatiquement les demandes d'adhésion",
    "zeffy_embed_path": "Chemin du formulaire Zeffy (ex: /fr/donation-form/xxx)",
    "event_reminder_hours_before": (
        "Délai (en heures) avant un événement pour l'envoi du courriel de rappel"
    ),
    "birthday_message_template": (
        "Message d'anniversaire individuel (variables : {prenom}, {nom})"
    ),
    "birthday_monthly_message_template": (
        "Message groupé mensuel d'anniversaire (variables : {prenom}, {nom})"
    ),
    "site_name": "Nom du site (logo, copyright du pied de page)",
    "site_tagline": "Slogan affiché sous le nom du site",
    "site_logo_url": "Chemin du logo du site (géré via le téléversement, ne pas modifier à la main)",
    "hero_eyebrow": "Petit texte au-dessus du titre principal de l'accueil",
    "hero_title": "Titre principal de la page d'accueil",
    "hero_subtitle": "Sous-titre de la page d'accueil",
    "about_eyebrow": "Petit texte au-dessus du titre de la section « Qui sommes-nous »",
    "about_title": "Titre de la section « Qui sommes-nous »",
    "about_description": "Paragraphe de présentation de la section « Qui sommes-nous »",
    "social_youtube_url": "Lien YouTube (pied de page)",
    "social_facebook_url": "Lien Facebook (pied de page)",
    "social_instagram_url": "Lien Instagram (pied de page)",
    "social_whatsapp_url": "Lien WhatsApp (pied de page)",
}

# Clés retournées sans authentification
PUBLIC_SETTINGS: set[str] = {
    "zeffy_embed_path",
    "auto_approve_members",
    "site_name",
    "site_tagline",
    "site_logo_url",
    "hero_eyebrow",
    "hero_title",
    "hero_subtitle",
    "about_eyebrow",
    "about_title",
    "about_description",
    "social_youtube_url",
    "social_facebook_url",
    "social_instagram_url",
    "social_whatsapp_url",
}


class AppSettingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    key: str
    value: str
    description: str = ""


class AppSettingUpdate(BaseModel):
    value: str
