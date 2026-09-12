import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, ArrowRight } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import ProductCard from '../components/ProductCard';

const WishlistPage = ({ onToast }) => {
  const { wishlist, loading } = useWishlist();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-400">Loading your saved wishlist...</p>
        </div>
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 text-rose-400 flex items-center justify-center mx-auto">
          <Heart size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white">Your Wishlist is Empty</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Save items you love by clicking the heart icon on any product card while browsing.
          </p>
        </div>
        <Link to="/products" className="gradient-button text-white font-bold px-8 py-3.5 rounded-2xl inline-flex items-center gap-2">
          <span>Explore Products</span>
          <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Saved Items</span>
        <h1 className="text-3xl font-extrabold text-white">My Wishlist ({wishlist.length})</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {wishlist.map((prod) => (
          <ProductCard key={prod._id || prod} product={prod} onToast={onToast} />
        ))}
      </div>
    </div>
  );
};

export default WishlistPage;
