-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players Management
CREATE TABLE IF NOT EXISTS players (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    grade int NOT NULL,
    position text NOT NULL,
    jersey_number text,
    email text,
    phone text,
    emergency_contact text,
    emergency_phone text,
    medical_info text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS player_development (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_id uuid REFERENCES players(id),
    focus_area text NOT NULL,
    description text,
    progress int CHECK (progress >= 0 AND progress <= 100),
    goals jsonb,
    start_date date NOT NULL,
    target_date date NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Tryouts Management
CREATE TABLE IF NOT EXISTS tryout_sessions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    date date NOT NULL,
    time time NOT NULL,
    location text NOT NULL,
    status text CHECK (status IN ('upcoming', 'in_progress', 'completed')) DEFAULT 'upcoming',
    max_participants int,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS tryout_evaluations (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id uuid REFERENCES tryout_sessions(id),
    player_name text NOT NULL,
    grade int NOT NULL,
    skills_rating int CHECK (skills_rating BETWEEN 1 AND 10),
    athleticism_rating int CHECK (athleticism_rating BETWEEN 1 AND 10),
    team_fit_rating int CHECK (team_fit_rating BETWEEN 1 AND 10),
    serving int CHECK (serving BETWEEN 1 AND 10),
    passing int CHECK (passing BETWEEN 1 AND 10),
    setting int CHECK (setting BETWEEN 1 AND 10),
    hitting int CHECK (hitting BETWEEN 1 AND 10),
    blocking int CHECK (blocking BETWEEN 1 AND 10),
    defense int CHECK (defense BETWEEN 1 AND 10),
    notes text,
    evaluator text,
    recommendation text CHECK (recommendation IN ('varsity', 'jv', 'freshman', 'not_selected')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Fundraising Management
CREATE TABLE IF NOT EXISTS campaigns (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    description text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    goal_amount decimal(10,2) NOT NULL,
    current_amount decimal(10,2) DEFAULT 0,
    status text CHECK (status IN ('draft', 'active', 'completed', 'cancelled')) DEFAULT 'draft',
    campaign_type text CHECK (campaign_type IN ('general', 'equipment', 'travel', 'uniforms', 'other')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS donations (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id uuid REFERENCES campaigns(id),
    donor_name text NOT NULL,
    donor_email text,
    amount decimal(10,2) NOT NULL,
    message text,
    anonymous boolean DEFAULT false,
    payment_status text CHECK (payment_status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Parent Engagement
CREATE TABLE IF NOT EXISTS parent_interests (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    parent_name text NOT NULL,
    email text NOT NULL,
    phone text,
    player_name text NOT NULL,
    grade int NOT NULL,
    experience text,
    interests text[],
    preferred_contact_method text CHECK (preferred_contact_method IN ('email', 'phone', 'text')),
    volunteer_interests text[],
    status text CHECK (status IN ('new', 'contacted', 'registered')) DEFAULT 'new',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS parent_volunteers (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    parent_id uuid REFERENCES parent_interests(id),
    event_type text NOT NULL,
    availability text[],
    skills text[],
    notes text,
    status text CHECK (status IN ('available', 'assigned', 'completed')) DEFAULT 'available',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
CREATE INDEX IF NOT EXISTS idx_player_development_player_id ON player_development(player_id);
CREATE INDEX IF NOT EXISTS idx_tryout_sessions_date ON tryout_sessions(date);
CREATE INDEX IF NOT EXISTS idx_tryout_evaluations_session_id ON tryout_evaluations(session_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_donations_campaign_id ON donations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_parent_interests_status ON parent_interests(status);
CREATE INDEX IF NOT EXISTS idx_parent_volunteers_parent_id ON parent_volunteers(parent_id);

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp triggers to all tables
CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_development_updated_at
    BEFORE UPDATE ON player_development
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tryout_sessions_updated_at
    BEFORE UPDATE ON tryout_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tryout_evaluations_updated_at
    BEFORE UPDATE ON tryout_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donations_updated_at
    BEFORE UPDATE ON donations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parent_interests_updated_at
    BEFORE UPDATE ON parent_interests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parent_volunteers_updated_at
    BEFORE UPDATE ON parent_volunteers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments to tables for documentation
COMMENT ON TABLE players IS 'Stores information about volleyball team players';
COMMENT ON TABLE player_development IS 'Tracks player development plans and progress';
COMMENT ON TABLE tryout_sessions IS 'Manages tryout sessions schedule and details';
COMMENT ON TABLE tryout_evaluations IS 'Records player evaluations during tryouts';
COMMENT ON TABLE campaigns IS 'Tracks fundraising campaigns for the volleyball program';
COMMENT ON TABLE donations IS 'Records donations received for fundraising campaigns';
COMMENT ON TABLE parent_interests IS 'Stores parent interest forms and volunteer preferences';
COMMENT ON TABLE parent_volunteers IS 'Manages parent volunteer assignments and availability'; 