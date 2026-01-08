const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { isNotAuthenticated } = require('../middleware/auth.middleware');

router.get('/login', isNotAuthenticated, authController.getLogin);
router.post('/login', isNotAuthenticated, authController.postLogin);
router.get('/register', isNotAuthenticated, authController.getRegister);
router.post('/register', isNotAuthenticated, authController.postRegister);
router.get('/logout', authController.logout);

module.exports = router;
