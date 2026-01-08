-- Drop tables if they exist (clean slate)
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS seller_profiles CASCADE;
DROP TABLE IF EXISTS buyer_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS lookup_genres CASCADE;
DROP TABLE IF EXISTS lookup_languages CASCADE;
DROP TABLE IF EXISTS lookup_cities CASCADE;
DROP TABLE IF EXISTS lookup_conditions CASCADE;

-- Lookup Tables
CREATE TABLE lookup_genres(
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE lookup_languages(
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE lookup_cities(
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE lookup_conditions(
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE 
);

-- Users Table
-- role: 'admin', 'seller', 'buyer'
-- status: 'active', 'inactive', 'blocked', 'archived'
CREATE TABLE users(
    id SERIAL PRIMARY KEY,
    role VARCHAR(20) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    blocked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seller Profiles
CREATE TABLE seller_profiles(
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    description TEXT,
    city_id INTEGER REFERENCES lookup_cities(id),
    profile_image VARCHAR(255),
    average_rating DECIMAL(3, 2) DEFAULT 0
);

-- Buyer Profiles
CREATE TABLE buyer_profiles(
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    interests_json JSONB -- Stores array of genre_ids, language_ids
);

-- Books Table
-- status: 'active', 'reserved', 'sold', 'archived'
CREATE TABLE books(
    id SERIAL PRIMARY KEY,
    seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    publisher VARCHAR(255),
    year_published INTEGER,
    genre_id INTEGER REFERENCES lookup_genres(id),
    language_id INTEGER REFERENCES lookup_languages(id),
    condition_id INTEGER REFERENCES lookup_conditions(id),
    description TEXT,
    price DECIMAL(10, 2) DEFAULT 0,
    is_exchange_possible BOOLEAN DEFAULT FALSE,
    location_id INTEGER REFERENCES lookup_cities(id),
    image_url VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
-- status: 'pending', 'accepted', 'rejected', 'completed'
CREATE TABLE orders(
    id SERIAL PRIMARY KEY,
    buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'buy', 'exchange'
    status VARCHAR(20) DEFAULT 'pending', 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    offered_exchange_books_json JSONB -- IDs of books offered by buyer for exchange
);

-- Order Items (in case of multiple books per order)
CREATE TABLE order_items(
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE
);

-- Messages / Chat
CREATE TABLE messages(
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews
CREATE TABLE reviews(
    id SERIAL PRIMARY KEY,
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data (Initial Lookups and Admin)
INSERT INTO lookup_genres (name) VALUES 
('Sci-Fi'), ('Drama'), ('Stručna literatura'), ('Romani'), ('Stripovi'), ('Udžbenici'), ('Dječije knjige');

INSERT INTO lookup_languages (name) VALUES 
('Bosanski'), ('Engleski'), ('Njemački');

INSERT INTO lookup_cities (name) VALUES 
('Sarajevo'), ('Mostar'), ('Tuzla'), ('Zenica'), ('Banja Luka');

INSERT INTO lookup_conditions (name) VALUES 
('Nova'), ('Kao nova'), ('Dobra'), ('Oštećena');

-- Admin user (Password: admin123 -> Hashed manually or via script later, for now we insert a placeholder or script does it)
-- We will handle admin creation via the node seed script to hash password correctly.
