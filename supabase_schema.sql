-- 1. Create Schema and set search path
CREATE SCHEMA IF NOT EXISTS mar;
GRANT USAGE ON SCHEMA mar TO anon, authenticated, service_role;

ALTER ROLE authenticated SET search_path TO mar, public;
ALTER ROLE service_role SET search_path TO mar, public;
ALTER ROLE anon SET search_path TO mar, public;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS mar.profiles (
    id TEXT PRIMARY KEY, -- Can be UUID or Phone Number
    full_name TEXT,
    phone_number TEXT UNIQUE,
    occupation TEXT,
    other_occupation TEXT,
    subscription_status TEXT DEFAULT 'pending', -- 'pending', 'active', 'rejected'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Projects Table
CREATE TABLE IF NOT EXISTS mar.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    color TEXT DEFAULT '#000000',
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tasks Table
CREATE TABLE IF NOT EXISTS mar.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id UUID REFERENCES mar.projects ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    comments TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    is_focus BOOLEAN DEFAULT FALSE,
    is_for_today BOOLEAN DEFAULT TRUE,
    reminder_active BOOLEAN DEFAULT FALSE,
    scheduled_time TEXT,
    due_date TIMESTAMPTZ,
    status TEXT DEFAULT 'todo',
    total_time_spent INTEGER DEFAULT 0,
    tags TEXT[],
    subtasks JSONB DEFAULT '[]'::jsonb,
    timer_start TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Payments Table (Admin use)
CREATE TABLE IF NOT EXISTS mar.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount NUMERIC,
    currency TEXT DEFAULT 'PEN',
    status TEXT DEFAULT 'pending', -- 'pending', 'validated', 'rejected'
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. OTPs Table (For N8N + Evolution API integration)
CREATE TABLE IF NOT EXISTS mar.otps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT NOT NULL,
    code TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Landing Settings Table
CREATE TABLE IF NOT EXISTS mar.landing_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    whatsapp TEXT,
    instagram TEXT,
    facebook TEXT,
    yape_qr_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial record for settings
INSERT INTO mar.landing_settings (id, whatsapp, instagram, facebook)
VALUES (1, '51999888777', '#', '#')
ON CONFLICT (id) DO NOTHING;

-- SET UP ROW LEVEL SECURITY (RLS)
ALTER TABLE mar.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for profiles" ON mar.profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE mar.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for projects" ON mar.projects FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE mar.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for tasks" ON mar.tasks FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE mar.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for payments" ON mar.payments FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE mar.otps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for otps" ON mar.otps FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE mar.landing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for landing_settings" ON mar.landing_settings FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON ALL TABLES IN SCHEMA mar TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA mar TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA mar TO anon, authenticated, service_role;

-- FUNCTIONS FOR AUTOMATIC UPDATES
CREATE OR REPLACE FUNCTION mar.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profile_update
    BEFORE UPDATE ON mar.profiles
    FOR EACH ROW
    EXECUTE FUNCTION mar.handle_updated_at();

CREATE TRIGGER on_landing_settings_update
    BEFORE UPDATE ON mar.landing_settings
    FOR EACH ROW
    EXECUTE FUNCTION mar.handle_updated_at();
