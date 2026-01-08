const db = require('../config/db');

exports.getHome = async (req, res) => {
    try {  
        // Popular books (by views or sales, using views for simple approximation or random for now if no sales data)
        const popularBooks = await db.query("SELECT * FROM books WHERE status = 'active' ORDER BY views_count DESC LIMIT 4");

        res.render('index', { 
            title: 'Home', 
            popularBooks: popularBooks.rows,
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error loading home' });
    }
};

exports.getUserProfile = async (req, res) => {
    const targetUserId = req.params.userId;
    
    try {
        const userRes = await db.query('SELECT id, first_name, last_name, role, email, phone_number, birth_date FROM users WHERE id = $1', [targetUserId]);
        if (userRes.rows.length === 0) {
            return res.render('error', { message: 'User not found' });
        }
        const user = userRes.rows[0];
        let profileData = { ...user };
        
        // Fetch role specific data
        if (user.role === 'seller') {
            const profileRes = await db.query(`
                SELECT sp.*, c.name as city_name 
                FROM seller_profiles sp 
                LEFT JOIN lookup_cities c ON sp.city_id = c.id
                WHERE sp.user_id = $1
            `, [targetUserId]);
            if (profileRes.rows.length > 0) {
                profileData = { ...profileData, ...profileRes.rows[0] };
            }
            
            // Fetch seller's active books
            const booksRes = await db.query('SELECT * FROM books WHERE seller_id = $1 AND status = \'active\'', [targetUserId]);
            profileData.books = booksRes.rows;

        } else if (user.role === 'buyer') {
            const profileRes = await db.query('SELECT * FROM buyer_profiles WHERE user_id = $1', [targetUserId]);
            if (profileRes.rows.length > 0) {
                profileData = { ...profileData, ...profileRes.rows[0] };
            }
            
            // Fetch public interests if needed (already in profileRes as json)
        }

        res.render('public/profile', { targetUser: profileData, currentUser: req.session.user });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error loading profile' });
    }
};
