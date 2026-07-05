-- Muana Mayele Quiz Database Schema
-- MySQL Database

CREATE DATABASE IF NOT EXISTS muana_mayele CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE muana_mayele;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    country_code VARCHAR(10) DEFAULT '+243',
    profession VARCHAR(100),
    neighborhood VARCHAR(100),
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_email (email)
) ENGINE=InnoDB;

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    question TEXT NOT NULL,
    options JSON NOT NULL,
    correct_answer INT NOT NULL,
    difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_category (category_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- Passcodes table
CREATE TABLE IF NOT EXISTS passcodes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    country_code VARCHAR(10) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    passcode VARCHAR(10) NOT NULL,
    type ENUM('login', 'register') DEFAULT 'login',
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_phone_code (country_code, phone),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB;

-- Quiz sessions table
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    time_taken INT DEFAULT 0,
    total_questions INT DEFAULT 20,
    correct_answers INT DEFAULT 0,
    wrong_answers INT DEFAULT 0,
    score INT DEFAULT 0,
    total_points INT DEFAULT 0,
    percentage DECIMAL(5,2) DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_completed (is_completed),
    INDEX idx_score (total_points DESC)
) ENGINE=InnoDB;

-- Quiz answers table
CREATE TABLE IF NOT EXISTS quiz_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    question_id INT NOT NULL,
    selected_answer INT,
    is_correct BOOLEAN DEFAULT FALSE,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    INDEX idx_session (session_id)
) ENGINE=InnoDB;

-- Leaderboard view (for quick access)
CREATE OR REPLACE VIEW leaderboard AS
SELECT
    u.id as user_id,
    u.full_name,
    u.neighborhood,
    COUNT(qs.id) as total_quizzes,
    MAX(qs.total_points) as best_score,
    SUM(qs.total_points) as total_points,
    AVG(qs.percentage) as avg_percentage,
    MIN(qs.time_taken) as best_time
FROM users u
LEFT JOIN quiz_sessions qs ON u.id = qs.user_id AND qs.is_completed = TRUE
GROUP BY u.id, u.full_name, u.neighborhood
ORDER BY total_points DESC, best_time ASC;

-- Quiz settings table (single row for global config)
CREATE TABLE IF NOT EXISTS quiz_settings (
    id INT PRIMARY KEY DEFAULT 1,
    time_limit INT NOT NULL DEFAULT 1200 COMMENT 'Quiz time limit in seconds',
    is_open BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Whether the quiz is open for players',
    schedule_enabled BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether schedule-based access is active',
    schedule_days JSON DEFAULT NULL COMMENT 'Array of day numbers (0=Sunday..6=Saturday)',
    schedule_start_time TIME DEFAULT NULL COMMENT 'Daily start time for quiz access',
    schedule_end_time TIME DEFAULT NULL COMMENT 'Daily end time for quiz access',
    schedule_timezone VARCHAR(50) NOT NULL DEFAULT 'Africa/Kinshasa' COMMENT 'Timezone for schedule',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT single_row CHECK (id = 1)
) ENGINE=InnoDB;

-- Insert default settings
INSERT INTO quiz_settings (id, time_limit, is_open, schedule_enabled, schedule_days, schedule_start_time, schedule_end_time, schedule_timezone)
VALUES (1, 1200, TRUE, FALSE, NULL, NULL, NULL, 'Africa/Kinshasa');

-- Insert admin user
INSERT INTO users (full_name, phone, country_code, role) VALUES
('Admin', '96716561', '+47', 'admin');

-- Insert default categories
INSERT INTO categories (name, description) VALUES
('Géographie', 'Questions sur la géographie de la RDC'),
('Histoire', 'Questions sur l''histoire de la RDC'),
('Culture', 'Questions sur la culture congolaise'),
('Économie', 'Questions sur l''économie de la RDC'),
('Sport', 'Questions sur le sport congolais'),
('Nature', 'Questions sur la nature et l''environnement'),
('Éducation', 'Questions sur l''éducation en RDC');

-- Insert questions
INSERT INTO questions (category_id, question, options, correct_answer, difficulty) VALUES
-- Géographie
((SELECT id FROM categories WHERE name = 'Géographie'),
 'Quelle est la capitale de la République Démocratique du Congo ?',
 '["Lubumbashi", "Kinshasa", "Kisangani", "Goma"]',
 1, 'easy'),

