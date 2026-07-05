-- Muana Mayele Quiz - Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    country_code VARCHAR(10) DEFAULT '+243',
    profession VARCHAR(100),
    neighborhood VARCHAR(100),
    role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);

-- Categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions table
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer INT NOT NULL,
    difficulty VARCHAR(10) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_questions_category ON questions(category_id);
CREATE INDEX idx_questions_active ON questions(is_active);

-- Quiz sessions table
CREATE TABLE quiz_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    time_taken INT DEFAULT 0,
    total_questions INT DEFAULT 20,
    correct_answers INT DEFAULT 0,
    wrong_answers INT DEFAULT 0,
    score INT DEFAULT 0,
    total_points INT DEFAULT 0,
    percentage DECIMAL(5,2) DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_sessions_user ON quiz_sessions(user_id);
CREATE INDEX idx_sessions_completed ON quiz_sessions(is_completed);
CREATE INDEX idx_sessions_score ON quiz_sessions(total_points DESC);

-- Quiz answers table
CREATE TABLE quiz_answers (
    id SERIAL PRIMARY KEY,
    session_id INT NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    selected_answer INT,
    is_correct BOOLEAN DEFAULT FALSE,
    answered_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_answers_session ON quiz_answers(session_id);

-- Quiz settings table (single row)
CREATE TABLE quiz_settings (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    time_limit INT NOT NULL DEFAULT 1200,
    is_open BOOLEAN NOT NULL DEFAULT TRUE,
    schedule_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    schedule_days JSONB DEFAULT NULL,
    schedule_start_time TIME DEFAULT NULL,
    schedule_end_time TIME DEFAULT NULL,
    schedule_timezone VARCHAR(50) NOT NULL DEFAULT 'Africa/Kinshasa',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site content table
CREATE TABLE site_content (
    id SERIAL PRIMARY KEY,
    section VARCHAR(50) NOT NULL,
    content_key VARCHAR(100) NOT NULL,
    content_value TEXT,
    content_type VARCHAR(20) DEFAULT 'text' CHECK (content_type IN ('text', 'textarea', 'image', 'html')),
    label VARCHAR(200) NOT NULL,
    sort_order INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(section, content_key)
);
CREATE INDEX idx_site_content_section ON site_content(section);

-- Leaderboard view
CREATE OR REPLACE VIEW leaderboard AS
SELECT
    u.id as user_id,
    u.full_name,
    u.neighborhood,
    COUNT(qs.id) as total_quizzes,
    COALESCE(MAX(qs.total_points), 0) as best_score,
    COALESCE(SUM(qs.total_points), 0) as total_points,
    COALESCE(AVG(qs.percentage), 0) as avg_percentage,
    MIN(qs.time_taken) as best_time
FROM users u
LEFT JOIN quiz_sessions qs ON u.id = qs.user_id AND qs.is_completed = TRUE
GROUP BY u.id, u.full_name, u.neighborhood
ORDER BY total_points DESC, best_time ASC;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_quiz_settings_updated_at BEFORE UPDATE ON quiz_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_site_content_updated_at BEFORE UPDATE ON site_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert default settings
INSERT INTO quiz_settings (id, time_limit, is_open, schedule_enabled, schedule_timezone)
VALUES (1, 1200, TRUE, FALSE, 'Africa/Kinshasa');

-- Insert default categories
INSERT INTO categories (name, description) VALUES
('Géographie', 'Questions sur la géographie de la RDC'),
('Histoire', 'Questions sur l''histoire de la RDC'),
('Culture', 'Questions sur la culture congolaise'),
('Économie', 'Questions sur l''économie de la RDC'),
('Sport', 'Questions sur le sport congolais'),
('Nature', 'Questions sur la nature et l''environnement'),
('Éducation', 'Questions sur l''éducation en RDC'),
('Politique', 'Questions sur la politique de la RDC');

-- Insert default site content
INSERT INTO site_content (section, content_key, content_value, content_type, label, sort_order) VALUES
('header', 'site_name', 'Muana Mayèlé', 'text', 'Nom du site', 1),
('header', 'logo_icon', '🌿', 'text', 'Icône du logo', 2),
('hero', 'title', 'Participez au Quiz Live', 'text', 'Titre principal', 1),
('hero', 'title_highlight', 'et remportez des points!', 'text', 'Titre accentué', 2),
('hero', 'description', 'Testez vos connaissances et mesurez-vous aux autres Congolais !', 'textarea', 'Description', 3),
('hero', 'image', 'person_hero.png', 'image', 'Image du héros', 4),
('hero', 'cta_text', 'Commencer le Quiz', 'text', 'Texte bouton principal', 5),
('hero', 'register_text', 'S''inscrire', 'text', 'Texte bouton inscription', 6),
('hero', 'closed_message', 'Le quiz est actuellement fermé. Revenez bientôt !', 'textarea', 'Message quiz fermé', 7),
('how_it_works', 'section_title', 'Comment ça marche?', 'text', 'Titre de section', 1),
('how_it_works', 'step_1_title', 'Inscrivez-vous', 'text', 'Étape 1 - Titre', 2),
('how_it_works', 'step_1_description', 'Créez gratuitement un compte participant de façon simple et sécurisée.', 'textarea', 'Étape 1 - Description', 3),
('how_it_works', 'step_2_title', 'Participez au quiz en direct', 'text', 'Étape 2 - Titre', 4),
('how_it_works', 'step_2_description', 'Répondez aux questions dans le temps imparti.', 'textarea', 'Étape 2 - Description', 5),
('how_it_works', 'step_3_title', 'Accumulez des points', 'text', 'Étape 3 - Titre', 6),
('how_it_works', 'step_3_description', 'Gagnez des points en répondant correctement et rapidement!', 'textarea', 'Étape 3 - Description', 7),
('how_it_works', 'step_4_title', 'Gagnez 50 $', 'text', 'Étape 4 - Titre', 8),
('how_it_works', 'step_4_description', 'Le meilleur joueur remporte le prix!', 'textarea', 'Étape 4 - Description', 9),
('quiz_info', 'title', 'Le Quiz en Direct', 'text', 'Titre', 1),
('quiz_info', 'info_1', '20 minutes maximum', 'text', 'Info 1', 2),
('quiz_info', 'info_2', 'Jusqu''à 20 questions', 'text', 'Info 2', 3),
('quiz_info', 'info_3', 'Classement en temps réel', 'text', 'Info 3', 4),
('quiz_info', 'highlight_text', 'Le participant avec le plus de points <strong>gagne 50 $</strong>.', 'html', 'Texte mis en avant', 5),
('quiz_info', 'cta_text', 'Commencer le Quiz', 'text', 'Texte du bouton', 6),
('footer', 'brand_name', 'Muana Mayèlé', 'text', 'Nom de marque', 1),
('footer', 'logo_icon', '🌿', 'text', 'Icône du logo', 2),
('footer', 'tagline', 'Le quiz qui met des étoiles dans vos têtes.', 'textarea', 'Slogan', 3),
('footer', 'facebook_url', '#', 'text', 'Lien Facebook', 4),
('footer', 'twitter_url', '#', 'text', 'Lien Twitter', 5),
('footer', 'instagram_url', '#', 'text', 'Lien Instagram', 6);
