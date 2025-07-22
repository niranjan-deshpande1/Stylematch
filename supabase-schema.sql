-- StyleMatch Supabase Schema
-- Run this in the Supabase SQL Editor to create all required tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inspiration images table
CREATE TABLE IF NOT EXISTS inspiration_images (
  id SERIAL PRIMARY KEY,
  image_url VARCHAR(500) NOT NULL,
  style_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clothing items table
CREATE TABLE IF NOT EXISTS clothing_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  color VARCHAR(100),
  brand VARCHAR(255),
  image_url VARCHAR(500),
  style_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email signups table
CREATE TABLE IF NOT EXISTS email_signups (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User swipes table
CREATE TABLE IF NOT EXISTS user_swipes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  inspiration_image_id INTEGER REFERENCES inspiration_images(id) ON DELETE CASCADE,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('left', 'right')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, inspiration_image_id)
);

-- User style profiles table
CREATE TABLE IF NOT EXISTS user_style_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  style_summary TEXT,
  preferred_styles TEXT[] DEFAULT '{}',
  color_preferences TEXT[] DEFAULT '{}',
  fit_preferences TEXT[] DEFAULT '{}',
  lifestyle_tags TEXT[] DEFAULT '{}',
  gender_preference VARCHAR(20),
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  total_swipes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clothing_items_user_id ON clothing_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_swipes_user_id ON user_swipes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_swipes_inspiration_image_id ON user_swipes(inspiration_image_id);
CREATE INDEX IF NOT EXISTS idx_user_style_profiles_user_id ON user_style_profiles(user_id);

-- Enable Row Level Security (RLS) for data privacy
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clothing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_style_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can view own data" ON users FOR ALL USING (auth.uid()::text = id::text);
CREATE POLICY "Users can manage own clothing" ON clothing_items FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can manage own swipes" ON user_swipes FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can manage own profile" ON user_style_profiles FOR ALL USING (auth.uid()::text = user_id::text);

-- Allow public read access to inspiration images
CREATE POLICY "Anyone can view inspiration images" ON inspiration_images FOR SELECT USING (true);