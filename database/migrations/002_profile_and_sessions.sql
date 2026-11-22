-- Mokra v6: additive migration, keeps existing accounts and game sessions.
CREATE TABLE IF NOT EXISTS mokra_web_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 account_id uuid NOT NULL REFERENCES mokra_accounts(id) ON DELETE CASCADE,
 token_hash text UNIQUE NOT NULL,
 user_agent varchar(180) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT (now()+interval '14 days')
);
CREATE INDEX IF NOT EXISTS mokra_web_sessions_account_idx ON mokra_web_sessions(account_id,created_at DESC);
ALTER TABLE mokra_accounts ADD COLUMN IF NOT EXISTS particle_mode varchar(12) NOT NULL DEFAULT 'rainbow';
ALTER TABLE mokra_accounts ADD COLUMN IF NOT EXISTS particle_density integer NOT NULL DEFAULT 2;
ALTER TABLE mokra_accounts ALTER COLUMN fur_color SET DEFAULT '#476bff';
