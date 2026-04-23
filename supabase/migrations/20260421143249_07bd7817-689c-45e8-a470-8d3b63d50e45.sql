DELETE FROM auth.users WHERE id = '9de59752-79d6-48cc-b2da-ef035b6c6cc5';

UPDATE auth.users
SET email = 'kavi@gmail.com',
    encrypted_password = crypt('kavi0921', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE id = '727a2a0c-0416-4968-a7d3-7c66eb774e83';

UPDATE auth.identities
SET identity_data = jsonb_set(identity_data, '{email}', '"kavi@gmail.com"'),
    updated_at = now()
WHERE user_id = '727a2a0c-0416-4968-a7d3-7c66eb774e83' AND provider = 'email';