-- init.sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE RESTRICT
);

CREATE TABLE sites (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    code_article VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    ean_code VARCHAR(13) UNIQUE
);

CREATE TABLE site_article_stocks (
    site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0 NOT NULL,
    alert_threshold INTEGER DEFAULT 0 NOT NULL,
    PRIMARY KEY (site_id, article_id)
);

CREATE TABLE purchases (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity_bought INTEGER NOT NULL
);

CREATE TABLE serial_numbers (
    id SERIAL PRIMARY KEY,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    site_id INTEGER REFERENCES sites(id) ON DELETE SET NULL,
    purchase_id INTEGER REFERENCES purchases(id) ON DELETE SET NULL
);

-- Insertion de données de test (Fixtures) pour pouvoir travailler
INSERT INTO roles (name) VALUES ('ADMIN'), ('LECTEUR');
INSERT INTO sites (name, description) VALUES ('Magasin Principal', 'Dépôt central'), ('Camionnette A', 'Véhicule intervention 1');
INSERT INTO articles (code_article, label, description) VALUES ('CAB-RJ45-2M', 'Câble RJ45 Cat6 2m', 'Câble réseau standard'), ('PC-DELL-LATI', 'Dell Latitude 5530', 'PC Portable i5 16Go RAM');