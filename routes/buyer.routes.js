const express = require('express');
const router = express.Router();
const buyerController = require('../controllers/buyer.controller');
const { isRole, isAuthenticated } = require('../middleware/auth.middleware');

// Public routes (Search, Details, Home)
router.get('/', buyerController.getHome);
router.get('/search', buyerController.searchBooks);
router.get('/books/:id', buyerController.getBookDetails);

// Protected Buyer Routes
router.use('/buyer', isRole('buyer')); // Prefix all below with /buyer check
// Actually I need to be careful with paths. 
// Let's define specific protected paths.

router.get('/buyer/cart', isRole('buyer'), buyerController.getCart);
router.post('/buyer/cart/add', isRole('buyer'), buyerController.addToCart);
router.post('/buyer/cart/remove', isRole('buyer'), buyerController.removeFromCart);
router.post('/buyer/checkout', isRole('buyer'), buyerController.checkout);

router.get('/buyer/orders', isRole('buyer'), buyerController.getMyOrders);
router.post('/buyer/review', isRole('buyer'), buyerController.postReview);

module.exports = router;
