const bcrypt = require('bcrypt');
const db = require('../config/db');

exports.getLogin = (req, res) => {
    const error = req.query.error || null;
    return res.render("auth/login", { title: 'Login', error });
};

exports.postLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.render('auth/login', { title: 'Login', error: 'Invalid email or password' });
        }

        const user = result.rows[0];
        
        if (user.status === 'blocked') {
             return res.render('auth/login', { title: 'Login', error: 'Your account is blocked.' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.render('auth/login', { title: 'Login', error: 'Invalid email or password' });
        }

        req.session.user = {
            id: user.id,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email
        };

        if (user.role === 'admin') {
            return res.redirect('/admin/dashboard');
        }
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.render('auth/login', { title: 'Login', error: 'Server error occurred' });
    }
};

exports.getRegister = (req, res) => {
    res.render('auth/register', { title: 'Register', error: null });
};

exports.postRegister = async (req, res) => {
    const { firstName, lastName, email, password, role } = req.body;
    // Roles allowed to register: seller, buyer
    if (!['seller', 'buyer'].includes(role)) {
         return res.render('auth/register', { title: 'Register', error: 'Invalid role selected' });
    }

    try {
        const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.render('auth/register', { title: 'Register', error: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await db.query(
            `INSERT INTO users (first_name, last_name, email, password_hash, role) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [firstName, lastName, email, hashedPassword, role]
        );
        
        const newUserId = result.rows[0].id;
        
        // Initialize profile based on role
        if (role === 'seller') {
            await db.query('INSERT INTO seller_profiles (user_id) VALUES ($1)', [newUserId]);
        } else if (role === 'buyer') {
            // Interests logic can be added later/on profile update
            await db.query('INSERT INTO buyer_profiles (user_id) VALUES ($1)', [newUserId]);
        }

        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.render('auth/register', { title: 'Register', error: 'Registration failed' });
    }
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
};