((SELECT id FROM categories WHERE name = 'Géographie'),
 'Quel est le plus long fleuve de la RDC ?',
 '["Le Nil", "Le Congo", "Le Kasaï", "L''Ubangi"]',
 1, 'easy'),

((SELECT id FROM categories WHERE name = 'Géographie'),
 'Combien de provinces compte la RDC ?',
 '["11", "20", "26", "30"]',
 2, 'medium'),

((SELECT id FROM categories WHERE name = 'Géographie'),
 'Quel lac forme une frontière naturelle entre la RDC et le Rwanda ?',
 '["Lac Tanganyika", "Lac Kivu", "Lac Albert", "Lac Édouard"]',
 1, 'medium'),

((SELECT id FROM categories WHERE name = 'Géographie'),
 'Quelle est la superficie de la RDC ?',
 '["1,2 million km²", "2,3 millions km²", "3,5 millions km²", "4,1 millions km²"]',
 1, 'hard'),

-- Histoire
((SELECT id FROM categories WHERE name = 'Histoire'),
 'En quelle année la RDC a-t-elle obtenu son indépendance ?',
 '["1958", "1960", "1962", "1965"]',
 1, 'easy'),

((SELECT id FROM categories WHERE name = 'Histoire'),
 'Qui était le premier président de la RDC ?',
 '["Mobutu Sese Seko", "Joseph Kasa-Vubu", "Patrice Lumumba", "Laurent-Désiré Kabila"]',
 1, 'medium'),

((SELECT id FROM categories WHERE name = 'Histoire'),
 'En quelle année le Zaïre est-il redevenu la RDC ?',
 '["1990", "1994", "1997", "2000"]',
 2, 'medium'),

((SELECT id FROM categories WHERE name = 'Histoire'),
 'Comment s''appelait la RDC pendant la colonisation belge ?',
 '["Congo Belge", "Congo Français", "Zaïre", "État Indépendant du Congo"]',
 0, 'medium'),

-- Culture
((SELECT id FROM categories WHERE name = 'Culture'),
 'Quelle est la langue officielle de la RDC ?',
 '["Le Lingala", "Le Swahili", "Le Français", "Le Tshiluba"]',
 2, 'easy'),

((SELECT id FROM categories WHERE name = 'Culture'),
 'Quel musicien congolais est surnommé ''Le Grand Kallé'' ?',
 '["Papa Wemba", "Joseph Kabasele", "Franco Luambo", "Tabu Ley Rochereau"]',
 1, 'hard'),

((SELECT id FROM categories WHERE name = 'Culture'),
 'Quel est le plat national congolais à base de feuilles de manioc ?',
 '["Fufu", "Pondu", "Makayabu", "Liboke"]',
 1, 'easy'),

((SELECT id FROM categories WHERE name = 'Culture'),
 'Quelle danse congolaise est devenue populaire mondialement ?',
 '["La Salsa", "La Rumba", "Le Ndombolo", "La Kizomba"]',
 2, 'medium'),

((SELECT id FROM categories WHERE name = 'Culture'),
 'Quel animal figure sur le drapeau de la RDC ?',
 '["Un lion", "Un léopard", "Un éléphant", "Aucun animal"]',
 3, 'medium'),

-- Économie
((SELECT id FROM categories WHERE name = 'Économie'),
 'Quelle est la monnaie officielle de la RDC ?',
 '["Le Dollar", "L''Euro", "Le Franc Congolais", "Le Shilling"]',
 2, 'easy'),

((SELECT id FROM categories WHERE name = 'Économie'),
 'Quelle ville est connue comme la capitale du cuivre ?',
 '["Kinshasa", "Lubumbashi", "Kolwezi", "Likasi"]',
 1, 'medium'),

((SELECT id FROM categories WHERE name = 'Économie'),
 'Quel minerai précieux est abondant en RDC et utilisé dans les téléphones ?',
 '["L''or", "Le diamant", "Le coltan", "Le cuivre"]',
 2, 'medium'),

-- Nature
((SELECT id FROM categories WHERE name = 'Nature'),
 'Quel parc national congolais est célèbre pour ses gorilles de montagne ?',
 '["Parc de la Garamba", "Parc des Virunga", "Parc de Kahuzi-Biega", "Parc de la Salonga"]',
 1, 'medium'),

-- Sport
((SELECT id FROM categories WHERE name = 'Sport'),
 'Quel footballeur congolais a joué pour l''Olympique de Marseille ?',
 '["Yannick Bolasie", "Cédric Bakambu", "Dieumerci Mbokani", "Trésor Mputu"]',
 2, 'hard'),

