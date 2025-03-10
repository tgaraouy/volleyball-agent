-- Create interest forms table
CREATE TABLE interest_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_name TEXT NOT NULL,
    grade INTEGER NOT NULL,
    school_name TEXT,
    previous_experience TEXT,
    preferred_position TEXT,
    parent_name TEXT NOT NULL,
    parent_email TEXT NOT NULL,
    parent_phone TEXT,
    questions TEXT,
    club_experience TEXT,
    submission_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'contacted', 'registered', 'withdrawn')),
    school_level TEXT NOT NULL CHECK (school_level IN ('middle', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create newsletter subscriptions table
CREATE TABLE newsletter_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    student_grade INTEGER,
    preferences JSONB,
    subscription_type TEXT NOT NULL CHECK (subscription_type IN ('direct', 'interest_form')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tryout evaluation criteria table
CREATE TABLE tryout_evaluation_criteria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_level TEXT NOT NULL CHECK (school_level IN ('middle', 'high')),
    year INTEGER NOT NULL,
    categories JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(school_level, year, status)
);

-- Create tryout evaluations table
CREATE TABLE tryout_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id),
    evaluator_id UUID NOT NULL REFERENCES users(id),
    scores JSONB NOT NULL,
    notes TEXT,
    recommended_team TEXT,
    evaluation_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_interest_forms_status ON interest_forms(status);
CREATE INDEX idx_interest_forms_school_level ON interest_forms(school_level);
CREATE INDEX idx_newsletter_subscriptions_email ON newsletter_subscriptions(email);
CREATE INDEX idx_newsletter_subscriptions_status ON newsletter_subscriptions(status);
CREATE INDEX idx_tryout_evaluations_player ON tryout_evaluations(player_id);
CREATE INDEX idx_tryout_evaluations_date ON tryout_evaluations(evaluation_date);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_interest_forms_updated_at
    BEFORE UPDATE ON interest_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_newsletter_subscriptions_updated_at
    BEFORE UPDATE ON newsletter_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tryout_evaluation_criteria_updated_at
    BEFORE UPDATE ON tryout_evaluation_criteria
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tryout_evaluations_updated_at
    BEFORE UPDATE ON tryout_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 