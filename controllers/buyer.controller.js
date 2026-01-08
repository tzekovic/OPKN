const db = require('../config/db');

exports.getHome = async (req, res) => {
    try {
        // Random books
        const randomBooks = await db.query("SELECT * FROM books WHERE status = 'active' ORDER BY RANDOM() LIMIT 4");
        
        // Popular books (by views or sales, using views for simple approximation or random for now if no sales data)
        const popularBooks = await db.query("SELECT * FROM books WHERE status = 'active' ORDER BY views_count DESC LIMIT 4");
        
        // Recommended (placeholder, if user logged in match interest)
        let recommendedBooks = [];
        if (req.session.user && req.session.user.role === 'buyer') {
             // Logic to fetch based on buyer interests
             // For now just random different ones
             recommendedBooks = await db.query("SELECT * FROM books WHERE status = 'active' ORDER BY created_at DESC LIMIT 4");
        }

        res.render('buyer/home', { 
            title: 'Home', 
            randomBooks: randomBooks.rows, 
            popularBooks: popularBooks.rows,
            recommendedBooks: recommendedBooks.rows || []
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error loading home' });
    }
};

exports.searchBooks = async (req, res) => {
    const { q, genre, city, maxPrice } = req.query;
    let query = "SELECT b.*, g.name as genre_name, c.name as city_name FROM books b JOIN lookup_genres g ON b.genre_id=g.id JOIN lookup_cities c ON b.location_id=c.id WHERE b.status = 'active'";
    let params = [];
    
    if (q) {
        params.push(`%${q}%`);
        query += ` AND (b.title ILIKE $${params.length} OR b.author ILIKE $${params.length})`;
    }
    if (genre) {
        params.push(genre);
        query += ` AND b.genre_id = $${params.length}`;
    }
    if (city) {
        params.push(city);
        query += ` AND b.location_id = $${params.length}`;
    }
    if (maxPrice) {
        params.push(maxPrice);
        query += ` AND b.price <= $${params.length}`;
    }

    try {
        const books = await db.query(query, params);
        const genres = await db.query('SELECT * FROM lookup_genres ORDER BY name');
        const cities = await db.query('SELECT * FROM lookup_cities ORDER BY name');
        
        res.render('buyer/search', { 
            title: 'Search Books', 
            books: books.rows,
            genres: genres.rows,
            cities: cities.rows,
            query: req.query
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error searching books' });
    }
};

exports.getBookDetails = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE books SET views_count = views_count + 1 WHERE id = $1', [id]);
        
        const result = await db.query(`
            SELECT b.*, 
                   g.name as genre, l.name as language, c.name as condition, loc.name as city,
                   u.first_name || ' ' || u.last_name as seller_name,
                   sp.average_rating as seller_rating
            FROM books b
            JOIN users u ON b.seller_id = u.id
            LEFT JOIN seller_profiles sp ON u.id = sp.user_id
            LEFT JOIN lookup_genres g ON b.genre_id = g.id
            LEFT JOIN lookup_languages l ON b.language_id = l.id
            LEFT JOIN lookup_conditions c ON b.condition_id = c.id
            LEFT JOIN lookup_cities loc ON b.location_id = loc.id
            WHERE b.id = $1
        `, [id]);

        if (result.rows.length === 0) return res.render('error', { message: 'Book not found' });
        
        const reviews = await db.query(`
            SELECT r.*, u.first_name 
            FROM reviews r 
            JOIN users u ON r.buyer_id = u.id 
            WHERE r.book_id = $1 ORDER BY r.created_at DESC
        `, [id]);

        res.render('buyer/book_details', { 
            title: result.rows[0].title, 
            book: result.rows[0],
            reviews: reviews.rows
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error loading book details' });
    }
};

// CART (Session based)
exports.addToCart = (req, res) => {
    const { bookId } = req.body;
    if (!req.session.cart) req.session.cart = [];
    
    // Check if duplicate
    if (!req.session.cart.includes(bookId)) {
        req.session.cart.push(bookId);
    }
    res.redirect('/buyer/cart');
};

exports.getCart = async (req, res) => {
    if (!req.session.cart || req.session.cart.length === 0) {
        return res.render('buyer/cart', { title: 'My Cart', books: [] });
    }
    
    try {
        // Fetch details for books in cart
        // Using ANY for array
        const result = await db.query(`SELECT * FROM books WHERE id = ANY($1::int[])`, [req.session.cart]);
        res.render('buyer/cart', { title: 'My Cart', books: result.rows });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error loading cart' });
    }
};

exports.removeFromCart = (req, res) => {
    const { bookId } = req.body;
    if (req.session.cart) {
        req.session.cart = req.session.cart.filter(id => id != bookId);
    }
    res.redirect('/buyer/cart');
};

exports.checkout = async (req, res) => {
    if (!req.session.cart || req.session.cart.length === 0) return res.redirect('/buyer/cart');
    const userId = req.session.user.id;

    try {
        // Group by seller? Or just create multiple orders implicitly?
        // Requirement: "kreiranja narudžbe (za jednu ili više knjiga istog prodavača)"
        // Simplified: We will iterate books and create orders grouped by seller.
        
        const books = await db.query(`SELECT * FROM books WHERE id = ANY($1::int[])`, [req.session.cart]);
        
        // Group by seller_id
        const sellerGroups = {};
        books.rows.forEach(book => {
            if (!sellerGroups[book.seller_id]) sellerGroups[book.seller_id] = [];
            sellerGroups[book.seller_id].push(book);
        });

        // Create Order for each seller
        for (const sellerId in sellerGroups) {
            const groupBooks = sellerGroups[sellerId];
            
            const orderRes = await db.query(`
                INSERT INTO orders (buyer_id, seller_id, type, status)
                VALUES ($1, $2, 'buy', 'pending') RETURNING id
            `, [userId, sellerId]);
            
            const orderId = orderRes.rows[0].id;

            for (const book of groupBooks) {
                await db.query(`
                    INSERT INTO order_items (order_id, book_id) VALUES ($1, $2)
                `, [orderId, book.id]);
                
                // Mark book reserved? Or keep active until accepted?
                // Usually reserved.
                await db.query("UPDATE books SET status = 'reserved' WHERE id = $1", [book.id]);
            }
        }
        
        req.session.cart = []; // Clear cart
        res.redirect('/buyer/orders');

    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Checkout failed' });
    }
};

exports.getMyOrders = async (req, res) => {
    const userId = req.session.user.id;
    try {
        const result = await db.query(`
            SELECT o.*, u.first_name || ' ' || u.last_name as seller_name
            FROM orders o
            JOIN users u ON o.seller_id = u.id
            WHERE o.buyer_id = $1
            ORDER BY o.created_at DESC
        `, [userId]);
        
        // Enhance with items?
        // Keep simple for list view
        res.render('buyer/orders', { title: 'My Orders', orders: result.rows });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error loading orders' });
    }
};

exports.postReview = async (req, res) => {
    const { bookId, rating, comment } = req.body;
    const userId = req.session.user.id;
    
    try {
        await db.query(`INSERT INTO reviews (book_id, buyer_id, rating, comment) VALUES ($1, $2, $3, $4)`, [bookId, userId, rating, comment]);
        res.redirect('/books/' + bookId);
    } catch (err) {
        console.error(err);
        res.redirect('/books/' + bookId + '?error=ReviewFailed');
    }
};

exports.getProfile = async (req, res) => {
    const userId = req.session.user.id;
    try {
        const result = await db.query(`
            SELECT bp.*, u.first_name, u.last_name, u.email, u.phone_number, u.address, u.birth_date
            FROM buyer_profiles bp
            JOIN users u ON bp.user_id = u.id
            WHERE bp.user_id = $1
        `, [userId]);

        const genres = await db.query('SELECT * FROM lookup_genres ORDER BY name');
        const languages = await db.query('SELECT * FROM lookup_languages ORDER BY name');
        
        let profile = result.rows[0];
        if (!profile) {
             await db.query('INSERT INTO buyer_profiles (user_id) VALUES ($1)', [userId]);
             const userRes = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
             const u = userRes.rows[0];
             profile = { 
                 user_id: userId, 
                 first_name: u.first_name, 
                 last_name: u.last_name,
                 interests_json: { genres: [], languages: [] } 
             };
        }

        if (!profile.interests_json) profile.interests_json = { genres: [], languages: [] };
        
        const profileData = {
            ...profile,
            interests: profile.interests_json
        };

        res.render('buyer/profile', { 
            title: 'My Profile', 
            profile: profileData,
            genres: genres.rows,
            languages: languages.rows
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error loading profile' });
    }
};

exports.postProfile = async (req, res) => {
    const userId = req.session.user.id;
    const { phoneNumber, address, birthDate, interestsGenres, interestsLanguages } = req.body;
    const imageUrl = req.file ? '/uploads/' + req.file.filename : null;

    const genres = Array.isArray(interestsGenres) ? interestsGenres : (interestsGenres ? [interestsGenres] : []);
    const languages = Array.isArray(interestsLanguages) ? interestsLanguages : (interestsLanguages ? [interestsLanguages] : []);

    const interestsJson = {
        genres: genres,
        languages: languages
    };

    try {
        await db.query(`
            UPDATE users SET phone_number=$1, address=$2, birth_date=$3 WHERE id=$4
        `, [phoneNumber, address, birthDate || null, userId]);

        if (imageUrl) {
            await db.query(`
                UPDATE buyer_profiles SET interests_json=$1, profile_image=$2 WHERE user_id=$3
            `, [JSON.stringify(interestsJson), imageUrl, userId]);
        } else {
             await db.query(`
                UPDATE buyer_profiles SET interests_json=$1 WHERE user_id=$2
            `, [JSON.stringify(interestsJson), userId]);
        }

        res.redirect('/buyer/profile');
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error updating profile' });
    }
};

exports.cancelOrder = async (req, res) => {
    const userId = req.session.user.id;
    const { orderId } = req.body;
    
    try {
        // Can only cancel if pending and owns the order
        const result = await db.query(`
            UPDATE orders 
            SET status = 'cancelled' 
            WHERE id = $1 AND buyer_id = $2 AND status = 'pending'
        `, [orderId, userId]);
        
        if (result.rowCount > 0) {
            // Also free up the book?
            // If books were reserved, we should set them back to 'active'
            // We need to know which books were in the order.
            // Simplified: Assuming trigger or manual fix, but let's do it manually here.
             await db.query(`
                UPDATE books b
                SET status = 'active'
                FROM order_items oi
                WHERE oi.book_id = b.id AND oi.order_id = $1
            `, [orderId]);
        }

        res.redirect('/buyer/orders');
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error cancelling order' });
    }
};