-- Éducation
((SELECT id FROM categories WHERE name = 'Éducation'),
 'Quelle université est la plus ancienne de la RDC ?',
 '["Université de Kinshasa", "Université de Lubumbashi", "Université Lovanium", "Université de Kisangani"]',
 2, 'hard');

-- Site content management table
CREATE TABLE IF NOT EXISTS site_content (
    id INT AUTO_INCREMENT PRIMARY KEY,
    section VARCHAR(50) NOT NULL,
    content_key VARCHAR(100) NOT NULL,
    content_value TEXT,
    content_type ENUM('text', 'textarea', 'image', 'html') DEFAULT 'text',
    label VARCHAR(200) NOT NULL,
    sort_order INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_section_key (section, content_key),
    INDEX idx_section (section)
) ENGINE=InnoDB;

-- Insert default site content
INSERT INTO site_content (section, content_key, content_value, content_type, label, sort_order) VALUES
-- Header
('header', 'site_name', 'Muana Mayèlé', 'text', 'Nom du site', 1),
('header', 'logo_icon', '🌿', 'text', 'Icône du logo', 2),

-- Hero
('hero', 'title', 'Participez au Quiz Live', 'text', 'Titre principal', 1),
('hero', 'title_highlight', 'et remportez des points!', 'text', 'Titre accentué', 2),
('hero', 'description', 'Testez vos connaissances et mesurez-vous aux autres Congolais !', 'textarea', 'Description', 3),
('hero', 'image', 'person_hero.png', 'image', 'Image du héros', 4),
('hero', 'cta_text', 'Commencer le Quiz', 'text', 'Texte bouton principal', 5),
('hero', 'register_text', 'S''inscrire', 'text', 'Texte bouton inscription', 6),
('hero', 'closed_message', 'Le quiz est actuellement fermé. Revenez bientôt !', 'textarea', 'Message quiz fermé', 7),

-- How it works
('how_it_works', 'section_title', 'Comment ça marche?', 'text', 'Titre de section', 1),
('how_it_works', 'step_1_title', 'Inscrivez-vous', 'text', 'Étape 1 - Titre', 2),
('how_it_works', 'step_1_description', 'Créez gratuitement un compte participant de façon simple et sécurisée, en maintenant.', 'textarea', 'Étape 1 - Description', 3),
('how_it_works', 'step_2_title', 'Participez au quiz en direct', 'text', 'Étape 2 - Titre', 4),
('how_it_works', 'step_2_description', 'Répondez aux questions tous le temps imparti.', 'textarea', 'Étape 2 - Description', 5),
('how_it_works', 'step_3_title', 'Accumulez des points', 'text', 'Étape 3 - Titre', 6),
('how_it_works', 'step_3_description', 'Gagnez des points en répondant maximal correctement et rapidement!', 'textarea', 'Étape 3 - Description', 7),
('how_it_works', 'step_4_title', 'Gagnez 50 $', 'text', 'Étape 4 - Titre', 8),
('how_it_works', 'step_4_description', 'En sortie vaincu contre toute les chances, payer de 500 $.', 'textarea', 'Étape 4 - Description', 9),

-- Quiz Info
('quiz_info', 'title', 'Le Quiz en Direct', 'text', 'Titre', 1),
('quiz_info', 'info_1', '20 minutes maximum', 'text', 'Info 1', 2),
('quiz_info', 'info_2', 'Jusqu''à 20 questions', 'text', 'Info 2', 3),
('quiz_info', 'info_3', 'Classement en temps réel', 'text', 'Info 3', 4),
('quiz_info', 'highlight_text', 'Le participant avec le plus de points <strong>gagne 50 $</strong>.', 'html', 'Texte mis en avant', 5),
('quiz_info', 'cta_text', 'Commencer le Quiz', 'text', 'Texte du bouton', 6),

-- Footer
('footer', 'brand_name', 'Muama Mayèlé', 'text', 'Nom de marque', 1),
('footer', 'logo_icon', '🌿', 'text', 'Icône du logo', 2),
('footer', 'tagline', 'Le quiz qui met des étoiles dans vos têtes.', 'textarea', 'Slogan', 3),
('footer', 'facebook_url', '#', 'text', 'Lien Facebook', 4),
('footer', 'twitter_url', '#', 'text', 'Lien Twitter', 5),
('footer', 'instagram_url', '#', 'text', 'Lien Instagram', 6);
