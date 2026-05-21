-- 083 — SECURITY FIX (Critical C2)
--
-- !!! APPLY ORDER: deploy the updated generate-agora-token and
-- generate-agora-rtm-token edge functions FIRST (they now read the config with the
-- service role). Applying this migration before redeploying will break token
-- generation, because the functions currently call get_agora_config() as the
-- authenticated caller.
--
-- Problem (verified live): get_agora_config() is SECURITY DEFINER and returns the
-- Agora App Certificate, but EXECUTE was granted to anon (migration 022 never
-- REVOKEd it). Anyone with the public anon key could retrieve the certificate via
-- POST /rest/v1/rpc/get_agora_config and mint unlimited Agora tokens.
--
-- After this runs, only the service role (used inside the edge functions) can read
-- the certificate.
REVOKE EXECUTE ON FUNCTION public.get_agora_config() FROM anon, authenticated, public;
ALTER FUNCTION public.get_agora_config() SET search_path = '';
GRANT EXECUTE ON FUNCTION public.get_agora_config() TO service_role;

-- REMINDER: rotate the Agora App Certificate in the Agora console and update the
-- app_config row, because the old certificate must be considered compromised:
--   UPDATE public.app_config SET config_value = '<NEW_CERT>'
--    WHERE config_key = 'agora_app_certificate';
