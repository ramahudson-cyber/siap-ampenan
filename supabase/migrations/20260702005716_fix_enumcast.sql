-- Fix insert into auth.identities - add provider_id
CREATE OR REPLACE FUNCTION create_employee_with_auth(
  p_username TEXT,
  p_full_name TEXT,
  p_email TEXT,
  p_password TEXT,
  p_role TEXT DEFAULT 'pegawai',
  p_employee_status TEXT DEFAULT 'tpk',
  p_department TEXT DEFAULT NULL,
  p_position TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_user_id UUID;
  encrypted_pw TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RETURN json_build_object('success', false, 'error', 'Email already registered');
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE username = p_username) THEN
    RETURN json_build_object('success', false, 'error', 'Username already exists');
  END IF;

  new_user_id := gen_random_uuid();
  encrypted_pw := crypt(p_password, gen_salt('bf'));

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token, aud, role
  ) VALUES (
    new_user_id, '00000000-0000-0000-0000-000000000000',
    p_email, encrypted_pw,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('username', p_username, 'full_name', p_full_name),
    NOW(), NOW(), '', '', '', '',
    'authenticated', 'authenticated'
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    new_user_id, new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', p_email),
    'email', p_email,
    NOW(), NOW(), NOW()
  );

  INSERT INTO profiles (
    id, username, full_name, email,
    role, employee_status, department, position,
    password_changed, created_at
  ) VALUES (
    new_user_id, p_username, p_full_name, p_email,
    p_role::user_role, p_employee_status::employee_status, p_department, p_position,
    false, NOW()
  );

  RETURN json_build_object(
    'success', true,
    'id', new_user_id,
    'email', p_email,
    'message', 'Employee created successfully'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

