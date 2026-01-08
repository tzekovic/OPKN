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
        console.log('Running migration v2...');
        
        // Add columns to users if they don't exist
        await pool.query(`
            DO $$ 
            BEGIN 
                BEGIN
                    ALTER TABLE users ADD COLUMN phone_number VARCHAR(50);
                EXCEPTION
                    WHEN duplicate_column THEN RAISE NOTICE 'column phone_number already exists in users';
                END;
                BEGIN
                    ALTER TABLE users ADD COLUMN address TEXT;
                EXCEPTION
                    WHEN duplicate_column THEN RAISE NOTICE 'column address already exists in users';
                END;
                BEGIN
                    ALTER TABLE users ADD COLUMN birth_date DATE;
                EXCEPTION
                    WHEN duplicate_column THEN RAISE NOTICE 'column birth_date already exists in users';
                END;
            END $$;
        `);

        // Add profile_image to buyer_profiles if not exists (it was only in seller_profiles)
        await pool.query(`
            DO $$ 
            BEGIN 
                BEGIN
                    ALTER TABLE buyer_profiles ADD COLUMN profile_image VARCHAR(255);
                EXCEPTION
                    WHEN duplicate_column THEN RAISE NOTICE 'column profile_image already exists in buyer_profiles';
                END;
            END $$;
        `);

        console.log('Migration v2 completed.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

run();
