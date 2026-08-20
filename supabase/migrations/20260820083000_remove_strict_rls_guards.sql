-- Drop restrictive INSERT/UPDATE guards from app_settings, expenses, and suppliers
DROP POLICY IF EXISTS app_settings_write_guard ON public.app_settings;
DROP POLICY IF EXISTS app_settings_update_guard ON public.app_settings;
DROP POLICY IF EXISTS expenses_write_guard ON public.expenses;
DROP POLICY IF EXISTS expenses_update_guard ON public.expenses;
DROP POLICY IF EXISTS suppliers_write_guard ON public.suppliers;
DROP POLICY IF EXISTS suppliers_update_guard ON public.suppliers;

-- Add permissive FOR ALL policies
DROP POLICY IF EXISTS app_settings_all ON public.app_settings;
CREATE POLICY app_settings_all ON public.app_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS expenses_all ON public.expenses;
CREATE POLICY expenses_all ON public.expenses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS suppliers_all ON public.suppliers;
CREATE POLICY suppliers_all ON public.suppliers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
