"""merge formations into events (category field, guest registrations)

Fusionne le module Formations dans Événements : ajoute category/instructor/
price/capacity/status à events, rend member_id nullable et ajoute
first_name/last_name/email sur event_registrations, migre les données de
formations/formation_registrations puis supprime ces deux tables.

Revision ID: n6o7p8q9r0s1
Revises: m5n6o7p8q9r0
Create Date: 2026-07-18
"""

from typing import Sequence, Union

from alembic import op

revision: str = "n6o7p8q9r0s1"
down_revision: Union[str, None] = "m5n6o7p8q9r0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── events : nouvelles colonnes ──────────────────────────────────────
    op.execute(
        "ALTER TABLE events ADD COLUMN IF NOT EXISTS category VARCHAR(20) "
        "NOT NULL DEFAULT 'conference'"
    )
    op.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS instructor VARCHAR(150)")
    op.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 0")
    op.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity INTEGER")
    op.execute("UPDATE events SET capacity = max_participants")
    op.execute("ALTER TABLE events DROP COLUMN IF EXISTS max_participants")

    op.execute(
        "ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(20) "
        "NOT NULL DEFAULT 'draft'"
    )
    op.execute(
        "UPDATE events SET status = CASE WHEN is_published THEN 'published' ELSE 'draft' END"
    )
    op.execute("DROP INDEX IF EXISTS ix_events_is_published")
    op.execute("ALTER TABLE events DROP COLUMN IF EXISTS is_published")

    # ── event_registrations : member_id nullable + identité du participant ──
    op.execute("ALTER TABLE event_registrations ALTER COLUMN member_id DROP NOT NULL")
    op.execute(
        "ALTER TABLE event_registrations "
        "DROP CONSTRAINT IF EXISTS event_registrations_member_id_fkey"
    )
    op.execute(
        "ALTER TABLE event_registrations ADD CONSTRAINT "
        "event_registrations_member_id_fkey FOREIGN KEY (member_id) "
        "REFERENCES members(id) ON DELETE SET NULL"
    )

    op.execute("ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)")
    op.execute("ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)")
    op.execute("ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS email VARCHAR(255)")
    op.execute(
        "UPDATE event_registrations er SET "
        "first_name = m.first_name, last_name = m.last_name, email = m.email "
        "FROM members m WHERE er.member_id = m.id"
    )
    op.execute("ALTER TABLE event_registrations ALTER COLUMN first_name SET NOT NULL")
    op.execute("ALTER TABLE event_registrations ALTER COLUMN last_name SET NOT NULL")
    op.execute("ALTER TABLE event_registrations ALTER COLUMN email SET NOT NULL")

    op.execute(
        "ALTER TABLE event_registrations "
        "DROP CONSTRAINT IF EXISTS uq_event_registrations_event_member"
    )
    op.execute(
        "ALTER TABLE event_registrations ADD CONSTRAINT "
        "uq_event_registrations_event_email UNIQUE (event_id, email)"
    )

    # ── migration des données formations -> events ──────────────────────
    op.execute("ALTER TABLE events ADD COLUMN legacy_formation_id INTEGER")
    op.execute(
        """
        INSERT INTO events (
            title, description, category, date_start, location,
            instructor, price, capacity, status, created_at, updated_at,
            legacy_formation_id
        )
        SELECT
            title, description, 'formation', formation_date::timestamptz, NULL,
            instructor, price, capacity,
            CASE status
                WHEN 'draft' THEN 'draft'
                WHEN 'published' THEN 'published'
                WHEN 'archived' THEN 'completed'
                ELSE 'draft'
            END,
            created_at, created_at, id
        FROM formations
        """
    )
    op.execute(
        """
        INSERT INTO event_registrations (
            event_id, member_id, first_name, last_name, email, registered_at, status
        )
        SELECT e.id, NULL, fr.first_name, fr.last_name, fr.email, fr.created_at, 'confirmed'
        FROM formation_registrations fr
        JOIN events e ON e.legacy_formation_id = fr.formation_id
        """
    )
    op.execute("ALTER TABLE events DROP COLUMN legacy_formation_id")

    op.execute("DROP TABLE IF EXISTS formation_registrations")
    op.execute("DROP TABLE IF EXISTS formations")


