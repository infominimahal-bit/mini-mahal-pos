-- Migration to rename offline_hash to action_hash in users table, and drop offline_mode from app_settings
ALTER TABLE users RENAME COLUMN offline_hash TO action_hash;
ALTER TABLE app_settings DROP COLUMN offline_mode;

-- Also update the verification function to use action_hash instead of offline_hash
CREATE OR REPLACE FUNCTION public.verify_action_token(
  p_user_id uuid, p_role text, p_action text, p_sig text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, extensions AS $function$
DECLARE v_hash text; v_stored_role text; v_expected text;
BEGIN
  IF p_user_id IS NULL THEN RETURN false; END IF;
  IF p_sig IS NULL OR p_sig = '' THEN
    SELECT action_hash, role INTO v_hash, v_stored_role FROM users WHERE id = p_user_id;
    IF v_hash IS NULL THEN RETURN true; END IF;
    RETURN false;
  END IF;
  SELECT action_hash, role INTO v_hash, v_stored_role FROM users WHERE id = p_user_id;
  IF v_hash IS NULL OR v_stored_role IS NULL THEN RETURN false; END IF;
  IF v_stored_role <> p_role THEN RETURN false; END IF;
  v_expected := encode(digest(v_hash || '|' || p_user_id::text || '|' || p_role || '|' || p_action, 'sha256'), 'hex');
  RETURN v_expected = p_sig;
END;
$function$;

-- Update verify_table_write to use action_hash instead of offline_hash
CREATE OR REPLACE FUNCTION public.verify_table_write(
  p_user_id uuid, p_role text, p_sig text, p_action text, VARIADIC p_allowed text[]
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, extensions AS $function$
DECLARE v_hash text; v_stored_role text; v_expected text;
BEGIN
  IF p_user_id IS NULL THEN RETURN false; END IF;
  IF p_sig IS NULL OR p_sig = '' THEN
    SELECT action_hash, role INTO v_hash, v_stored_role FROM users WHERE id = p_user_id;
    IF v_hash IS NULL THEN RETURN true; END IF;
    RETURN false;
  END IF;
  SELECT action_hash, role INTO v_hash, v_stored_role FROM users WHERE id = p_user_id;
  IF v_hash IS NULL OR v_stored_role IS NULL THEN RETURN false; END IF;
  IF v_stored_role <> p_role THEN RETURN false; END IF;
  v_expected := encode(digest(v_hash || '|' || p_user_id::text || '|' || p_role || '|' || p_action, 'sha256'), 'hex');
  IF v_expected <> p_sig THEN RETURN false; END IF;
  RETURN p_role = ANY(p_allowed);
END;
$function$;
