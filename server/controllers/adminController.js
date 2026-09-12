const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Order = require('../models/Order');

// @desc    Get all users
// @route   GET /api/admin/users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle block/unblock user
// @route   PUT /api/admin/users/:id/block
const toggleBlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot block Admin users' });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({ message: `User status updated to ${user.isBlocked ? 'Blocked' : 'Active'}`, isBlocked: user.isBlocked });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all vendors with approval status
// @route   GET /api/admin/vendors
const getAllVendorsAdmin = async (req, res) => {
  try {
    const vendors = await Vendor.find()
      .populate('user', 'name email avatar isBlocked')
      .sort({ createdAt: -1 });
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update vendor approval status (approved / rejected)
// @route   PUT /api/admin/vendors/:id/status
const updateVendorStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    vendor.status = status;
    await vendor.save();

    res.json({ message: `Vendor store '${vendor.storeName}' status set to ${status}`, vendor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all orders for admin
// @route   GET /api/admin/orders
const getAllOrdersAdmin = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customer', 'name email')
      .populate('items.vendor', 'storeName')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update overall order status by admin
// @route   PUT /api/admin/orders/:id/status
const updateOrderStatusAdmin = async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.orderStatus = orderStatus;
    if (orderStatus === 'Delivered') {
      order.paymentStatus = 'Paid';
      order.items.forEach(item => {
        item.status = 'Delivered';
      });
    }

    await order.save();
    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllUsers,
  toggleBlockUser,
  getAllVendorsAdmin,
  updateVendorStatus,
  getAllOrdersAdmin,
  updateOrderStatusAdmin
};
