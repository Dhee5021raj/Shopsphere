import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  Store, 
  TrendingUp, 
  ShieldCheck, 
  Truck, 
  RefreshCw, 
  ShoppingBag,
  Award
} from 'lucide-react';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';
import SearchBar from '../components/SearchBar';
import { ProductSkeleton } from '../components/SkeletonLoader';

const HomePage = ({ onToast }) => {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [catRes, featRes, trendRes, vendRes] = await Promise.all([
          api.get('/categories'),
          api.get('/products/featured'),
          api.get('/products/trending'),
          api.get('/vendors')
        ]);

        setCategories(catRes.data || []);
        setFeaturedProducts(featRes.data || []);
        setTrendingProducts(trendRes.data || []);
        setVendors(vendRes.data || []);
      } catch (error) {
        console.error('Failed to load homepage data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearchSubmit = (query) => {
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="space-y-16 pb-16">
      
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-slate-800/60 bg-gradient-to-b from-slate-900/80 via-slate-950 to-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles size={14} className="text-brand-400" />
                <span>Next-Gen Multi-Vendor Marketplace</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
                Shop<span className="gradient-text">Sphere</span>
              </h1>

              <p className="text-xl sm:text-2xl font-bold text-slate-200">
                One Marketplace. <span className="text-brand-400">Endless Possibilities.</span>
              </p>

              <p className="text-slate-400 text-base max-w-2xl leading-relaxed">
                Connect directly with independent artisan sellers, tech labs, and fashion houses worldwide.
                Browse thousands of curated items across top vendors with atomic single-checkout convenience.
              </p>

              {/* Search Bar Container */}
              <div className="pt-2 max-w-xl mx-auto lg:mx-0">
                <SearchBar onSearch={handleSearchSubmit} />
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
                <Link
                  to="/products"
                  className="gradient-button text-white font-bold px-7 py-3.5 rounded-2xl flex items-center gap-2 shadow-xl shadow-brand-500/25"
                >
                  <span>Explore Products</span>
                  <ArrowRight size={18} />
                </Link>

                <Link
                  to="/register-vendor"
                  className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold flex items-center gap-2 transition-all hover:border-slate-700"
                >
                  <Store size={18} className="text-amber-400" />
                  <span>Become a Seller</span>
                </Link>
              </div>

              {/* Platform Trust Badges */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-800/80 max-w-lg mx-auto lg:mx-0">
                <div className="text-center lg:text-left">
                  <div className="text-lg font-bold text-white">5+</div>
                  <div className="text-xs text-slate-400">Active Stores</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-lg font-bold text-white">40+</div>
                  <div className="text-xs text-slate-400">Curated Products</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-lg font-bold text-brand-400">100%</div>
                  <div className="text-xs text-slate-400">ACID Transactions</div>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Cards */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-brand-500 to-purple-600 opacity-30 blur-xl"></div>
                
                <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Featured Marketplace Item</span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
                      Verified Stock
                    </span>
                  </div>

                  <div className="aspect-video rounded-2xl overflow-hidden bg-slate-950">
                    <img
                      src="https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800"
                      alt="Cyber Laptop"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div>
                    <span className="text-xs text-brand-400 font-semibold">Nexus Tech Lab</span>
                    <h3 className="text-lg font-bold text-white">AeroBlade Cyber Gaming Laptop 16 Pro</h3>
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        <span className="text-xl font-extrabold text-white">₹1,69,999</span>
                        <span className="text-xs text-slate-400 line-through ml-2">₹1,85,000</span>
                      </div>
                      <Link
                        to="/products"
                        className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-500 transition-colors"
                      >
                        Buy Now
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CATEGORIES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400">Discover</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Major Categories</h2>
          </div>
          <Link to="/products" className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 mt-2 sm:mt-0">
            <span>View All Categories</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.slice(0, 8).map((cat) => (
            <CategoryCard
              key={cat._id}
              category={cat}
              onSelectCategory={(catId) => navigate(`/products?category=${catId}`)}
            />
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <Award size={14} /> Handpicked Deals
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Featured Marketplace Products</h2>
          </div>
          <Link to="/products?featured=true" className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 mt-2 sm:mt-0">
            <span>Explore Featured</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <ProductSkeleton key={n} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.slice(0, 8).map((prod) => (
              <ProductCard key={prod._id} product={prod} onToast={onToast} />
            ))}
          </div>
        )}
      </section>

      {/* TRENDING PRODUCTS (POWERED BY MONGODB AGGREGATION) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                <TrendingUp size={14} /> Real MongoDB Aggregation Analytics Data
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Trending Products</h2>
            </div>
            <Link to="/products?sort=popularity" className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 mt-2 sm:mt-0">
              <span>View Most Popular</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trendingProducts.slice(0, 4).map((prod) => (
              <ProductCard key={prod._id} product={prod} onToast={onToast} />
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED VENDOR STORES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400">Independent Sellers</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Featured Stores</h2>
          </div>
          <Link to="/vendors" className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 mt-2 sm:mt-0">
            <span>Browse All Stores</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {vendors.slice(0, 3).map((v) => (
            <Link
              key={v._id}
              to={`/store/${v.storeSlug}`}
              className="group bg-slate-900/60 border border-slate-800 hover:border-brand-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl"
            >
              <div className="h-28 bg-slate-950 relative overflow-hidden">
                <img
                  src={v.banner}
                  alt={v.storeName}
                  className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/90 text-amber-400 text-xs font-bold flex items-center gap-1">
                  ★ {v.rating}
                </div>
              </div>
              <div className="p-5 flex items-center gap-4 -mt-6 relative">
                <img
                  src={v.logo}
                  alt={v.storeName}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-900 bg-slate-950 shadow-md"
                />
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-brand-400 transition-colors">
                    {v.storeName}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-1">{v.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* MULTI-VENDOR ADVANTAGE BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-r from-brand-900 via-indigo-950 to-slate-900 p-8 sm:p-12 border border-brand-500/30 overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold uppercase tracking-wider">
              Single Checkout for Multiple Sellers
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Buy from 10 Different Sellers in One Order.
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              ShopSphere automatically segregates your multi-vendor items, runs stock validation inside MongoDB ACID transactions, and coordinates individual vendor order status updates seamlessly.
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <Link
                to="/products"
                className="gradient-button text-white text-xs font-bold px-6 py-3 rounded-xl"
              >
                Start Shopping Now
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
