-- RPC to Block User & Terminate Sessions instantly
CREATE OR REPLACE FUNCTION admin_block_user(p_target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is admin or manager
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager')) THEN
    RAISE EXCEPTION 'Not authorized to block users';
  END IF;

  -- 1. Mark as inactive in public schema
  UPDATE public.users SET active = false WHERE id = p_target_user_id;
  
  -- 2. Wipe their sessions so active JWT refreshes fail immediately
  DELETE FROM auth.sessions WHERE user_id = p_target_user_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = p_target_user_id;
END;
$$;

-- RPC to Change Password & Force Logout
CREATE OR REPLACE FUNCTION admin_change_password(p_target_user_id UUID, p_new_password TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can change passwords';
  END IF;

  -- Update password in auth schema
  UPDATE auth.users 
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')) 
  WHERE id = p_target_user_id;

  -- Terminate existing sessions so they must re-login
  DELETE FROM auth.sessions WHERE user_id = p_target_user_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = p_target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_block_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_change_password(UUID, TEXT) TO authenticated;
