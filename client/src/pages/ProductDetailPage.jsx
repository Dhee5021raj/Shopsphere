import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Store, 
  Heart, 
  ShoppingBag, 
  Truck, 
  ShieldCheck, 
  RotateCcw, 
  Star, 
  CheckCircle2, 
  Plus, 
  Minus,
  MessageSquarePlus,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import RatingStars from '../components/RatingStars';
import ProductCard from '../components/ProductCard';

const ProductDetailPage = ({ onToast }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchProductData = async () => {
      setLoading(true);
      try {
        const [prodRes, revRes, relRes] = await Promise.all([
          api.get(`/products/${id}`),
          api.get(`/reviews/product/${id}`),
          api.get(`/products/${id}/related`)
        ]);

        setProduct(prodRes.data);
        setReviews(revRes.data || []);
        setRelatedProducts(relRes.data || []);
      } catch (err) {
        console.error('Failed to load product details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProductData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-400">Loading product specs & seller details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Product Not Found</h2>
        <Link to="/products" className="gradient-button text-white text-xs font-bold px-6 py-3 rounded-xl inline-block">
          Return to Catalog
        </Link>
      </div>
    );
  }

  const isWished = isInWishlist(product._id);
  const effectivePrice = product.discountPrice > 0 ? product.discountPrice : product.price;
  const hasDiscount = product.discountPrice > 0 && product.discountPrice < product.price;

  const handleAddToCart = async () => {
    try {
      await addToCart(product._id, quantity);
      if (onToast) onToast(`Added ${quantity} unit(s) of "${product.name}" to cart!`);
    } catch (err) {
      if (onToast) onToast(err.response?.data?.message || 'Failed to add item', 'error');
    }
  };

  const handleBuyNow = async () => {
    try {
      await addToCart(product._id, quantity);
      navigate('/cart');
    } catch (err) {
      if (onToast) onToast(err.response?.data?.message || 'Failed to process item', 'error');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      if (onToast) onToast('Please sign in to post a review', 'error');
      return;
    }
    setSubmittingReview(true);
    try {
      const { data } = await api.post('/reviews', {
        productId: product._id,
        rating: reviewRating,
        comment: reviewComment
      });
      setReviews([data, ...reviews]);
      setReviewModalOpen(false);
      setReviewComment('');
      if (onToast) onToast('Review posted successfully!');
    } catch (err) {
      if (onToast) onToast(err.response?.data?.message || 'Failed to post review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      
      {/* Product Top Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Image Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="aspect-square w-full rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 relative">
            <img
              src={product.images && product.images[selectedImage] ? product.images[selectedImage] : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {hasDiscount && (
              <span className="absolute top-4 left-4 bg-red-500 text-white font-bold text-xs px-3 py-1.5 rounded-full">
                SALE PRICE
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 ${
                    selectedImage === idx ? 'border-brand-500 scale-95' : 'border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="thumb" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Info Section */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Vendor Card Header */}
          {product.vendor && (
            <Link
              to={`/store/${product.vendor.storeSlug}`}
              className="inline-flex items-center gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-brand-500/50 transition-all"
            >
              <img
                src={product.vendor.logo}
                alt={product.vendor.storeName}
                className="w-10 h-10 rounded-xl object-cover"
              />
              <div>
                <div className="text-xs text-slate-400 font-medium">Sold by Verified Vendor</div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{product.vendor.storeName}</span>
                  <CheckCircle2 size={14} className="text-brand-400" />
                </div>
              </div>
            </Link>
          )}

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              {product.name}
            </h1>
            <div className="mt-3 flex items-center gap-4">
              <RatingStars rating={product.rating} numReviews={product.numReviews} size={18} />
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                {product.stock > 0 ? `${product.stock} units available in stock` : 'Out of stock'}
              </span>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-3xl font-black text-white">
                ₹{effectivePrice.toLocaleString('en-IN')}
              </div>
              {hasDiscount && (
                <div className="text-sm text-slate-400 line-through mt-0.5">
                  Original MRP: ₹{product.price.toLocaleString('en-IN')}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Includes 18% GST</div>
              <div className="text-xs text-brand-400 font-medium mt-0.5">Free Express Shipping</div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</h4>
            <p className="text-sm text-slate-300 leading-relaxed">{product.description}</p>
          </div>

          {/* Quantity Selector & Action Buttons */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-400 uppercase">Quantity:</span>
              <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800">
                <button
                  onClick={() => setQuantity((q) => Math.max(q - 1, 1))}
                  className="p-2.5 text-slate-400 hover:text-white"
                >
                  <Minus size={14} />
                </button>
                <span className="px-4 text-sm font-bold text-white">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(q + 1, product.stock))}
                  className="p-2.5 text-slate-400 hover:text-white"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className="flex-1 gradient-button text-white font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-brand-500/20 disabled:opacity-50"
              >
                <ShoppingBag size={18} />
                <span>Add to Cart</span>
              </button>

              <button
                onClick={handleBuyNow}
                disabled={product.stock <= 0}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <span>Buy Now</span>
              </button>

              <button
                onClick={() => toggleWishlist(product._id)}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isWished
                    ? 'bg-rose-500/20 text-rose-500 border-rose-500/40'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                }`}
                title="Wishlist"
              >
                <Heart size={20} className={isWished ? 'fill-rose-500' : ''} />
              </button>
            </div>
          </div>

          {/* Delivery Guarantees */}
          <div className="grid grid-cols-3 gap-3 pt-4 text-center">
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
              <Truck size={18} className="mx-auto text-brand-400 mb-1" />
              <span className="text-[11px] text-slate-400 block font-medium">Fast Delivery</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
              <ShieldCheck size={18} className="mx-auto text-brand-400 mb-1" />
              <span className="text-[11px] text-slate-400 block font-medium">100% Genuine</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
              <RotateCcw size={18} className="mx-auto text-brand-400 mb-1" />
              <span className="text-[11px] text-slate-400 block font-medium">7 Days Return</span>
            </div>
          </div>

        </div>
      </div>

      {/* REVIEWS & RATINGS SECTION */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-white">Customer Reviews</h2>
            <p className="text-xs text-slate-400 mt-1">Verified buyer ratings & feedback for this product</p>
          </div>

          <button
            onClick={() => setReviewModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-2"
          >
            <MessageSquarePlus size={16} />
            <span>Write a Review</span>
          </button>
        </div>

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No reviews submitted yet. Be the first verified buyer to review this product!
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => (
              <div key={rev._id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={rev.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={rev.user?.name}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-white">{rev.user?.name || 'Verified Customer'}</h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                        <CheckCircle2 size={12} />
                        <span>Verified Purchase</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">{new Date(rev.createdAt).toLocaleDateString()}</span>
                </div>

                <RatingStars rating={rev.rating} size={15} />
                <p className="text-sm text-slate-300 leading-relaxed">{rev.comment}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* RELATED PRODUCTS */}
      {relatedProducts.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Related Products in Category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((prod) => (
              <ProductCard key={prod._id} product={prod} onToast={onToast} />
            ))}
          </div>
        </section>
      )}

      {/* Write Review Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Write a Verified Product Review</h3>
            <p className="text-xs text-slate-400">
              Only verified purchasers who have bought this product on ShopSphere can post reviews.
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Rating</label>
                <RatingStars rating={reviewRating} size={24} interactive onChange={(r) => setReviewRating(r)} />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Your Feedback</label>
                <textarea
                  required
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Describe product performance, build quality, and delivery experience..."
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-2xl p-3 focus:border-brand-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="flex-1 gradient-button text-white text-xs font-bold py-3 rounded-xl"
                >
                  {submittingReview ? 'Submitting...' : 'Post Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductDetailPage;
