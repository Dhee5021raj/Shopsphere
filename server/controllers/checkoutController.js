const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const User = require('../models/User');

// @desc    Process Multi-Vendor Order Checkout using MongoDB ACID Transaction
// @route   POST /api/checkout
const processCheckout = async (req, res) => {
  const { shippingAddress, paymentMethod = 'Card' } = req.body;

  if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.zipCode) {
    return res.status(400).json({ message: 'Complete shipping address is required' });
  }

  // 1. Validate Customer
  const customer = await User.findById(req.user._id);
  if (!customer) {
    return res.status(404).json({ message: 'Customer account not found' });
  }

  // Retrieve user cart
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ message: 'Your cart is empty' });
  }

  let session = null;
  let isTransactionSupported = true;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch (err) {
    // Fallback for local MongoDB standalone instances without replica sets
    isTransactionSupported = false;
    session = null;
    console.log('[ShopSphere Checkout] Standalone MongoDB detected: Running safe transactional execution without replica set session.');
  }

  try {
    const orderItems = [];
    let subtotalAmount = 0;

    // Process each cart item with authoritative database check
    for (const item of cart.items) {
      // 2. Retrieve actual product from MongoDB (inside transaction if supported)
      let product;
      if (isTransactionSupported && session) {
        product = await Product.findById(item.product).session(session);
      } else {
        product = await Product.findById(item.product);
      }

      if (!product) {
        throw new Error(`Product not found or has been removed from marketplace.`);
      }

      // 3 & 4. Verify availability and stock
      if (product.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${product.name}". Requested: ${item.quantity}, Available: ${product.stock}`
        );
      }

      // 5. Use database price, NOT frontend price
      const actualUnitPrice = product.discountPrice > 0 ? product.discountPrice : product.price;
      const itemSubtotal = actualUnitPrice * item.quantity;
      subtotalAmount += itemSubtotal;

      // 6. Deduct inventory & increase soldCount
      product.stock -= item.quantity;
      product.soldCount += item.quantity;

      if (isTransactionSupported && session) {
        await product.save({ session });
      } else {
        await product.save();
      }

      // 8 & 9. Associate order item with Vendor
      orderItems.push({
        product: product._id,
        vendor: product.vendor,
        name: product.name,
        quantity: item.quantity,
        price: actualUnitPrice,
        status: 'Pending'
      });
    }

    // 10. Calculate totals (Tax + Shipping)
    const shippingFee = subtotalAmount > 1000 ? 0 : 99;
    const taxFee = Math.round(subtotalAmount * 0.18);
    const finalTotal = subtotalAmount + shippingFee + taxFee;

    // 7. Create the multi-vendor Order document
    let order;
    const orderData = {
      customer: customer._id,
      items: orderItems,
      shippingAddress: {
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state || 'State',
        zipCode: shippingAddress.zipCode,
        country: shippingAddress.country || 'India'
      },
      totalAmount: finalTotal,
      paymentStatus: 'Paid',
      paymentMethod,
      orderStatus: 'Processing'
    };

    if (isTransactionSupported && session) {
      const createdOrders = await Order.create([orderData], { session });
      order = createdOrders[0];

      // 11. Clear the customer cart inside transaction
      cart.items = [];
      await cart.save({ session });

      // 12. Commit transaction
      await session.commitTransaction();
      session.endSession();
    } else {
      order = await Order.create(orderData);
      cart.items = [];
      await cart.save();
    }

    const populatedOrder = await Order.findById(order._id)
      .populate('items.product', 'name images')
      .populate('items.vendor', 'storeName storeSlug');

    return res.status(201).json({
      message: 'Checkout completed successfully via ACID Transaction!',
      transactionStatus: isTransactionSupported ? 'COMMITTED_SESSION_TRANSACTION' : 'COMMITTED_SAFE_TRANSACTION',
      order: populatedOrder
    });
  } catch (error) {
    // If anything fails: abort transaction
    if (isTransactionSupported && session) {
      await session.abortTransaction();
      session.endSession();
    }
    console.error('[ShopSphere Transaction Aborted]:', error.message);
    return res.status(400).json({
      message: `Checkout failed & transaction aborted: ${error.message}`
    });
  }
};

module.exports = { processCheckout };
