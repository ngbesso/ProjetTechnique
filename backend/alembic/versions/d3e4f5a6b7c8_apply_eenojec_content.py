"""Applique le contenu EENOJEC aux réglages de site restés par défaut

Le seed n'insère une clé que si elle est absente : sur une base déjà démarrée,
les clés créées par les versions précédentes gardent leur ancienne valeur, et
celles ajoutées vides le restent. Cette migration comble l'écart.

Règle de prudence : une clé n'est réécrite que si elle est vide ou si elle
contient encore mot pour mot une valeur par défaut connue. Tout contenu saisi
par un administrateur est laissé intact.

Les valeurs sont recopiées ici plutôt qu'importées de app.seed : une migration
doit rester un instantané figé, insensible aux évolutions ultérieures du code.

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "d3e4f5a6b7c8"
down_revision: str | None = "c2d3e4f5a6b7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


CHURCH_NAME = "Église Évangélique de la Nouvelle Jérusalem du Canada"

WELCOME = (
    "L'Église Évangélique de la Nouvelle Jérusalem du Canada (EENOJEC) est une "
    "congrégation chrétienne évangélique établie à Montréal, Québec, Canada, "
    "dirigée par un conseil d'Anciens dont le président et pasteur principal est "
    "le Dr Bruel Gérançon. Nous sommes une Église qui adore Dieu en esprit et en "
    "vérité, et qui dispense fidèlement la parole de Dieu, dans le but de former "
    "des disciples pour Christ dans toutes les nations."
)

VISION = (
    "Former des disciples pour Christ en les enseignant et les instruisant en "
    "toute sagesse afin qu'ils parviennent à la mesure de la stature parfaite "
    "de Christ."
)

MISSION = (
    "Glorifier Dieu par une adoration authentique, par l'édification des frères "
    "et sœurs, par la manifestation de la compassion envers tous, ainsi que par "
    "l'évangélisation des perdus, dans le but de former des disciples pour Christ."
)

VALEURS = "\n".join(
    [
        "Une église remplie de l'Esprit Saint",
        "Une église qui s'attache aux saines paroles du Seigneur Jésus-Christ",
        "Une église qui étudie la parole de Dieu et la met en pratique",
        "Une église qui cultive une vie de prière",
        "Une église qui glorifie Dieu et témoigne de sa grâce",
        "Une église qui persévère dans la communion fraternelle",
    ]
)

PRINCIPES = "\n".join(
    [
        "La fidélité à la parole de Dieu et à la proclamation de l'Évangile "
        "centrée sur Christ",
        "La rigueur dans l'étude des Écritures",
        "La nécessité de la croissance et de la maturité spirituelles du "
        "disciple de Jésus-Christ",
    ]
)

CREDO = "\n".join(
    [
        "Nous croyons en un seul Dieu existant en trois personnes distinctes : "
        "le Père, le Fils et le Saint-Esprit",
        "Nous croyons que Dieu est le créateur de l'univers",
        "Nous croyons que la Bible est inspirée de Dieu",
        "Nous croyons que la Bible est le seul livre sacré faisant autorité "
        "absolue en matière de foi",
        "Nous croyons que Jésus-Christ est Dieu fait homme",
        "Nous croyons que Jésus-Christ est mort et ressuscité pour le pardon de "
        "nos péchés et qu'il reviendra à la fin des temps",
        "Nous croyons à la résurrection des morts, à la vie éternelle et au "
        "jugement dernier",
        "Nous croyons que la vie éternelle s'obtient uniquement par la grâce, au "
        "moyen de la foi en Jésus-Christ",
        "Nous croyons que le Saint-Esprit est celui promis par le Père, répandu "
        "par le Fils",
        "Nous croyons que le Saint-Esprit habite éternellement en chaque croyant",
        "Nous croyons que toute personne qui professe la foi en Jésus-Christ "
        "doit être baptisée par immersion",
    ]
)

OLD_ABOUT_DESCRIPTION = (
    "Fondée il y a plus de 40 ans, Mission Évangélique fédère des centaines "
    "d'Églises autour d'une vision commune : faire des disciples dans chaque "
    "communauté et chaque nation."
)

# (clé, valeur cible, anciennes valeurs par défaut réécrivables).
# Une clé vide est toujours réécrite ; sinon il faut une correspondance exacte
# avec l'une des anciennes valeurs listées.
UPDATES: list[tuple[str, str, tuple[str, ...]]] = [
    ("site_name", CHURCH_NAME, ("Mission Évangélique",)),
    ("site_tagline", "EENOJEC — Montréal, Québec", ("unis dans la foi",)),
    ("about_description", WELCOME, (OLD_ABOUT_DESCRIPTION,)),
    ("about_page_eyebrow", "Qui sommes-nous", ()),
    ("about_page_title", "Notre identité", ()),
    ("about_welcome", WELCOME, ()),
    ("about_vision_text", VISION, ()),
    ("about_mission_text", MISSION, ()),
    ("about_valeurs_list", VALEURS, ()),
    ("about_principes_list", PRINCIPES, ()),
    ("about_credo_list", CREDO, ()),
    # Résumés des cartes d'accueil : ils avaient été semés avec des formulations
    # génériques avant que le contenu de l'organisation ne soit connu.
    (
        "pillar_vision_desc",
        "Former des disciples pour Christ, jusqu'à la stature parfaite de Christ.",
        ("Une église par communauté, un disciple par foyer.",),
    ),
    (
        "pillar_mission_desc",
        "Adorer, édifier, secourir et évangéliser pour former des disciples.",
        ("Évangéliser, enraciner et envoyer.",),
    ),
    (
        "pillar_valeurs_desc",
        "Six engagements qui façonnent notre vie d'Église.",
        ("Intégrité, amour fraternel, excellence.",),
    ),
    (
        "pillar_credo_desc",
        "Les onze points de la foi que nous confessons.",
        ("La Bible, seule règle de foi et de vie.",),
    ),
    (
        "pillar_principes_desc",
        "Fidélité à la parole, rigueur dans l'étude, croissance du disciple.",
        ("Gouvernance partagée, transparence et service.",),
    ),
]

# L'église mère est créée une seule fois par le seed : sur une base existante
# elle garde le nom générique d'origine, qui s'affiche dans le sélecteur de
# dons, la fiche membre et l'administration. Ses coordonnées ne sont pas
# touchées : elles sont saisies par l'administrateur.
OLD_MOTHER_NAME = "Église mère (Mission)"

_SET_IF_DEFAULT = sa.text(
    """
    UPDATE app_settings
       SET value = :new_value
     WHERE key = :key
       AND (btrim(value) = '' OR value = ANY(:legacy))
    """
)

_RENAME_MOTHER = sa.text(
    "UPDATE churches SET name = :new_name WHERE parent_id IS NULL AND name = :old_name"
)


def upgrade() -> None:
    conn = op.get_bind()
    for key, new_value, legacy in UPDATES:
        conn.execute(
            _SET_IF_DEFAULT,
            {"key": key, "new_value": new_value, "legacy": list(legacy)},
        )
    conn.execute(_RENAME_MOTHER, {"old_name": OLD_MOTHER_NAME, "new_name": CHURCH_NAME})


def downgrade() -> None:
    """Ne revient en arrière que sur les valeurs encore identiques à celles
    posées ici — symétrique de la garde de l'upgrade, pour ne pas effacer une
    saisie faite entre-temps. Les clés qui étaient vides le redeviennent."""
    conn = op.get_bind()
    restore = sa.text(
        """
        UPDATE app_settings
           SET value = :previous
         WHERE key = :key
           AND value = :applied
        """
    )
    for key, applied, legacy in UPDATES:
        conn.execute(
            restore,
            {"key": key, "applied": applied, "previous": legacy[0] if legacy else ""},
        )
    conn.execute(_RENAME_MOTHER, {"old_name": CHURCH_NAME, "new_name": OLD_MOTHER_NAME})
