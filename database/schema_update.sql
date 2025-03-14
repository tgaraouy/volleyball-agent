-- Drills Management
CREATE TABLE IF NOT EXISTS drills (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    description text,
    focus_area text[] NOT NULL,
    difficulty_level text CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    duration_minutes int,
    equipment_needed text[],
    instructions jsonb,
    video_url text,
    created_by uuid REFERENCES coaches(id),
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Newsletter Management
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    email text UNIQUE NOT NULL,
    first_name text,
    last_name text,
    subscription_type text[] DEFAULT ARRAY['general'],
    status text CHECK (status IN ('active', 'unsubscribed', 'bounced')) DEFAULT 'active',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_drills_focus_area ON drills USING gin (focus_area);
CREATE INDEX IF NOT EXISTS idx_drills_difficulty ON drills(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscriptions(status);

-- Add triggers for updated_at
CREATE TRIGGER update_drills_updated_at
    BEFORE UPDATE ON drills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_newsletter_subscriptions_updated_at
    BEFORE UPDATE ON newsletter_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE drills IS 'Stores volleyball practice drills and exercises';
COMMENT ON TABLE newsletter_subscriptions IS 'Manages newsletter subscriptions and preferences'; 