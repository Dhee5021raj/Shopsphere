const Order = require('../models/Order');

// @desc    Get customer orders
// @route   GET /api/orders/my-orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('items.product', 'name images price')
      .populate('items.vendor', 'storeName storeSlug logo')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single order details by ID
// @route   GET /api/orders/:id
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email')
      .populate('items.product', 'name images price discountPrice')
      .populate('items.vendor', 'storeName storeSlug logo rating');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify user owns order or is admin/vendor
    if (
      order.customer._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel order (Customer can cancel if status is Pending or Processing)
// @route   PUT /api/orders/:id/cancel
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    if (order.orderStatus === 'Shipped' || order.orderStatus === 'Delivered') {
      return res.status(400).json({ message: `Cannot cancel order that is already ${order.orderStatus}` });
    }

    order.orderStatus = 'Cancelled';
    order.items.forEach(item => {
      item.status = 'Cancelled';
    });

    await order.save();
    res.json({ message: 'Order successfully cancelled', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMyOrders,
  getOrderById,
  cancelOrder
};
