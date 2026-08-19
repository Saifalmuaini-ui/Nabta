-- ═══════════════════════════════════════════════════════════════════════════
-- Fast path: make the three demo logins work RIGHT NOW.
--
-- This only touches auth. It creates any missing account, confirms the email
-- so sign-in works without an inbox, and resets the password to the value
-- printed on the sign-in page.
--
-- You still need 0001_init.sql afterwards — without it there are no profiles,
-- so everyone signs in as a plain "user" and /console and /admin stay shut.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

do $blk$
declare
  acct record;
  uid  uuid;
begin
  for acct in
    select * from (values
      ('user@nabta.ae',  'NabtaUser123!',  'Sara Al Marzooqi'),
      ('gov@nabta.ae',   'NabtaGov123!',   'Sharjah Municipality'),
      ('admin@nabta.ae', 'NabtaAdmin123!', 'Nabta Admin')
    ) as t(email, pw, name)
  loop
    select id into uid from auth.users where email = acct.email;

    if uid is null then
      uid := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
        acct.email, extensions.crypt(acct.pw, extensions.gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', acct.name),
        '', '', '', ''
      );

      begin
        insert into auth.identities (id, user_id, identity_data, provider, provider_id,
                                     last_sign_in_at, created_at, updated_at)
        values (gen_random_uuid(), uid,
                jsonb_build_object('sub', uid::text, 'email', acct.email),
                'email', acct.email, now(), now(), now());
      exception when others then
        insert into auth.identities (id, user_id, identity_data, provider,
                                     last_sign_in_at, created_at, updated_at)
        values (gen_random_uuid(), uid,
                jsonb_build_object('sub', uid::text, 'email', acct.email),
                'email', now(), now(), now());
      end;

      raise notice 'created %', acct.email;
    else
      update auth.users
         set encrypted_password = extensions.crypt(acct.pw, extensions.gen_salt('bf')),
             email_confirmed_at = coalesce(email_confirmed_at, now()),
             updated_at         = now()
       where id = uid;

      raise notice 'confirmed and reset %', acct.email;
    end if;
  end loop;
end $blk$;

-- Should print three rows, each with a confirmed timestamp.
select email, email_confirmed_at
from auth.users
where email in ('user@nabta.ae','gov@nabta.ae','admin@nabta.ae')
order by email;
