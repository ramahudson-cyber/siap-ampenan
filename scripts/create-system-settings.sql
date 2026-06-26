-- ============================================================
-- SETUP SYSTEM SETTINGS (untuk Tab Jam Kerja di PengaturanPage)
-- ============================================================

-- 1. Buat tabel system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert default values
INSERT INTO system_settings (setting_key, value, category) VALUES
  ('work_start_time', '07:30', 'attendance'),
  ('work_end_time', '14:00', 'attendance'),
  ('late_tolerance_minutes', '5', 'attendance'),
  ('default_radius_meter', '200', 'attendance'),
  ('selfie_retention_days', '30', 'attendance'),
  ('annual_leave_quota_asn', '12', 'leave'),
  ('annual_leave_quota_pppk', '12', 'leave'),
  ('annual_leave_quota_tpk', '12', 'leave'),
  ('default_password', 'puskesmas123', 'security'),
  ('password_min_length', '6', 'security')
ON CONFLICT (setting_key) DO NOTHING;

-- 3. Buat function set_system_setting (upsert)
CREATE OR REPLACE FUNCTION set_system_setting(
  p_setting_key TEXT,
  p_value TEXT,
  p_category TEXT DEFAULT 'general'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO system_settings (setting_key, value, category, updated_at)
  VALUES (p_setting_key, p_value, p_category, NOW())
  ON CONFLICT (setting_key)
  DO UPDATE SET
    value = p_value,
    category = COALESCE(p_category, system_settings.category),
    updated_at = NOW();
END;
$$;
