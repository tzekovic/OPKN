const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function run() {
    try {
        const sqlPath = path.join(__dirname, '..', 'database', 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running SQL init script...');
        await pool.query(sql);
        console.log('Tables created.');

        // Seed Admin User
        const passwordHash = await bcrypt.hash('admin123', 10);
        const adminEmail = 'admin@example.com';
        
        // Check if admin exists (not really needed with drop tables but good practice)
        // Since we drop tables, we just insert.
        
        const insertAdmin = `
            INSERT INTO users (role, first_name, last_name, email, password_hash, status)
            VALUES ('admin', 'System', 'Admin', $1, $2, 'active')
        `;
        
        await pool.query(insertAdmin, [adminEmail, passwordHash]);
        console.log(`Admin user created: ${adminEmail} / admin123`);

        process.exit(0);
    } catch (err) {
        console.error('Error initializing database:', err);
        process.exit(1);
    }
}

run();
