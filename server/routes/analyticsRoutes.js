const express = require('express');
const router = express.Router();
const { getVendorAnalytics, getAdminAnalytics } = require('../controllers/analyticsController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/vendor', protect, authorizeRoles('vendor'), getVendorAnalytics);
router.get('/admin', protect, authorizeRoles('admin'), getAdminAnalytics);

module.exports = router;
