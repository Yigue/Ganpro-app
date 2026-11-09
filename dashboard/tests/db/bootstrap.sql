-- Local test-only Auth/RLS scaffold, not a production migration.
CREATE SCHEMA auth;
DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='authenticator') THEN CREATE ROLE authenticator LOGIN PASSWORD 'ganpro_rest_local' NOINHERIT; END IF; END $$;
GRANT anon, authenticated, service_role TO authenticator;
CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (NULLIF(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
