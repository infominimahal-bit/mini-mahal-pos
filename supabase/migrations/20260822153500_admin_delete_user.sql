CREATE OR REPLACE FUNCTION admin_delete_user(p_target_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
    -- Verify the caller is an admin or manager
    IF (SELECT role FROM public.users WHERE id = auth.uid()) NOT IN ('admin', 'manager') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Delete from auth.users (will cascade to public.users via ON DELETE CASCADE)
    DELETE FROM auth.users WHERE id = p_target_user_id;
END;
$$;
