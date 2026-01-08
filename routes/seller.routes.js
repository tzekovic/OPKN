const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/seller.controller');
const { isRole } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// Protect routes
router.use(isRole('seller'));

// Books
router.get('/books', sellerController.getMyBooks);
router.get('/books/add', sellerController.getAddBook);
router.post('/books/add', upload.single('image'), sellerController.postAddBook);
router.get('/books/edit/:id', sellerController.getEditBook);
router.post('/books/edit/:id', upload.single('image'), sellerController.postEditBook);

// Profile
router.get('/profile', sellerController.getProfile);
router.post('/profile', upload.single('profileImage'), sellerController.postProfile);

// Orders
router.get('/orders', sellerController.getOrders);
router.post('/orders/:orderId/status', sellerController.updateOrderStatus);

module.exports = router;
