const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { isAuthenticated } = require('../middleware/auth.middleware');

router.use(isAuthenticated);

router.get('/inbox', chatController.getInbox);
router.get('/start', chatController.startChat);
router.get('/:partnerId', chatController.getConversation);
router.post('/:partnerId', chatController.sendMessage);

module.exports = router;
