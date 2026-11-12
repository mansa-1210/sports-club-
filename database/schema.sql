CREATE TABLE IF NOT EXISTS public.club_profiles (
  user_id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'coach')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sports (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  name varchar(100) NOT NULL,
  slug varchar(100) NOT NULL UNIQUE,
  summary varchar(255) NOT NULL,
  description text NOT NULL,
  image_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.membership_plans (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  name varchar(100) NOT NULL,
  slug varchar(100) NOT NULL UNIQUE,
  description text NOT NULL,
  price_minor integer NOT NULL CHECK (price_minor >= 0),
  currency varchar(3) NOT NULL DEFAULT 'INR',
  duration_days integer NOT NULL CHECK (duration_days > 0),
  features jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(features) = 'array'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_enquiries (
  id serial PRIMARY KEY,
  user_id text,
  full_name varchar(120) NOT NULL CHECK (char_length(trim(full_name)) BETWEEN 2 AND 120),
  email varchar(254) NOT NULL,
  phone varchar(40),
  subject varchar(160),
  message text NOT NULL CHECK (char_length(trim(message)) BETWEEN 10 AND 5000),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_activity (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  action varchar(80) NOT NULL,
  entity_type varchar(80),
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coaches (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  full_name varchar(120) NOT NULL,
  title varchar(120) NOT NULL,
  bio text NOT NULL DEFAULT '',
  email varchar(254),
  phone varchar(40),
  image_url text NOT NULL DEFAULT '',
  sport_id integer REFERENCES public.sports(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  sport_id integer REFERENCES public.sports(id) ON DELETE SET NULL,
  title varchar(160) NOT NULL,
  description text NOT NULL DEFAULT '',
  location varchar(200) NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  registration_deadline timestamptz,
  capacity integer NOT NULL CHECK (capacity > 0),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.memberships (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  plan_id integer NOT NULL REFERENCES public.membership_plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'active', 'cancelled', 'expired')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'offline_verified')),
  payment_reference varchar(160),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.programs (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  sport_id integer NOT NULL REFERENCES public.sports(id) ON DELETE RESTRICT,
  coach_id integer REFERENCES public.coaches(id) ON DELETE SET NULL,
  title varchar(140) NOT NULL,
  description text NOT NULL DEFAULT '',
  skill_level text NOT NULL DEFAULT 'all_levels' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'all_levels')),
  price_minor integer NOT NULL DEFAULT 0 CHECK (price_minor >= 0),
  currency varchar(3) NOT NULL DEFAULT 'INR',
  capacity integer NOT NULL CHECK (capacity > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'full', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.program_sessions (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  program_id integer NOT NULL REFERENCES public.programs(id) ON DELETE RESTRICT,
  coach_id integer REFERENCES public.coaches(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  location varchar(200) NOT NULL,
  capacity integer NOT NULL CHECK (capacity > 0),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.program_registrations (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  session_id integer NOT NULL REFERENCES public.program_sessions(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'waitlisted', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_id)
);

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  event_id integer NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'waitlisted', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS club_profiles_role_idx ON public.club_profiles (role, created_at DESC);
CREATE INDEX IF NOT EXISTS sports_active_order_idx ON public.sports (is_active, sort_order, name);
CREATE INDEX IF NOT EXISTS coaches_active_name_idx ON public.coaches (is_active, full_name);
CREATE INDEX IF NOT EXISTS membership_plans_active_name_idx ON public.membership_plans (is_active, name);
CREATE INDEX IF NOT EXISTS programs_sport_status_idx ON public.programs (sport_id, status, title);
CREATE INDEX IF NOT EXISTS program_sessions_program_start_idx ON public.program_sessions (program_id, starts_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS memberships_user_status_idx ON public.memberships (user_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS memberships_one_open_per_user_idx ON public.memberships (user_id) WHERE status IN ('pending_payment', 'active');
CREATE INDEX IF NOT EXISTS events_schedule_status_idx ON public.events (starts_at, status);
CREATE INDEX IF NOT EXISTS program_registrations_session_status_idx ON public.program_registrations (session_id, status);
CREATE INDEX IF NOT EXISTS event_registrations_event_status_idx ON public.event_registrations (event_id, status);
CREATE INDEX IF NOT EXISTS contact_enquiries_status_created_idx ON public.contact_enquiries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS contact_enquiries_email_created_idx ON public.contact_enquiries (email, created_at DESC);
CREATE INDEX IF NOT EXISTS user_activity_user_created_idx ON public.user_activity (user_id, created_at DESC);
