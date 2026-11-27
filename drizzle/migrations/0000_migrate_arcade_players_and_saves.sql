CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{3,16}$'),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_read_own ON public.profiles FOR SELECT TO authenticated USING ((select auth.uid()) = id);
CREATE TABLE public.user_roles (
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('player','admin')),
 PRIMARY KEY (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY roles_read_own ON public.user_roles FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE TABLE public.game_saves (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 mode text NOT NULL CHECK (mode IN ('normal','hardcore')),
 save jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, mode)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_saves TO authenticated;
GRANT ALL ON public.game_saves TO service_role;
ALTER TABLE public.game_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY saves_read_own ON public.game_saves FOR SELECT TO authenticated USING ((select auth.uid()) = user_id AND (select (auth.jwt()->>'email_verified')::boolean) IS DISTINCT FROM false AND (select auth.jwt()->>'email') IS NOT NULL);
CREATE POLICY saves_insert_own ON public.game_saves FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid())));
CREATE POLICY saves_update_own ON public.game_saves FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY saves_delete_own ON public.game_saves FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);
CREATE TABLE public.migration_identities (
 original_user_id text PRIMARY KEY,
 verified_email text NOT NULL UNIQUE,
 username text NOT NULL UNIQUE,
 auth_user_id uuid UNIQUE REFERENCES public.profiles(id),
 imported_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.migration_identities TO service_role;
ALTER TABLE public.migration_identities ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.leaderboard_keys (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 secret_key text NOT NULL CHECK (secret_key ~ '^[a-f0-9]{64}$')
);
GRANT SELECT, INSERT ON public.leaderboard_keys TO authenticated;
GRANT ALL ON public.leaderboard_keys TO service_role;
ALTER TABLE public.leaderboard_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY keys_read_own ON public.leaderboard_keys FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY keys_insert_own ON public.leaderboard_keys FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE FUNCTION public.create_arcade_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE requested text; legacy public.migration_identities%ROWTYPE;
BEGIN
 IF NEW.email_confirmed_at IS NULL THEN RETURN NEW; END IF;
 IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN RETURN NEW; END IF;
 SELECT * INTO legacy FROM public.migration_identities WHERE lower(verified_email) = lower(NEW.email);
 IF FOUND THEN
  IF legacy.auth_user_id IS NOT NULL AND legacy.auth_user_id <> NEW.id THEN RAISE EXCEPTION 'Imported identity already linked'; END IF;
  requested := legacy.username;
 ELSE
  requested := lower(NEW.raw_user_meta_data->>'username');
  IF requested IS NULL OR requested !~ '^[a-z0-9_]{3,16}$' OR requested = 'zzzk' OR EXISTS (SELECT 1 FROM public.migration_identities WHERE username = requested) THEN
   requested := 'p_' || substr(replace(NEW.id::text, '-', ''),1,12);
  END IF;
 END IF;
 INSERT INTO public.profiles(id, username) VALUES (NEW.id, requested);
 INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'player');
 UPDATE public.migration_identities SET auth_user_id = NEW.id WHERE original_user_id = legacy.original_user_id;
 RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_arcade_profile() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER arcade_profile_on_verified AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_arcade_profile();