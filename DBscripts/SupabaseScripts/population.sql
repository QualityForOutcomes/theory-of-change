--data population



BEGIN;

-- ADDING USERS 

INSERT INTO "User" (email_address, username, password_hash)
VALUES
  ('carol@demo.com',  'carol',  repeat('c', 40)),
  ('dave@demo.com',   'dave',   repeat('d', 40)),
  ('eva@demo.com',    'eva',    repeat('e', 40)),
  ('farah@demo.com',  'farah',  repeat('f', 40)),
  ('gina@demo.com',   'gina',   repeat('g', 40)),
  ('harry@demo.com',  'harry',  repeat('h', 40))
ON CONFLICT (email_address) DO NOTHING;

INSERT INTO UserProfile (email_address, first_name, last_name, organisation)
VALUES
  ('carol@demo.com','Carol','Lee','Delta Org'),
  ('dave@demo.com', 'Dave','Santos','Epsilon Pty'),
  ('eva@demo.com',  'Eva','Patel','Gamma Labs'),
  ('farah@demo.com','Farah','Iqbal','Omega Group'),
  ('gina@demo.com', 'Gina','Tran','Lambda Inc'),
  ('harry@demo.com','Harry','Park','Zeta Assoc')
ON CONFLICT (email_address) DO NOTHING;

INSERT INTO UserAuthProvider (email_address, provider, provider_user_id, email_verified, linked_at)
VALUES
  ('carol@demo.com','google','google|carol',TRUE, NOW() - INTERVAL '18 days'),
  ('dave@demo.com','github','github|dave',TRUE, NOW() - INTERVAL '15 days'),
  ('eva@demo.com','google','google|eva',TRUE, NOW() - INTERVAL '12 days'),
  ('farah@demo.com','password','local|farah',TRUE, NOW() - INTERVAL '10 days'),
  ('gina@demo.com','password','local|gina',FALSE, NOW() - INTERVAL '7 days'),
  ('harry@demo.com','github','github|harry',TRUE, NOW() - INTERVAL '5 days')
ON CONFLICT (provider, provider_user_id) DO NOTHING;

INSERT INTO UserTermsAcceptance (email_address, accepted_at)
VALUES
  ('carol@demo.com', NOW() - INTERVAL '18 days'),
  ('dave@demo.com',  NOW() - INTERVAL '15 days'),
  ('eva@demo.com',   NOW() - INTERVAL '12 days'),
  ('farah@demo.com', NOW() - INTERVAL '10 days'),
  ('gina@demo.com',  NOW() - INTERVAL '7 days'),
  ('harry@demo.com', NOW() - INTERVAL '5 days')
ON CONFLICT (email_address) DO NOTHING;

INSERT INTO PasswordReset (email_address, token_hash, expires_at, created_at)
VALUES
  ('carol@demo.com', md5('carol-r1'||NOW()::text), NOW() + INTERVAL '1 hour', NOW()),
  ('dave@demo.com',  md5('dave-r1'||NOW()::text),  NOW() + INTERVAL '1 hour', NOW()),
  ('eva@demo.com',   md5('eva-r1'||NOW()::text),   NOW() + INTERVAL '1 hour', NOW())
ON CONFLICT DO NOTHING;

-- PLAN
INSERT INTO Plan (name, price_cents, billing_interval) VALUES
  ('Basic Monthly',  990,  'month'),
  ('Pro Monthly',   1990,  'month'),
  ('Pro Yearly',   19900,  'year')
ON CONFLICT (name) DO NOTHING;

-- SUBSCRIPTIONS ACROSS ALL STATUS 
INSERT INTO Subscription
  (email_address, plan_ID, status, start_date, renewal_date, updated_at, auto_renew)
SELECT 'carol@demo.com', p.plan_ID, 'active',
       NOW() - INTERVAL '25 days', NOW() + INTERVAL '5 days', NOW(), TRUE
FROM Plan p WHERE p.name = 'Pro Monthly'
ON CONFLICT DO NOTHING;

INSERT INTO Subscription
  (email_address, plan_ID, status, start_date, renewal_date, updated_at, auto_renew)
SELECT 'dave@demo.com', p.plan_ID, 'past_due',
       NOW() - INTERVAL '40 days', NOW() - INTERVAL '10 days', NOW(), TRUE
FROM Plan p WHERE p.name = 'Pro Monthly'
ON CONFLICT DO NOTHING;

INSERT INTO Subscription
  (email_address, plan_ID, status, start_date, renewal_date, updated_at, expires_at, auto_renew)
SELECT 'eva@demo.com', p.plan_ID, 'canceled',
       NOW() - INTERVAL '90 days', NOW() - INTERVAL '60 days', NOW(),
       NOW() - INTERVAL '30 days', FALSE
