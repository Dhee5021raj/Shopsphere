import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingBag, 
  Heart, 
  User, 
  Store, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X, 
  Search, 
  Sparkles,
  ChevronDown,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

const Navbar = ({ onToast }) => {
  const { user, logout, login } = useAuth();
  const { totalItemCount } = useCart();
  const { wishlist } = useWishlist();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleDemoLogin = async (role) => {
    try {
      let data;
      if (role === 'admin') {
        data = await login('admin@shopsphere.com', 'adminpassword123');
        if (onToast) onToast('Logged in as Marketplace Admin!');
        setDemoModalOpen(false);
        navigate('/admin/dashboard');
      } else if (role === 'vendor') {
        data = await login('nexus@vendors.com', 'password123');
        if (onToast) onToast('Logged in as Nexus Tech Lab Vendor!');
        setDemoModalOpen(false);
        navigate('/vendor/dashboard');
      } else if (role === 'customer') {
        data = await login('alex@gmail.com', 'password123');
        if (onToast) onToast('Logged in as Customer (Alex)!');
        setDemoModalOpen(false);
        navigate('/products');
      }
    } catch (err) {
      if (onToast) onToast(err.response?.data?.message || 'Login failed. Run npm run seed first.', 'error');
    }
  };

  // Close modal on Escape key press
  useEffect(() => {
    if (!demoModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setDemoModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [demoModalOpen]);

  return (
    <header className="sticky top-0 z-50 glass-header border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Branding */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl gradient-button flex items-center justify-center text-white font-black text-xl shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
              S
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1">
                Shop<span className="gradient-text">Sphere</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold block -mt-1">
                Multi-Vendor Hub
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link to="/" className={`hover:text-white transition-colors ${location.pathname === '/' ? 'text-brand-400 font-semibold' : ''}`}>
              Home
            </Link>
            <Link to="/products" className={`hover:text-white transition-colors ${location.pathname === '/products' ? 'text-brand-400 font-semibold' : ''}`}>
              Explore Products
            </Link>
            <Link to="/vendors" className={`hover:text-white transition-colors ${location.pathname === '/vendors' ? 'text-brand-400 font-semibold' : ''}`}>
              Stores
            </Link>
          </nav>

          {/* User Action Right Bar */}
          <div className="flex items-center gap-4">
            
            {/* Viva Demo Quick Login Modal Trigger */}
            <button
              onClick={() => setDemoModalOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/20 transition-all"
              title="Quickly switch demo accounts for Viva examination"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>Viva Demo Switcher</span>
            </button>

            {/* Wishlist Icon */}
            <Link
              to="/wishlist"
              className="relative p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              title="Wishlist"
            >
              <Heart size={20} />
              {wishlist.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md shadow-rose-500/30">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* Cart Icon */}
            <Link
              to="/cart"
              className="relative p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              title="Shopping Cart"
            >
              <ShoppingBag size={20} />
              {totalItemCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md shadow-brand-500/40">
                  {totalItemCount}
                </span>
              )}
            </Link>

            {/* User Profile / Auth State */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all"
                >
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={user.name}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                  <span className="text-xs font-semibold text-slate-200 hidden sm:inline-block max-w-[100px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-slate-800">
                      <p className="text-xs text-slate-400">Signed in as</p>
                      <p className="text-sm font-bold text-white truncate">{user.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                        {user.role}
                      </span>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <User size={15} />
                        <span>My Account</span>
                      </Link>

                      {user.role === 'vendor' && (
                        <Link
                          to="/vendor/dashboard"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-amber-300 hover:bg-amber-500/10 transition-colors"
                        >
                          <Store size={15} />
                          <span>Seller Dashboard</span>
                        </Link>
                      )}

                      {user.role === 'admin' && (
                        <Link
                          to="/admin/dashboard"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-rose-300 hover:bg-rose-500/10 transition-colors"
                        >
                          <ShieldCheck size={15} />
                          <span>Admin Control Panel</span>
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-slate-800 pt-1">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                          if (onToast) onToast('Logged out successfully');
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <LogOut size={15} />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-xl transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="gradient-button text-white text-xs font-bold px-4 py-2 rounded-xl"
                >
                  Join Market
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-4 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-slate-200 hover:text-white py-1"
          >
            Home
          </Link>
          <Link
            to="/products"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-slate-200 hover:text-white py-1"
          >
            Explore Products
          </Link>
          <Link
            to="/vendors"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-slate-200 hover:text-white py-1"
          >
            Vendor Stores
          </Link>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setDemoModalOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-semibold"
          >
            <Sparkles size={14} />
            <span>Viva Demo Account Switcher</span>
          </button>
        </div>
      )}

      {/* Viva Demo Account Quick Switcher Modal */}
      {demoModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setDemoModalOpen(false); }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative animate-in zoom-in-95">
            <button
              onClick={() => setDemoModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="text-center space-y-1">
              <div className="inline-flex p-3 rounded-2xl bg-brand-500/10 text-brand-400 mb-2">
                <Layers size={28} />
              </div>
              <h3 className="text-xl font-bold text-white">Viva Quick Login Switcher</h3>
              <p className="text-xs text-slate-400">
                Click any role to test ShopSphere instantly with pre-seeded database accounts.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleDemoLogin('admin')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-left transition-all"
              >
                <div>
                  <h4 className="text-sm font-bold text-rose-300">1. Admin Account</h4>
                  <p className="text-[11px] text-slate-400">admin@shopsphere.com</p>
                </div>
                <span className="text-xs font-bold text-rose-400">Log In →</span>
              </button>

              <button
                onClick={() => handleDemoLogin('vendor')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-left transition-all"
              >
                <div>
                  <h4 className="text-sm font-bold text-amber-300">2. Seller / Vendor Account</h4>
                  <p className="text-[11px] text-slate-400">nexus@vendors.com (Nexus Tech Lab)</p>
                </div>
                <span className="text-xs font-bold text-amber-400">Log In →</span>
              </button>

              <button
                onClick={() => handleDemoLogin('customer')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-left transition-all"
              >
                <div>
                  <h4 className="text-sm font-bold text-emerald-300">3. Customer Account</h4>
                  <p className="text-[11px] text-slate-400">alex@gmail.com (Alex Johnson)</p>
                </div>
                <span className="text-xs font-bold text-emerald-400">Log In →</span>
              </button>
            </div>

            <div className="text-center pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-500">
                Password for all demo accounts: <code className="text-brand-400">password123</code> / <code className="text-brand-400">adminpassword123</code>
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
