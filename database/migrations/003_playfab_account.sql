CREATE TABLE IF NOT EXISTS mokra_playfab_links (
    account_id uuid PRIMARY KEY REFERENCES mokra_accounts(id) ON DELETE CASCADE,
    playfab_id varchar(32) NOT NULL UNIQUE,
    linked_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mokra_playfab_pairings (
    code_hash text PRIMARY KEY,
    poll_hash text NOT NULL UNIQUE,
    playfab_id varchar(32) NOT NULL,
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
    claimed_at timestamptz
);
CREATE INDEX IF NOT EXISTS mokra_playfab_pairings_expiry_idx ON mokra_playfab_pairings(expires_at);
CREATE INDEX IF NOT EXISTS mokra_playfab_pairings_player_idx ON mokra_playfab_pairings(playfab_id);

CREATE TABLE IF NOT EXISTS mokra_photon_rooms (
    room_key text PRIMARY KEY,
    generation uuid NOT NULL DEFAULT gen_random_uuid(),
    active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS mokra_room_entries (
    generation uuid NOT NULL,
    actor_number integer NOT NULL,
    playfab_id varchar(32) NOT NULL,
    joined_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (generation, actor_number)
);
CREATE INDEX IF NOT EXISTS mokra_room_entries_player_idx ON mokra_room_entries(playfab_id);
