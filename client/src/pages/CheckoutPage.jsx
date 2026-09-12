import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CreditCard, Truck, CheckCircle2, Lock, Sparkles, Building2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const CheckoutPage = ({ onToast }) => {
  const { cart, processCheckout } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [shippingAddress, setShippingAddress] = useState({
    street: user?.addresses?.[0]?.street || '42 Tech Park Avenue',
    city: user?.addresses?.[0]?.city || 'Bengaluru',
    state: user?.addresses?.[0]?.state || 'Karnataka',
    zipCode: user?.addresses?.[0]?.zipCode || '560100',
    country: 'India'
  });

  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [processing, setProcessing] = useState(false);
  const [successResult, setSuccessResult] = useState(null);

  const handleSubmitCheckout = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      const result = await processCheckout(shippingAddress, paymentMethod);
      setSuccessResult(result);
      if (onToast) onToast('Order completed via MongoDB ACID Transaction!');
    } catch (err) {
      if (onToast) onToast(err.response?.data?.message || 'Checkout transaction aborted', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (successResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-2xl animate-in zoom-in-95">
          <CheckCircle2 size={44} />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold uppercase tracking-wider">
            {successResult.transactionStatus || 'COMMITTED_TRANSACTION'}
          </span>
          <h2 className="text-3xl font-extrabold text-white">Order Confirmed!</h2>
          <p className="text-xs text-slate-400">
            Order ID: <span className="text-white font-mono">{successResult.order._id}</span>
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-left space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-slate-400">Total Amount Paid</span>
            <span className="text-base font-extrabold text-white">₹{successResult.order.totalAmount?.toLocaleString('en-IN')}</span>
          </div>

          <div>
            <h4 className="font-bold text-slate-300 uppercase mb-2">Ordered Multi-Vendor Items</h4>
            <div className="space-y-2">
              {successResult.order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div>
                    <div className="font-bold text-white">{item.name}</div>
                    <div className="text-[11px] text-brand-400">Seller: {item.vendor?.storeName || 'Vendor'}</div>
                  </div>
                  <div className="font-bold text-slate-200">
                    {item.quantity} x ₹{item.price?.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 gradient-button text-white font-bold py-3.5 rounded-2xl"
          >
            Track Order History
          </button>
          <button
            onClick={() => navigate('/products')}
            className="flex-1 py-3.5 rounded-2xl bg-slate-900 text-slate-300 border border-slate-800 font-bold hover:bg-slate-800"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-brand-400">Multi-Vendor Checkout</span>
        <h1 className="text-3xl font-extrabold text-white">Complete Your Order</h1>
      </div>

      <form onSubmit={handleSubmitCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Form: Shipping Address & Payment */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Address Box */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-white pb-3 border-b border-slate-800">
              <Truck size={20} className="text-brand-400" />
              <span>1. Shipping Address</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-slate-400 font-medium mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={shippingAddress.street}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">City</label>
                <input
                  type="text"
                  required
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">State</label>
                <input
                  type="text"
                  required
                  value={shippingAddress.state}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">PIN / Zip Code</label>
                <input
                  type="text"
                  required
                  value={shippingAddress.zipCode}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, zipCode: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Country</label>
                <input
                  type="text"
                  readOnly
                  value="India"
                  className="w-full bg-slate-950/60 border border-slate-800 text-slate-400 rounded-xl p-3"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Box */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-white pb-3 border-b border-slate-800">
              <CreditCard size={20} className="text-brand-400" />
              <span>2. Payment Option</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {['Card', 'UPI', 'COD'].map((method) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    paymentMethod === method
                      ? 'bg-brand-600/20 text-brand-400 border-brand-500 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-sm">{method === 'Card' ? 'Credit / Debit Card' : method === 'UPI' ? 'Instant UPI' : 'Cash on Delivery'}</div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Summary & ACID Transaction Trigger */}
        <div className="lg:col-span-5">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6 sticky top-28">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Checkout Total</h3>
              <span className="text-xs font-bold text-emerald-400">Atomic Transaction</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal</span>
                <span className="font-bold text-white">₹{cart.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>GST Tax (18%)</span>
                <span className="font-bold text-white">₹{cart.tax.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Shipping</span>
                <span className="font-bold text-emerald-400">
                  {cart.shipping === 0 ? 'FREE' : `₹${cart.shipping}`}
                </span>
              </div>
              <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                <span className="text-base font-bold text-white">Total Amount</span>
                <span className="text-2xl font-black text-brand-400">₹{cart.total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full gradient-button text-white font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-brand-500/25 disabled:opacity-50"
            >
              <Lock size={18} />
              <span>{processing ? 'Running ACID Session Transaction...' : 'Place Order (Commit Transaction)'}</span>
            </button>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="font-bold text-slate-200 flex items-center gap-1">
                <Sparkles size={13} className="text-amber-400" />
                <span>MongoDB ACID Transaction Notice</span>
              </div>
              <p>
                Submitting executes <code className="text-brand-400">session.startTransaction()</code> in Express backend. If any seller stock check fails, all database changes automatically rollback!
              </p>
            </div>
          </div>
        </div>

      </form>

    </div>
  );
};

export default CheckoutPage;
