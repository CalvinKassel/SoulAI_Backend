-- database/postgresql/schema.sql - PostgreSQL Database Schema
-- Save in: backend/database/postgresql/schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 18 AND age <= 100),
    gender VARCHAR(50) NOT NULL CHECK (gender IN ('male', 'female', 'non-binary', 'other')),
    sexual_orientation VARCHAR(50) NOT NULL CHECK (sexual_orientation IN ('straight', 'gay', 'lesbian', 'bisexual', 'pansexual', 'asexual', 'other')),
    
    -- Profile data
    about_me TEXT,
    occupation VARCHAR(255),
    education VARCHAR(255),
    height INTEGER, -- cm
    religion VARCHAR(100),
    political_views VARCHAR(100),
    personality_type VARCHAR(50),
    interests TEXT[], -- Array of interests
    hobbies TEXT[],
    languages TEXT[],
    
    -- Location (PostGIS geometry)
    location GEOMETRY(POINT, 4326),
    city VARCHAR(255),
    state VARCHAR(255),
    country VARCHAR(255),
    
    -- Preferences as JSONB
    preferences JSONB DEFAULT '{
        "ageRange": {"min": 18, "max": 50},
        "maxDistance": 50,
        "genderPreference": [],
        "dealBreakers": [],
        "mustHaves": []
    }',
    
    -- SoulAI data as JSONB
    soul_ai_profile JSONB DEFAULT '{
        "personalityInsights": {},
        "conversationHistory": [],
        "profileCompleteness": 0,
        "readyForMatching": false
    }',
    
    -- Activity tracking
    is_online BOOLEAN DEFAULT FALSE,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_verified BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deactivated')),
    
    -- Privacy settings as JSONB
    privacy_settings JSONB DEFAULT '{
        "showAge": true,
        "showLocation": true,
        "showOnlineStatus": true,
        "allowMessages": "everyone"
    }',
    
    -- Notification settings as JSONB
    notification_settings JSONB DEFAULT '{
        "newMatches": true,
        "newMessages": true,
        "profileViews": true,
        "soulAIUpdates": true
    }',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User photos table
CREATE TABLE user_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    photo_order INTEGER DEFAULT 0,
    is_profile_picture BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Push tokens table
CREATE TABLE push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    platform VARCHAR(20) CHECK (platform IN ('ios', 'android', 'web')),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, token)
);

-- Matches table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'expired', 'unmatched')),
    
    -- Match metadata
    compatibility_score INTEGER CHECK (compatibility_score >= 0 AND compatibility_score <= 100),
    compatibility_factors JSONB DEFAULT '{}',
    soul_ai_analysis JSONB DEFAULT '{}',
    
    -- Timing
    matched_at TIMESTAMP WITH TIME ZONE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    message_count INTEGER DEFAULT 0,
    is_conversation_active BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique match pairs
    CONSTRAINT unique_match_pair UNIQUE (user1_id, user2_id),
    CONSTRAINT different_users CHECK (user1_id != user2_id)
);

-- Likes table (for tracking individual likes before matches)
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    liked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_super_like BOOLEAN DEFAULT FALSE
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Message content
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'gif', 'sticker', 'voice', 'video')),
    
    -- Message status
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- SoulAI coaching data
    soul_ai_coaching JSONB DEFAULT '{}',
    
    -- Message flags
    is_deleted BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP WITH TIME ZONE,
    report_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message attachments table
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    attachment_type VARCHAR(50),
    file_name VARCHAR(255),
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics and reporting tables
CREATE TABLE user_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE match_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    analytics_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX idx_users_location ON users USING GIST (location);
CREATE INDEX idx_users_age ON users (age);
CREATE INDEX idx_users_online_status ON users (is_online, last_active);
CREATE INDEX idx_users_ready_matching ON users ((soul_ai_profile->>'readyForMatching')) WHERE (soul_ai_profile->>'readyForMatching')::boolean = true;

CREATE INDEX idx_matches_users ON matches (user1_id, user2_id);
CREATE INDEX idx_matches_status ON matches (status, created_at);
CREATE INDEX idx_matches_compatibility ON matches (compatibility_score DESC);
CREATE INDEX idx_matches_expires ON matches (expires_at);

