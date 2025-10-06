--Table creation
--can you see this 
-- Extensions
create extension if not exists pgcrypto;

-- Enums
do $$ begin create type billing_interval_enum as enum ('month','year'); exception when duplicate_object then null; end $$;
do $$ begin create type subscription_status_enum as enum ('trialing','active','past_due','canceled','incomplete'); exception when duplicate_object then null; end $$;
do $$ begin create type invoice_status_enum as enum ('draft','open','paid','void','uncollectible'); exception when duplicate_object then null; end $$;
do $$ begin create type export_status_enum as enum ('queued','processing','ready','failed'); exception when duplicate_object then null; end $$;

ALTER TABLE "User" ADD CONSTRAINT chk_username_not_blank CHECK (username IS NULL OR length(btrim(username)) > 0);

-- User (email_address is the natural unique identifier)
create table if not exists "User" (
  user_ID        serial primary key,
  email_address  varchar(255) not null unique check (position('@' in email_address) > 1),
  username       varchar(100),
  password_hash  varchar(255) not null check (length(password_hash) >= 20),
  created_at     timestamp not null default current_timestamp
);

-- UserProfile (PK/FK → User.email_address)
create table if not exists UserProfile (
  email_address  varchar(255) primary key references "User"(email_address) on delete cascade,
  first_name     varchar(100),
  last_name      varchar(100),
  avatar_url     text,
  organisation   varchar(255),
  updated_at     timestamp not null default current_timestamp
);

-- UserAuthProvider
create table if not exists UserAuthProvider (
  auth_ID           serial primary key,
  email_address     varchar(255) not null references "User"(email_address) on delete cascade,
  provider          varchar(100) not null,
  provider_user_id  varchar(255) not null,
  email_verified    boolean not null default false,
  linked_at         timestamp,
  constraint uq_auth_provider unique (provider, provider_user_id)
);

ALTER TABLE UserAuthProvider
  ADD CONSTRAINT uq_auth_email_provider UNIQUE (email_address, provider);


-- UserTermsAcceptance
create table if not exists UserTermsAcceptance (
  email_address varchar(255) primary key references "User"(email_address) on delete cascade,
  accepted_at   timestamp not null default current_timestamp
);

-- PasswordReset
create table if not exists PasswordReset (
  reset_ID      serial primary key,
  email_address varchar(255) not null references "User"(email_address) on delete cascade,
  token_hash    varchar(255) not null unique check (length(token_hash) >= 32),
  expires_at    timestamp not null,
  created_at    timestamp not null default current_timestamp
);

-- Plan
create table if not exists Plan (
  plan_ID          serial primary key,
  name             varchar(100) not null unique,
  price_cents      int not null check (price_cents >= 0),
  billing_interval billing_interval_enum not null
);

-- Subscription
create table if not exists Subscription (
  subscription_ID serial primary key,
  email_address   varchar(255) not null references "User"(email_address) on delete cascade,
  plan_ID         int not null references Plan(plan_ID),
  status          subscription_status_enum not null,
  start_date      timestamp not null default current_timestamp,
  renewal_date    timestamp,
  updated_at      timestamp not null default current_timestamp,
  expires_at      timestamp,
  auto_renew      boolean not null default true,
  check (renewal_date is null or renewal_date >= start_date),
  check (expires_at  is null or expires_at  >= start_date)
);

-- Invoice
create table if not exists Invoice (
  invoice_ID      serial primary key,
  subscription_ID int not null references Subscription(subscription_ID) on delete cascade,
  email_address   varchar(255) not null references "User"(email_address) on delete cascade,
  amount_cents    int not null check (amount_cents >= 0),
  currency        varchar(10) not null check (currency ~ '^[A-Z]{3}$'),
  period_start    timestamp,
  period_end      timestamp,
  issued_at       timestamp not null default current_timestamp,
  due_at          timestamp,
  status          invoice_status_enum not null,
  pdf_url         text,
  is_public       boolean not null default false,
  check (period_end is null or period_start is null or period_end >= period_start),
  check (due_at is null or due_at >= issued_at)
);

-- Project
create table if not exists Project (
  project_ID    serial primary key,
  email_address varchar(255) not null references "User"(email_address) on delete cascade,
  title         varchar(255) not null check (length(btrim(title)) > 0),
  updated_at    timestamp not null default current_timestamp,
  created_at    timestamp not null default current_timestamp
);

