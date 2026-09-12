const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  toggleBlockUser,
  getAllVendorsAdmin,
  updateVendorStatus,
  getAllOrdersAdmin,
  updateOrderStatusAdmin
} = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorizeRoles('admin'));

router.get('/users', getAllUsers);
router.put('/users/:id/block', toggleBlockUser);

router.get('/vendors', getAllVendorsAdmin);
router.put('/vendors/:id/status', updateVendorStatus);

router.get('/orders', getAllOrdersAdmin);
router.put('/orders/:id/status', updateOrderStatusAdmin);

module.exports = router;
