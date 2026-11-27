CREATE UNIQUE INDEX migration_identities_email_lower_idx ON public.migration_identities (lower(verified_email));
CREATE TABLE public.migration_saves (
 original_user_id text NOT NULL REFERENCES public.migration_identities(original_user_id) ON DELETE CASCADE,
 mode text NOT NULL CHECK (mode IN ('normal','hardcore')),
 save jsonb NOT NULL,
 PRIMARY KEY (original_user_id, mode)
);
GRANT ALL ON public.migration_saves TO service_role;
ALTER TABLE public.migration_saves ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.migration_user_roles (
 original_user_id text NOT NULL REFERENCES public.migration_identities(original_user_id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('player','admin')),
 PRIMARY KEY (original_user_id, role)
);
GRANT ALL ON public.migration_user_roles TO service_role;
ALTER TABLE public.migration_user_roles ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.create_arcade_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
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
 IF legacy.original_user_id IS NOT NULL THEN
  UPDATE public.migration_identities SET auth_user_id = NEW.id WHERE original_user_id = legacy.original_user_id;
  INSERT INTO public.game_saves(user_id, mode, save) SELECT NEW.id, mode, save FROM public.migration_saves WHERE original_user_id = legacy.original_user_id;
  INSERT INTO public.user_roles(user_id, role) SELECT NEW.id, role FROM public.migration_user_roles WHERE original_user_id = legacy.original_user_id ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_arcade_profile() FROM PUBLIC, anon, authenticated;