const db = require('../config/db');

exports.getInbox = async (req, res) => {
    const userId = req.session.user.id;
    try {
        // Distinct conversations
        // We want to list users we have chatted with.
        // This query gets the latest message for each partner.
        const result = await db.query(`
            SELECT DISTINCT ON (partner_id) 
                CASE 
                    WHEN sender_id = $1 THEN receiver_id 
                    ELSE sender_id 
                END as partner_id,
                u.first_name, u.last_name,
                m.content as last_message, m.created_at, m.is_read, m.sender_id as last_sender_id
            FROM messages m
            JOIN users u ON (
                (m.sender_id = $1 AND m.receiver_id = u.id) OR 
                (m.receiver_id = $1 AND m.sender_id = u.id)
            )
            ORDER BY partner_id, m.created_at DESC
        `, [userId]);

        res.render('chat/inbox', { title: 'Messages', conversations: result.rows, userId: userId });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error loading inbox' });
    }
};

exports.getConversation = async (req, res) => {
    const userId = req.session.user.id;
    const { partnerId } = req.params;

    try {
        const partner = await db.query('SELECT first_name, last_name FROM users WHERE id = $1', [partnerId]);
        if (partner.rows.length === 0) return res.redirect('/chat/inbox');

        // Mark as read
        await db.query('UPDATE messages SET is_read = TRUE WHERE receiver_id = $1 AND sender_id = $2', [userId, partnerId]);

        const messages = await db.query(`
            SELECT * FROM messages 
            WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
            ORDER BY created_at ASC
        `, [userId, partnerId]);

        res.render('chat/conversation', { 
            title: `Chat with ${partner.rows[0].first_name}`, 
            partner: { id: partnerId, name: `${partner.rows[0].first_name} ${partner.rows[0].last_name}` },
            messages: messages.rows,
            userId: userId
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error loading chat' });
    }
};

exports.sendMessage = async (req, res) => {
    const userId = req.session.user.id;
    const { partnerId } = req.params;
    const { content } = req.body;

    try {
        await db.query(`INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3)`, [userId, partnerId, content]);
        res.redirect('/chat/' + partnerId);
    } catch (err) {
        console.error(err);
        res.redirect('/chat/' + partnerId + '?error=SendFailed');
    }
};

// Start a new chat (e.g. from book details page or profile)
// Using query param ?userId=X to start
exports.startChat = (req, res) => {
    const { userId } = req.query;
    if (userId) {
        res.redirect('/chat/' + userId);
    } else {
        res.redirect('/chat/inbox');
    }
};
