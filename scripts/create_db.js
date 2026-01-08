const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'postgres', // Connect to default DB to create new one
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function createDatabase() {
    try {
        await client.connect();
        
        const dbName = process.env.DB_NAME;
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);
        
        if (res.rowCount === 0) {
            console.log(`Database ${dbName} does not exist. Creating...`);
            await client.query(`CREATE DATABASE "${dbName}"`);
            console.log(`Database ${dbName} created successfully.`);
        } else {
            console.log(`Database ${dbName} already exists.`);
        }
        
    } catch (err) {
        console.error('Error creating database:', err);
    } finally {
        await client.end();
    }
}

createDatabase();