CREATE INDEX idx_messages_match ON messages (match_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages (sender_id, created_at DESC);
CREATE INDEX idx_messages_status ON messages (status);

CREATE INDEX idx_likes_match_user ON likes (match_id, user_id);
CREATE INDEX idx_user_photos_user ON user_photos (user_id, photo_order);
CREATE INDEX idx_push_tokens_user ON push_tokens (user_id);

-- Functions for common operations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to find potential matches within distance
CREATE OR REPLACE FUNCTION find_potential_matches(
    user_uuid UUID,
    max_distance_km INTEGER DEFAULT 50,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    potential_match_id UUID,
    distance_km FLOAT,
    compatibility_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as potential_match_id,
        ST_Distance(
            ST_Transform(u1.location, 3857),
            ST_Transform(u.location, 3857)
        ) / 1000 as distance_km,
        -- Placeholder compatibility score calculation
        CASE 
            WHEN array_length(u.interests, 1) > 0 AND array_length(u1.interests, 1) > 0
            THEN (
                SELECT COUNT(*) * 10 
                FROM unnest(u.interests) AS interest 
                WHERE interest = ANY(u1.interests)
            )
            ELSE 50
        END as compatibility_score
    FROM users u1
    CROSS JOIN users u
    WHERE u1.id = user_uuid
        AND u.id != user_uuid
        AND u.account_status = 'active'
        AND ST_DWithin(
            ST_Transform(u1.location, 3857),
            ST_Transform(u.location, 3857),
            max_distance_km * 1000
        )
        -- Age preference filtering
        AND u.age BETWEEN 
            (u1.preferences->>'ageRange'->>'min')::integer AND 
            (u1.preferences->>'ageRange'->>'max')::integer
        AND u1.age BETWEEN 
            (u.preferences->>'ageRange'->>'min')::integer AND 
            (u.preferences->>'ageRange'->>'max')::integer
        -- Gender preference filtering
        AND (
            u1.preferences->'genderPreference' IS NULL OR
            u.gender = ANY(ARRAY(SELECT jsonb_array_elements_text(u1.preferences->'genderPreference')))
        )
        AND (
            u.preferences->'genderPreference' IS NULL OR
            u1.gender = ANY(ARRAY(SELECT jsonb_array_elements_text(u.preferences->'genderPreference')))
        )
        -- Exclude existing matches
        AND NOT EXISTS (
            SELECT 1 FROM matches m 
            WHERE (m.user1_id = user_uuid AND m.user2_id = u.id)
               OR (m.user2_id = user_uuid AND m.user1_id = u.id)
        )
    ORDER BY distance_km ASC, compatibility_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to create a match
CREATE OR REPLACE FUNCTION create_match(
    liker_id UUID,
    liked_id UUID
)
RETURNS UUID AS $$
DECLARE
    match_id UUID;
    existing_match_id UUID;
BEGIN
    -- Check if match already exists
    SELECT id INTO existing_match_id
    FROM matches 
    WHERE (user1_id = liker_id AND user2_id = liked_id)
       OR (user1_id = liked_id AND user2_id = liker_id);
    
    IF existing_match_id IS NOT NULL THEN
        -- Add like to existing match
        INSERT INTO likes (match_id, user_id)
        VALUES (existing_match_id, liker_id)
        ON CONFLICT DO NOTHING;
        
        -- Check if it's now a mutual match
        IF (SELECT COUNT(*) FROM likes WHERE match_id = existing_match_id) = 2 THEN
            UPDATE matches 
            SET status = 'matched', matched_at = NOW()
            WHERE id = existing_match_id;
        END IF;
        
        RETURN existing_match_id;
    ELSE
        -- Create new match
        INSERT INTO matches (user1_id, user2_id)
        VALUES (liker_id, liked_id)
        RETURNING id INTO match_id;
        
        -- Add the like
        INSERT INTO likes (match_id, user_id)
        VALUES (match_id, liker_id);
        
        RETURN match_id;
    END IF;
END;
$$ LANGUAGE plpgsql;