-- ProjectCanvas (1:1 with Project)
create table if not exists ProjectCanvas (
  project_ID   int primary key references Project(project_ID) on delete cascade,
  diagram_json jsonb,
  updated_at   timestamp not null default current_timestamp
);

-- ExportFile
create table if not exists ExportFile (
  file_ID       serial primary key,
  project_ID    int not null references Project(project_ID) on delete cascade,
  email_address varchar(255) not null references "User"(email_address) on delete cascade,
  format        varchar(50) not null check (format in ('PDF','PNG','SVG','DOCX')),
  download_url  text,
  filename      varchar(255),
  status        export_status_enum not null default 'queued',
  created_at    timestamp not null default current_timestamp,
  updated_at    timestamp not null default current_timestamp,
  expires_at    timestamp
);

-- Payment
create table if not exists Payment (
  payment_ID         serial primary key,
  subscription_ID    int not null references Subscription(subscription_ID) on delete cascade,
  invoice_ID         int null references Invoice(invoice_ID) on delete set null,
  amount_cents       int not null check (amount_cents >= 0),
  currency           varchar(10) not null check (currency ~ '^[A-Z]{3}$'),
  provider_intent_ID varchar(255),
  provider_method_ID varchar(255),
  paid_at            timestamp,
  status             varchar(50)
);

-- Indexes
drop index if exists ux_sub_one_active;
create unique index ux_sub_one_active on Subscription(email_address)
  where status in ('trialing','active','past_due');

create index if not exists ix_invoice_email_status on Invoice(email_address, status);
create index if not exists ix_project_email        on Project(email_address);
create index if not exists ix_export_project       on ExportFile(project_ID);
create index if not exists ix_export_status        on ExportFile(status);
create index if not exists ix_authprovider_email   on UserAuthProvider(email_address);
create index if not exists ix_subscription_email   on Subscription(email_address);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_email_lower ON "User"(lower(email_address));

-- updated_at helper
create or replace function set_updated_at() returns trigger as $$
begin
  if new is distinct from old then
    new.updated_at := current_timestamp;
  end if;
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_userprofile_updated  on UserProfile;
drop trigger if exists trg_subscription_updated on Subscription;
drop trigger if exists trg_project_updated      on Project;
drop trigger if exists trg_canvas_updated       on ProjectCanvas;
drop trigger if exists trg_export_updated       on ExportFile;

create trigger trg_userprofile_updated  before update on UserProfile   for each row execute procedure set_updated_at();
create trigger trg_subscription_updated before update on Subscription  for each row execute procedure set_updated_at();
create trigger trg_project_updated      before update on Project       for each row execute procedure set_updated_at();
create trigger trg_canvas_updated       before update on ProjectCanvas for each row execute procedure set_updated_at();
create trigger trg_export_updated       before update on ExportFile    for each row execute procedure set_updated_at();


-- ensuring timezones are more timezone-aware
ALTER TABLE "User"          ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE UserProfile     ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
ALTER TABLE Subscription    ALTER COLUMN start_date TYPE timestamptz USING start_date AT TIME ZONE 'UTC';
ALTER TABLE Subscription    ALTER COLUMN renewal_date TYPE timestamptz USING renewal_date AT TIME ZONE 'UTC';
ALTER TABLE Subscription    ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
ALTER TABLE Subscription    ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';
ALTER TABLE Invoice         ALTER COLUMN period_start TYPE timestamptz USING period_start AT TIME ZONE 'UTC';
ALTER TABLE Invoice         ALTER COLUMN period_end   TYPE timestamptz USING period_end   AT TIME ZONE 'UTC';
ALTER TABLE Invoice         ALTER COLUMN issued_at    TYPE timestamptz USING issued_at AT TIME ZONE 'UTC';
ALTER TABLE Invoice         ALTER COLUMN due_at       TYPE timestamptz USING due_at AT TIME ZONE 'UTC';
ALTER TABLE Project         ALTER COLUMN updated_at   TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
ALTER TABLE Project         ALTER COLUMN created_at   TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE ProjectCanvas   ALTER COLUMN updated_at   TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
ALTER TABLE ExportFile      ALTER COLUMN created_at   TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE ExportFile      ALTER COLUMN updated_at   TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
ALTER TABLE ExportFile      ALTER COLUMN expires_at   TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';
ALTER TABLE Payment         ALTER COLUMN paid_at      TYPE timestamptz USING paid_at AT TIME ZONE 'UTC';
