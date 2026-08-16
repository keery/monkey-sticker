-- Schéma initial de la boutique Monkey Sticker.
-- Joué automatiquement au premier démarrage du conteneur (volume vierge).
-- L'application le ré-applique de façon idempotente au démarrage
-- (lib/db.ts → ensureSchema), donc il reste sûr sur un volume déjà existant.
-- Doit rester en phase avec SCHEMA_SQL dans lib/db.ts.

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id         BIGSERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  source     TEXT NOT NULL DEFAULT 'site',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  handle TEXT PRIMARY KEY,
  seq    BIGSERIAL,
  data   JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  handle TEXT PRIMARY KEY,
  seq    BIGSERIAL,
  data   JSONB NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 10001;

CREATE TABLE IF NOT EXISTS orders (
  id                TEXT PRIMARY KEY,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  stripe_session_id TEXT UNIQUE,
  data              JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS proposals (
  id         TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status     TEXT NOT NULL DEFAULT 'new',
  data       JSONB NOT NULL
);

-- Comptes & authentification -------------------------------------------
-- role : TEXT libre ('admin' | 'customer' | …) pour ajouter des rôles sans
-- migration. users AVANT les tables qui la référencent (clés étrangères).
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer',
  name          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessions à état : token opaque haute entropie, validité vérifiée en base.
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

-- Réinitialisation de mot de passe : on stocke le HASH du token (jamais le
-- token brut, présent uniquement dans le lien e-mail).
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prt_expires_at_idx ON password_reset_tokens(expires_at);
