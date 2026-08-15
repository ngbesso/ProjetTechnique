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
    "membership_received_template": (
        "Message de bienvenue envoyé à la réception d'une demande d'adhésion "
        "(variables : {prenom}, {nom})"
    ),
    "membership_approved_template": (
        "Message envoyé lorsqu'une adhésion est approuvée, compte déjà existant "
        "(variables : {prenom}, {nom})"
    ),
    "membership_approved_invite_template": (
        "Message envoyé lorsqu'une adhésion est approuvée avec création de "
        "compte (variables : {prenom}, {nom}, {lien})"
    ),
    "site_name": "Nom du site (logo, copyright du pied de page)",
    "site_tagline": "Slogan affiché sous le nom du site",
    "site_logo_url": "Chemin du logo du site (géré via le téléversement, ne pas modifier à la main)",
    "hero_eyebrow": "Petit texte au-dessus du titre principal de l'accueil",
    "hero_title": "Titre principal de la page d'accueil",
    "hero_subtitle": "Sous-titre de la page d'accueil",
    "about_eyebrow":"Petit texte au-dessus du titre de la section « Qui sommes-nous »",
    "about_title": "Titre de la section « Qui sommes-nous »",
    "about_description": "Paragraphe de présentation de la section « Qui sommes-nous »",
    "pillar_vision_label": "Carte Vision — libellé (vide = carte masquée)",
    "pillar_vision_desc": "Carte Vision — résumé affiché sur l'accueil",
    "pillar_mission_label": "Carte Mission — libellé (vide = carte masquée)",
    "pillar_mission_desc": "Carte Mission — résumé affiché sur l'accueil",
    "pillar_valeurs_label": "Carte Valeurs — libellé (vide = carte masquée)",
    "pillar_valeurs_desc": "Carte Valeurs — résumé affiché sur l'accueil",
    "pillar_credo_label": "Carte Crédo — libellé (vide = carte masquée)",
    "pillar_credo_desc": "Carte Crédo — résumé affiché sur l'accueil",
    "pillar_principes_label": "Carte Principes — libellé (vide = carte masquée)",
    "pillar_principes_desc": "Carte Principes — résumé affiché sur l'accueil",
    "about_page_eyebrow": "Page « Qui sommes-nous » — petit texte du bandeau",
    "about_page_title": "Page « Qui sommes-nous » — titre du bandeau",
    "about_welcome": "Page « Qui sommes-nous » — texte de bienvenue",
    "about_vision_text": "Page « Qui sommes-nous » — texte de la vision",
    "about_mission_text": "Page « Qui sommes-nous » — texte de la mission",
    "about_valeurs_list": "Page « Qui sommes-nous » — valeurs, une par ligne",
    "about_principes_list": "Page « Qui sommes-nous » — principes, un par ligne",
    "about_credo_list": "Page « Qui sommes-nous » — points du crédo, un par ligne",
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
    "pillar_vision_label",
    "pillar_vision_desc",
    "pillar_mission_label",
    "pillar_mission_desc",
    "pillar_valeurs_label",
    "pillar_valeurs_desc",
    "pillar_credo_label",
    "pillar_credo_desc",
    "pillar_principes_label",
    "pillar_principes_desc",
    "about_page_eyebrow",
    "about_page_title",
    "about_welcome",
    "about_vision_text",
    "about_mission_text",
    "about_valeurs_list",
    "about_principes_list",
    "about_credo_list",
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
