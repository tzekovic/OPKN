const db = require('../config/db');

// BOOKS MANAGEMENT
exports.getMyBooks = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const result = await db.query(`
            SELECT b.*, g.name as genre, l.name as language, c.name as condition 
            FROM books b 
            LEFT JOIN lookup_genres g ON b.genre_id = g.id
            LEFT JOIN lookup_languages l ON b.language_id = l.id
            LEFT JOIN lookup_conditions c ON b.condition_id = c.id
            WHERE b.seller_id = $1 ORDER BY b.created_at DESC`, [userId]);
            
        res.render('seller/books', { title: 'My Books', books: result.rows });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error loading books' });
    }
};

exports.getAddBook = async (req, res) => {
    try {
        const genres = await db.query('SELECT * FROM lookup_genres ORDER BY name');
        const languages = await db.query('SELECT * FROM lookup_languages ORDER BY name');
        const conditions = await db.query('SELECT * FROM lookup_conditions ORDER BY name');
        const cities = await db.query('SELECT * FROM lookup_cities ORDER BY name');

        res.render('seller/book_form', { 
            title: 'Add Book', 
            book: null,
            genres: genres.rows,
            languages: languages.rows,
            conditions: conditions.rows,
            cities: cities.rows
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error loading form' });
    }
};

exports.postAddBook = async (req, res) => {
    const { title, author, publisher, year, genreId, languageId, conditionId, description, price, exchange, locationId } = req.body;
    const sellerId = req.session.user.id;
    const imageUrl = req.file ? '/uploads/' + req.file.filename : null;

    try {
        await db.query(`
            INSERT INTO books (seller_id, title, author, publisher, year_published, genre_id, language_id, condition_id, description, price, is_exchange_possible, location_id, image_url, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active')
        `, [sellerId, title, author, publisher, year, genreId, languageId, conditionId, description, price || 0, exchange === 'on', locationId, imageUrl]);

        res.redirect('/seller/books');
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error adding book' });
    }
};

exports.getEditBook = async (req, res) => {
    const { id } = req.params;
    const sellerId = req.session.user.id;

    try {
        const bookResult = await db.query('SELECT * FROM books WHERE id = $1 AND seller_id = $2', [id, sellerId]);
        if (bookResult.rows.length === 0) return res.render('error', { message: 'Book not found' });

        const genres = await db.query('SELECT * FROM lookup_genres ORDER BY name');
        const languages = await db.query('SELECT * FROM lookup_languages ORDER BY name');
        const conditions = await db.query('SELECT * FROM lookup_conditions ORDER BY name');
        const cities = await db.query('SELECT * FROM lookup_cities ORDER BY name');

        res.render('seller/book_form', { 
            title: 'Edit Book', 
            book: bookResult.rows[0],
            genres: genres.rows,
            languages: languages.rows,
            conditions: conditions.rows,
            cities: cities.rows
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error loading book' });
    }
};

exports.postEditBook = async (req, res) => {
    const { id } = req.params;
    const sellerId = req.session.user.id;
    const { title, author, publisher, year, genreId, languageId, conditionId, description, price, exchange, locationId, status } = req.body;
    
    // Logic to keep old image if no new one
    let imageUrl = req.file ? '/uploads/' + req.file.filename : null;

    try {
        if (!imageUrl) {
            const oldBook = await db.query('SELECT image_url FROM books WHERE id = $1', [id]);
            imageUrl = oldBook.rows[0].image_url;
        }

        await db.query(`
            UPDATE books SET 
            title=$1, author=$2, publisher=$3, year_published=$4, genre_id=$5, language_id=$6, 
            condition_id=$7, description=$8, price=$9, is_exchange_possible=$10, location_id=$11, image_url=$12, status=$13
            WHERE id=$14 AND seller_id=$15
        `, [title, author, publisher, year, genreId, languageId, conditionId, description, price || 0, exchange === 'on', locationId, imageUrl, status, id, sellerId]);

        res.redirect('/seller/books');
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error updating book' });
    }
};

// PROFILE
exports.getProfile = async (req, res) => {
    const userId = req.session.user.id;
    try {
        const result = await db.query(`
            SELECT sp.*, u.first_name, u.last_name, u.email, u.phone_number, u.address, u.birth_date
            FROM seller_profiles sp
            JOIN users u ON sp.user_id = u.id
            WHERE sp.user_id = $1
        `, [userId]);
        const cities = await db.query('SELECT * FROM lookup_cities ORDER BY name');
        
        let profile = result.rows[0];
        
        res.render('seller/profile', { title: 'My Profile', profile, cities: cities.rows });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error loading profile' });
    }
};

exports.postProfile = async (req, res) => {
    const userId = req.session.user.id;
    const { description, cityId, phoneNumber, address, birthDate } = req.body;
    const imageUrl = req.file ? '/uploads/' + req.file.filename : null;

    try {
        // Update user common info
        await db.query(`
            UPDATE users SET phone_number=$1, address=$2, birth_date=$3 WHERE id=$4
        `, [phoneNumber, address, birthDate || null, userId]);

        // Update seller profile specific info
        if (imageUrl) {
            await db.query(`UPDATE seller_profiles SET description=$1, city_id=$2, profile_image=$3 WHERE user_id=$4`, [description, cityId, imageUrl, userId]);
        } else {
            await db.query(`UPDATE seller_profiles SET description=$1, city_id=$2 WHERE user_id=$3`, [description, cityId, userId]);
        }
        res.redirect('/seller/profile');
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error updating profile' });
    }
};

// ORDERS
exports.getOrders = async (req, res) => {
    const sellerId = req.session.user.id;
    try {
        const result = await db.query(`
            SELECT o.id, o.created_at, o.status, o.type, o.buyer_id,
                   u.first_name || ' ' || u.last_name as buyer_name,
                   b.title as book_title
            FROM orders o
            JOIN users u ON o.buyer_id = u.id
            JOIN order_items oi ON o.id = oi.order_id
            JOIN books b ON oi.book_id = b.id
            WHERE o.seller_id = $1
            ORDER BY o.created_at DESC
        `, [sellerId]);

        res.render('seller/orders', { title: 'Manage Orders', orders: result.rows });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error loading orders' });
    }
};

exports.updateOrderStatus = async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;
    const sellerId = req.session.user.id;

    try {
        await db.query('UPDATE orders SET status = $1 WHERE id = $2 AND seller_id = $3', [status, orderId, sellerId]);
        
        // If order is completed/accepted, setup chat? (Or chat is separate)
        // If completed, maybe mark book as sold?
        if (status === 'completed') {
             // Find book id and mark sold
             // This logic depends on requirement: "označavanja narudžbe kao završene" -> "active" to "sold"?
             // Let's keep it simple for now. 
             // Ideally we should mark the book as 'sold' to prevent double selling.
             const orderItems = await db.query('SELECT book_id FROM order_items WHERE order_id = $1', [orderId]);
             for (let item of orderItems.rows) {
                 await db.query("UPDATE books SET status = 'sold' WHERE id = $1", [item.book_id]);
             }
        }

        res.redirect('/seller/orders');
    } catch (err) {
        console.error(err);
        res.redirect('/seller/orders?error=UpdateFailed');
    }
};
