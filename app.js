const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session Config
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// Global Middleware to pass user and unread count to views
const db = require('./config/db'); // Ensure db is imported
app.use(async (req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.unreadCount = 0;
    
    if (req.session.user) {
        try {
            const result = await db.query(
                `SELECT COUNT(*) FROM messages WHERE receiver_id = $1 AND is_read = FALSE`, 
                [req.session.user.id]
            );
            res.locals.unreadCount = parseInt(result.rows[0].count);
        } catch (err) {
            console.error('Error fetching notifications', err);
        }
    }
    next();
});

// Routes
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const sellerRoutes = require('./routes/seller.routes');
const buyerRoutes = require('./routes/buyer.routes');
const chatRoutes = require('./routes/chat.routes');
const publicController = require('./controllers/public.controller');

app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/seller', sellerRoutes);
app.use('/chat', chatRoutes);
app.get('/users/:userId', publicController.getUserProfile); // Public profile route
app.use('/', buyerRoutes); // Home and Search are at root




// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
