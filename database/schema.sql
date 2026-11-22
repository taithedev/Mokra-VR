CREATE TABLE IF NOT EXISTS mokra_accounts (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
username varchar(20) NOT NULL,
display_name varchar(32) NOT NULL,
password_hash text NOT NULL,
fur_color varchar(7) NOT NULL DEFAULT '#d1ef7c',
level integer NOT NULL DEFAULT 1,
total_runs integer NOT NULL DEFAULT 0,
shards integer NOT NULL DEFAULT 0,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS mokra_accounts_username_unique ON mokra_accounts (lower(username));
CREATE TABLE IF NOT EXISTS mokra_pairings (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
code_hash text UNIQUE NOT NULL,
poll_hash text UNIQUE NOT NULL,
device_name varchar(64) NOT NULL,
account_id uuid REFERENCES mokra_accounts(id) ON DELETE CASCADE,
created_at timestamptz NOT NULL DEFAULT now(),
expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
consumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS mokra_pairings_expiry_idx ON mokra_pairings(expires_at);
CREATE TABLE IF NOT EXISTS mokra_game_sessions (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
account_id uuid NOT NULL REFERENCES mokra_accounts(id) ON DELETE CASCADE,
token_hash text UNIQUE NOT NULL,
device_name varchar(64) NOT NULL,
created_at timestamptz NOT NULL DEFAULT now(),
expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS mokra_game_sessions_user_idx ON mokra_game_sessions(account_id, created_at DESC);
CREATE TABLE IF NOT EXISTS mokra_rate_limits (
key text PRIMARY KEY,
hits integer NOT NULL DEFAULT 1,
reset_at timestamptz NOT NULL
);

-- V6: optional additive migration for existing databases. Never overwrite data.
CREATE TABLE IF NOT EXISTS mokra_web_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL REFERENCES mokra_accounts(id) ON DELETE CASCADE, token_hash text UNIQUE NOT NULL, user_agent varchar(180) NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT (now()+interval '14 days'));
CREATE INDEX IF NOT EXISTS mokra_web_sessions_account_idx ON mokra_web_sessions(account_id,created_at DESC);
ALTER TABLE mokra_accounts ADD COLUMN IF NOT EXISTS particle_mode varchar(12) NOT NULL DEFAULT 'rainbow';
ALTER TABLE mokra_accounts ADD COLUMN IF NOT EXISTS particle_density integer NOT NULL DEFAULT 2;
