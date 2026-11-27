DROP POLICY saves_read_own ON public.game_saves;
CREATE POLICY saves_read_own ON public.game_saves FOR SELECT TO authenticated USING ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid())));
CREATE FUNCTION public.arcade_name_available(candidate text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT lower(candidate) ~ '^[a-z0-9_]{3,16}$' AND lower(candidate) <> 'zzzk' AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = lower(candidate)) AND NOT EXISTS (SELECT 1 FROM public.migration_identities WHERE username = lower(candidate));
$$;
REVOKE EXECUTE ON FUNCTION public.arcade_name_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arcade_name_available(text) TO anon, authenticated;