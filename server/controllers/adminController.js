const fs = require('fs');
const path = require('path');
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

// @desc    Get the last 100 mongo-pt records (shadow + benchmark log)
// @route   GET /api/admin/pt-log
const getPtLog = async (req, res) => {
  try {
    const logFile = process.env.PT_LOG || path.join(__dirname, '..', 'logs', 'pt-log.jsonl');
    if (!fs.existsSync(logFile)) return res.json([]);
    const lines = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean);
    const records = [];
    for (const line of lines.slice(-100)) {
      try { records.push(JSON.parse(line)); } catch (_) { /* skip malformed */ }
    }
    res.json(records.reverse()); // newest first
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Is a mongo-pt measurement running right now, and which phase?
// @route   GET /api/admin/pt-status
//
// The shadow child writes `.pt-shadow-status.json` with per-phase progress
// (reduced runs first, then naive) and its pid, so the UI can show
// "REDUCED FINISHED" while the naive side is still measuring. Liveness is
// verified via `process.kill(pid, 0)` and the file's updatedAt, so a crashed
// child can never keep the indicator running forever (the old bug that stuck
// "MEASUREMENT RUNNING · Ns elapsed" on screen for minutes).
const getPtStatus = async (req, res) => {
  try {
    const logDir = path.join(__dirname, '..', 'logs');
    const statusFile = path.join(logDir, '.pt-shadow-status.json');
    const STALE_MS = 15 * 60 * 1000; // hard cap: a phantom run is never shown past this

    const isAlive = (pid) => {
      try { process.kill(pid, 0); return true; } catch (_) { return false; }
    };
    const shape = (p) => p ? {
      running: p.phase === 'running',
      done: p.phase === 'done',
      startedAt: p.startedAt || null,
      finishedAt: p.finishedAt || null,
      ms: p.ms != null ? p.ms : null
    } : null;

    // 1) Preferred source: the live status file written by scripts/ptShadow.js.
    try {
      const rec = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
      const updatedAtMs = new Date(rec.updatedAt || rec.startedAt).getTime();
      const fresh = Date.now() - updatedAtMs < STALE_MS && isAlive(rec.pid);
      const phases = { naive: shape(rec.naive), reduced: shape(rec.reduced) };
      // A phase belongs to a live run only if the whole record is fresh:
      // gate every phase's `running` on it so a dead child cannot expose a
      // phantom "RUNNING" phase even when the overall flag is false.
      if (!fresh) {
        if (phases.naive) phases.naive.running = false;
        if (phases.reduced) phases.reduced.running = false;
      }
      const anyPhase = fresh && Object.values(phases).some((p) => p && (p.running || p.done));
      return res.json({
        running: anyPhase,
        startedAt: rec.startedAt || null,
        ...phases,
        staleAfterMin: STALE_MS / 60000,
        typicalRunSeconds: 60
      });
    } catch (_) { /* no/unreadable status file -> fall back to the legacy lock */ }

    // 2) Legacy fallback (older shadow child without a status file): the lock.
    let running = false;
    let startedAt = null;
    try {
      const mtimeMs = fs.statSync(path.join(logDir, '.pt-shadow.lock')).mtimeMs;
      if (Date.now() - mtimeMs < STALE_MS) {
        running = true;
        startedAt = new Date(mtimeMs).toISOString();
      }
    } catch (_) { /* no lock file → idle */ }
    res.json({ running, startedAt, naive: null, reduced: null, staleAfterMin: STALE_MS / 60000, typicalRunSeconds: 60 });
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
  updateOrderStatusAdmin,
  getPtLog,
  getPtStatus
};