def downgrade() -> None:
    # Recrée formations / formation_registrations et y rapatrie les
    # événements de catégorie 'formation' (best-effort — les inscriptions
    # invitées sur des événements non-formation créées après la fusion
    # sont irrécupérables sous l'ancien schéma et sont supprimées).
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS formations (
            id                SERIAL PRIMARY KEY,
            title             VARCHAR(200)  NOT NULL,
            description       TEXT,
            instructor        VARCHAR(150)  NOT NULL,
            formation_date    DATE          NOT NULL,
            price             NUMERIC(10, 2) NOT NULL DEFAULT 0,
            capacity          INTEGER       NOT NULL,
            status            VARCHAR(20)   NOT NULL DEFAULT 'draft',
            created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS formation_registrations (
            id              SERIAL PRIMARY KEY,
            formation_id    INTEGER NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
            first_name      VARCHAR(100) NOT NULL,
            last_name       VARCHAR(100) NOT NULL,
            email           VARCHAR(255) NOT NULL,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_formation_registration_email UNIQUE (formation_id, email)
        )
        """
    )

    op.execute("ALTER TABLE formations ADD COLUMN legacy_event_id INTEGER")
    op.execute(
        """
        INSERT INTO formations (
            title, description, instructor, formation_date, price, capacity,
            status, created_by, created_at, legacy_event_id
        )
        SELECT
            title, description, COALESCE(instructor, ''), date_start::date,
            COALESCE(price, 0), COALESCE(capacity, 0),
            CASE status
                WHEN 'completed' THEN 'archived'
                WHEN 'published' THEN 'published'
                ELSE 'draft'
            END,
            NULL, created_at, id
        FROM events WHERE category = 'formation'
        """
    )
    op.execute(
        """
        INSERT INTO formation_registrations (formation_id, first_name, last_name, email, created_at)
        SELECT f.id, er.first_name, er.last_name, er.email, er.registered_at
        FROM event_registrations er
        JOIN events e ON e.id = er.event_id AND e.category = 'formation'
        JOIN formations f ON f.legacy_event_id = e.id
        """
    )
    op.execute("ALTER TABLE formations DROP COLUMN legacy_event_id")

    op.execute("DELETE FROM event_registrations WHERE event_id IN (SELECT id FROM events WHERE category = 'formation')")
    op.execute("DELETE FROM events WHERE category = 'formation'")

    # ── event_registrations : retour au schéma d'origine ────────────────
    op.execute(
        "ALTER TABLE event_registrations "
        "DROP CONSTRAINT IF EXISTS uq_event_registrations_event_email"
    )
    op.execute("DELETE FROM event_registrations WHERE member_id IS NULL")
    op.execute(
        "ALTER TABLE event_registrations "
        "DROP CONSTRAINT IF EXISTS event_registrations_member_id_fkey"
    )
    op.execute(
        "ALTER TABLE event_registrations ADD CONSTRAINT "
        "event_registrations_member_id_fkey FOREIGN KEY (member_id) "
        "REFERENCES members(id) ON DELETE CASCADE"
    )
    op.execute("ALTER TABLE event_registrations ALTER COLUMN member_id SET NOT NULL")
    op.execute(
        "ALTER TABLE event_registrations ADD CONSTRAINT "
        "uq_event_registrations_event_member UNIQUE (event_id, member_id)"
    )
    op.execute("ALTER TABLE event_registrations DROP COLUMN IF EXISTS first_name")
    op.execute("ALTER TABLE event_registrations DROP COLUMN IF EXISTS last_name")
    op.execute("ALTER TABLE event_registrations DROP COLUMN IF EXISTS email")

    # ── events : retour au schéma d'origine ──────────────────────────────
    op.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false")
    op.execute("UPDATE events SET is_published = (status = 'published')")
    op.execute("CREATE INDEX IF NOT EXISTS ix_events_is_published ON events (is_published)")

    op.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS max_participants INTEGER")
    op.execute("UPDATE events SET max_participants = capacity")

    op.execute("ALTER TABLE events DROP COLUMN IF EXISTS status")
    op.execute("ALTER TABLE events DROP COLUMN IF EXISTS capacity")
    op.execute("ALTER TABLE events DROP COLUMN IF EXISTS category")
    op.execute("ALTER TABLE events DROP COLUMN IF EXISTS instructor")
    op.execute("ALTER TABLE events DROP COLUMN IF EXISTS price")
