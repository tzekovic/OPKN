const db = require('../config/db');

exports.getDashboard = async (req, res) => {
    try {
        // Stats queries
        const userCount = await db.query('SELECT COUNT(*) FROM users');
        const bookCount = await db.query('SELECT COUNT(*) FROM books');
        const activeAds = await db.query("SELECT COUNT(*) FROM books WHERE status = 'active'");
        const completedOrders = await db.query("SELECT COUNT(*) FROM orders WHERE status = 'completed'");

        // Popular genres (simple count by book association)
        const popularGenres = await db.query(`
            SELECT g.name, COUNT(b.id) as count 
            FROM books b 
            JOIN lookup_genres g ON b.genre_id = g.id 
            GROUP BY g.name 
            ORDER BY count DESC 
            LIMIT 5
        `);

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            stats: {
                users: userCount.rows[0].count,
                books: bookCount.rows[0].count,
                active_ads: activeAds.rows[0].count,
                completed_orders: completedOrders.rows[0].count,
                popular_genres: popularGenres.rows
            }
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error loading dashboard' });
    }
};

exports.getUsers = async (req, res) => {
    try {
        // List all users except self (optional, but good for safety) or all users
        const result = await db.query("SELECT * FROM users ORDER BY created_at DESC");
        res.render('admin/users', { title: 'User Management', users: result.rows });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error loading users' });
    }
};

exports.updateUserStatus = async (req, res) => {
    const { userId } = req.params;
    const { status, blockedUntil } = req.body; // status: 'active', 'blocked', 'archived'
    
    let query = "UPDATE users SET status = $1";
    let params = [status];

    if (status === 'blocked' && blockedUntil) {
        // Block for 15 days logic handled by frontend sending date or backend logic
        // If frontend sends '15days', we calc date here
        if (blockedUntil === '15days') {
            const date = new Date();
            date.setDate(date.getDate() + 15);
            query += ", blocked_until = $2";
            params.push(date);
        } else {
             // Permanent block (null date or far future)
             query += ", blocked_until = NULL";
        }
    } else {
        query += ", blocked_until = NULL";
    }

    query += ` WHERE id = $${params.length + 1}`;
    params.push(userId);

    try {
        await db.query(query, params);
        res.redirect('/admin/users');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/users?error=UpdateFailed');
    }
};

// Lookups
exports.getLookups = async (req, res) => {
    try {
        const genres = await db.query('SELECT * FROM lookup_genres ORDER BY name');
        const languages = await db.query('SELECT * FROM lookup_languages ORDER BY name');
        const cities = await db.query('SELECT * FROM lookup_cities ORDER BY name');
        
        res.render('admin/lookups', { 
            title: 'Catalog Management',
            genres: genres.rows,
            languages: languages.rows,
            cities: cities.rows
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error loading lookups' });
    }
};

exports.addLookup = async (req, res) => {
    const { type, name } = req.body;
    let table = '';
    
    switch(type) {
        case 'genre': table = 'lookup_genres'; break;
        case 'language': table = 'lookup_languages'; break;
        case 'city': table = 'lookup_cities'; break;
        default: return res.redirect('/admin/lookups?error=InvalidType');
    }

    try {
        await db.query(`INSERT INTO ${table} (name) VALUES ($1)`, [name]);
        res.redirect('/admin/lookups');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/lookups?error=AddFailed');
    }
};

exports.deleteLookup = async (req, res) => {
    const { type, id } = req.params;
    let table = '';
    
    switch(type) {
        case 'genre': table = 'lookup_genres'; break;
        case 'language': table = 'lookup_languages'; break;
        case 'city': table = 'lookup_cities'; break;
        default: return res.redirect('/admin/lookups?error=InvalidType');
    }

    try {
        await db.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
        res.redirect('/admin/lookups');
    } catch (err) {
        console.error(err);
        // Foreign key constraint might fail if in use
        res.redirect('/admin/lookups?error=DeleteFailedInUse');
    }
};
