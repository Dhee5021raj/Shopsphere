import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Store, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import RatingStars from './RatingStars';

const ProductCard = ({ product, onToast }) => {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [adding, setAdding] = useState(false);

  const isWished = isInWishlist(product._id);
  const effectivePrice = product.discountPrice > 0 ? product.discountPrice : product.price;
  const hasDiscount = product.discountPrice > 0 && product.discountPrice < product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setAdding(true);
      await addToCart(product._id, 1);
      if (onToast) onToast(`Added "${product.name}" to cart!`);
    } catch (err) {
      if (onToast) onToast(err.response?.data?.message || 'Failed to add item', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const success = await toggleWishlist(product._id);
    if (success && onToast) {
      onToast(isWished ? 'Removed from wishlist' : 'Added to wishlist');
    }
  };

  return (
    <div className="group relative bg-slate-900/60 border border-slate-800 hover:border-brand-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-brand-500/10 flex flex-col justify-between">
      {/* Top Media Container */}
      <div className="relative aspect-square w-full bg-slate-950 overflow-hidden">
        <Link to={`/products/${product._id}`}>
          <img
            src={product.images && product.images[0] ? product.images[0] : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'}
            alt={product.name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
        </Link>

        {/* Discount Badge */}
        {hasDiscount && (
          <span className="absolute top-3 left-3 bg-red-500/90 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
            -{discountPercent}% OFF
          </span>
        )}

        {/* Wishlist Button */}
        <button
          onClick={handleToggleWishlist}
          className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md transition-all ${
            isWished
              ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40 scale-110'
              : 'bg-slate-900/60 text-slate-300 hover:text-white border border-white/10 hover:bg-slate-900'
          }`}
          title={isWished ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart size={18} className={isWished ? 'fill-rose-500' : ''} />
        </button>

        {/* Out of stock overlay */}
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
            <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Content Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Vendor Tag */}
          {product.vendor && (
            <Link
              to={`/store/${product.vendor.storeSlug || ''}`}
              className="inline-flex items-center gap-1.5 text-xs text-brand-400 font-medium hover:text-brand-300 mb-1.5 transition-colors"
            >
              <Store size={13} />
              <span>{product.vendor.storeName || 'Verified Seller'}</span>
            </Link>
          )}

          {/* Title */}
          <Link to={`/products/${product._id}`}>
            <h3 className="text-slate-100 font-semibold text-base line-clamp-2 hover:text-brand-400 transition-colors mb-2">
              {product.name}
            </h3>
          </Link>
        </div>

        {/* Rating & Stock */}
        <div className="mt-2">
          <div className="flex items-center justify-between gap-2 mb-3">
            <RatingStars rating={product.rating} numReviews={product.numReviews} size={14} />
            {product.stock > 0 && product.stock <= 5 && (
              <span className="text-[11px] text-amber-400 font-medium">
                Only {product.stock} left!
              </span>
            )}
          </div>

          {/* Pricing & Add to Cart */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
            <div>
              <div className="text-lg font-bold text-white">
                ₹{effectivePrice.toLocaleString('en-IN')}
              </div>
              {hasDiscount && (
                <div className="text-xs text-slate-400 line-through">
                  ₹{product.price.toLocaleString('en-IN')}
                </div>
              )}
            </div>

            <button
              onClick={handleAddToCart}
              disabled={product.stock <= 0 || adding}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                product.stock <= 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20 active:scale-95'
              }`}
            >
              <ShoppingBag size={15} />
              <span>{adding ? 'Adding...' : 'Add'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