FROM Plan p WHERE p.name = 'Basic Monthly'
ON CONFLICT DO NOTHING;

INSERT INTO Subscription
  (email_address, plan_ID, status, start_date, renewal_date, updated_at, auto_renew)
SELECT 'farah@demo.com', p.plan_ID, 'trialing',
       NOW() - INTERVAL '5 days', NOW() + INTERVAL '360 days', NOW(), TRUE
FROM Plan p WHERE p.name = 'Pro Yearly'
ON CONFLICT DO NOTHING;

INSERT INTO Subscription
  (email_address, plan_ID, status, start_date, updated_at, auto_renew)
SELECT 'gina@demo.com', p.plan_ID, 'incomplete',
       NOW() - INTERVAL '2 days', NOW(), FALSE
FROM Plan p WHERE p.name = 'Pro Monthly'
ON CONFLICT DO NOTHING;

INSERT INTO Subscription
  (email_address, plan_ID, status, start_date, renewal_date, updated_at, auto_renew)
SELECT 'harry@demo.com', p.plan_ID, 'active',
       NOW() - INTERVAL '7 days', NOW() + INTERVAL '23 days', NOW(), TRUE
FROM Plan p WHERE p.name = 'Basic Monthly'
ON CONFLICT DO NOTHING;

-- INVOICES
WITH s AS (
  SELECT email_address, subscription_ID
  FROM Subscription
  WHERE email_address IN ('carol@demo.com','dave@demo.com','eva@demo.com','farah@demo.com','gina@demo.com','harry@demo.com')
)
INSERT INTO Invoice
 (subscription_ID, email_address, amount_cents, currency,
  period_start, period_end, issued_at, due_at, status, pdf_url, is_public)
VALUES
  ((SELECT subscription_ID FROM s WHERE email_address='carol@demo.com'),
    'carol@demo.com', 1990, 'AUD',
    date_trunc('month', NOW()) - INTERVAL '1 month',
    date_trunc('month', NOW()) - INTERVAL '1 day',
    NOW() - INTERVAL '26 days', NOW() - INTERVAL '21 days', 'paid',
    'https://example.com/invoices/carol-paid.pdf', TRUE),
  ((SELECT subscription_ID FROM s WHERE email_address='dave@demo.com'),
    'dave@demo.com', 1990, 'AUD',
    date_trunc('month', NOW()),
    date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day',
    NOW() - INTERVAL '14 days', NOW() - INTERVAL '4 days', 'open',
    NULL, FALSE),
  ((SELECT subscription_ID FROM s WHERE email_address='eva@demo.com'),
    'eva@demo.com', 990, 'AUD',
    NOW() - INTERVAL '65 days', NOW() - INTERVAL '35 days',
    NOW() - INTERVAL '64 days', NOW() - INTERVAL '60 days', 'void',
    NULL, FALSE),
  ((SELECT subscription_ID FROM s WHERE email_address='farah@demo.com'),
    'farah@demo.com', 19900, 'AUD',
    NOW(), NOW() + INTERVAL '1 year', NOW(), NOW() + INTERVAL '30 days',
    'draft', NULL, FALSE),
  ((SELECT subscription_ID FROM s WHERE email_address='gina@demo.com'),
    'gina@demo.com', 1990, 'AUD',
    NOW() - INTERVAL '40 days', NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '39 days', NOW() - INTERVAL '30 days', 'uncollectible',
    NULL, FALSE),
  ((SELECT subscription_ID FROM s WHERE email_address='harry@demo.com'),
    'harry@demo.com', 990, 'AUD',
    date_trunc('month', NOW()),
    date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day',
    NOW() - INTERVAL '3 days', NOW() + INTERVAL '7 days', 'paid',
    'https://example.com/invoices/harry-paid.pdf', TRUE),
  ((SELECT subscription_ID FROM s WHERE email_address='harry1@demo.com'),
    'harry1@demo.com', 990, 'AUD',
    date_trunc('month', NOW()),
    date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day',
    NOW() - INTERVAL '3 days', NOW() + INTERVAL '7 days', 'paid',
    'https://example.com/invoices/harry-paid.pdf', TRUE)
ON CONFLICT DO NOTHING;

