const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { isRole } = require('../middleware/auth.middleware');

// Protect all admin routes
router.use(isRole('admin'));

router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getUsers);
router.post('/users/:userId/status', adminController.updateUserStatus);
router.get('/lookups', adminController.getLookups);
router.post('/lookups', adminController.addLookup);
router.get('/lookups/delete/:type/:id', adminController.deleteLookup); // Using GET for simple delete link, ideally should be DELETE/POST

module.exports = router;