-- PROJECT + CANVAS + EXPORT
INSERT INTO Project (email_address, title, updated_at, created_at) VALUES
  ('carol@demo.com','Community Health Mapping', NOW() - INTERVAL '1 day', NOW() - INTERVAL '20 days'),
  ('carol@demo.com','Food Security Initiative', NOW() - INTERVAL '3 days', NOW() - INTERVAL '25 days'),
  ('dave@demo.com','Youth Coding Bootcamp', NOW() - INTERVAL '2 days', NOW() - INTERVAL '18 days'),
  ('eva@demo.com','Water Sanitation Drive', NOW() - INTERVAL '5 days', NOW() - INTERVAL '90 days'),
  ('farah@demo.com','Road Safety Awareness', NOW() - INTERVAL '1 day', NOW() - INTERVAL '6 days'),
  ('gina@demo.com','Mental Health Outreach', NOW() - INTERVAL '1 day', NOW() - INTERVAL '10 days'),
  ('harry@demo.com','Local Arts Uplift', NOW() - INTERVAL '2 days', NOW() - INTERVAL '9 days')
ON CONFLICT DO NOTHING;

INSERT INTO ProjectCanvas (project_ID, diagram_json, updated_at)
SELECT p.project_ID,
       jsonb_build_object('nodes', jsonb_build_array(jsonb_build_object('id','root','label',p.title)), 'edges','[]'::jsonb),
       NOW()
FROM Project p
LEFT JOIN ProjectCanvas c ON c.project_ID = p.project_ID
WHERE c.project_ID IS NULL;

-- ExportFile with ENUM array fix
WITH pr AS (SELECT project_ID, email_address FROM Project)
INSERT INTO ExportFile
  (project_ID, email_address, format, download_url, filename, status, created_at, updated_at, expires_at)
SELECT
  project_ID,
  email_address,
  (ARRAY['PDF','PNG','SVG','DOCX'])[1 + (project_ID % 4)],
  CASE WHEN (project_ID % 3)=0 THEN NULL ELSE 'https://example.com/exports/'||project_ID||'.file' END,
  'export-'||project_ID||'.out',
  (ARRAY[
      'queued'::export_status_enum,
      'processing'::export_status_enum,
      'ready'::export_status_enum,
      'failed'::export_status_enum
   ])[1 + (project_ID % 4)],
  NOW() - (project_ID % 5) * INTERVAL '1 day',
  NOW() - (project_ID % 3) * INTERVAL '12 hours',
  CASE WHEN (project_ID % 4)=2 THEN NOW() + INTERVAL '10 days' ELSE NULL END
FROM pr
ON CONFLICT DO NOTHING;

-- PAYMENT POPULATION
WITH inv AS (
  SELECT i.invoice_ID, i.email_address, i.subscription_ID, i.status
  FROM Invoice i
  WHERE i.email_address IN ('carol@demo.com','dave@demo.com','eva@demo.com','farah@demo.com','gina@demo.com','harry@demo.com')
)
INSERT INTO Payment
 (subscription_ID, invoice_ID, amount_cents, currency,
  provider_intent_ID, provider_method_ID, paid_at, status)
VALUES
  ((SELECT subscription_ID FROM inv WHERE email_address='carol@demo.com' LIMIT 1),
   (SELECT invoice_ID FROM inv WHERE email_address='carol@demo.com' LIMIT 1),
   1990, 'AUD', 'pi_carol_002', 'card_x_4242', NOW() - INTERVAL '2 days', 'succeeded'),
  ((SELECT subscription_ID FROM inv WHERE email_address='dave@demo.com' LIMIT 1),
   (SELECT invoice_ID FROM inv WHERE email_address='dave@demo.com' LIMIT 1),
   1990, 'AUD', 'pi_dave_001', 'card_x_0002', NULL, 'requires_payment_method'),
  ((SELECT subscription_ID FROM inv WHERE email_address='eva@demo.com' LIMIT 1),
   (SELECT invoice_ID FROM inv WHERE email_address='eva@demo.com' LIMIT 1),
   990, 'AUD', 'pi_eva_001', 'card_x_0000', NULL, 'failed'),
  ((SELECT subscription_ID FROM inv WHERE email_address='farah@demo.com' LIMIT 1),
   (SELECT invoice_ID FROM inv WHERE email_address='farah@demo.com' LIMIT 1),
   0, 'AUD', 'pi_farah_auth', 'card_x_1111', NOW() - INTERVAL '1 day', 'succeeded'),
  ((SELECT subscription_ID FROM inv WHERE email_address='gina@demo.com' LIMIT 1),
   (SELECT invoice_ID FROM inv WHERE email_address='gina@demo.com' LIMIT 1),
   1990, 'AUD', 'pi_gina_002', 'card_x_0005', NULL, 'failed'),
  ((SELECT subscription_ID FROM inv WHERE email_address='harry@demo.com' LIMIT 1),
   (SELECT invoice_ID FROM inv WHERE email_address='harry@demo.com' LIMIT 1),
   990, 'AUD', 'pi_harry_001', 'card_x_4242', NOW() - INTERVAL '1 day', 'succeeded')
ON CONFLICT DO NOTHING;

COMMIT;


