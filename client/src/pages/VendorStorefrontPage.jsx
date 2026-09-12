import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Store, Star, Award, Package, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import { ProductSkeleton } from '../components/SkeletonLoader';

const VendorStorefrontPage = ({ onToast }) => {
  const { slug } = useParams();

  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStore = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/vendors/store/${slug}`);
        setVendor(data.vendor);
        setProducts(data.products || []);
      } catch (err) {
        console.error('Failed to load store:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStore();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-400">Loading Vendor Storefront...</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Store Not Found</h2>
        <Link to="/vendors" className="gradient-button text-white text-xs font-bold px-6 py-3 rounded-xl inline-block">
          Explore All Vendors
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-16">
      
      {/* Store Banner */}
      <div className="relative h-64 sm:h-80 bg-slate-950 border-b border-slate-800 overflow-hidden">
        <img
          src={vendor.banner || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200'}
          alt={vendor.storeName}
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

        {/* Store Header Floating Content */}
        <div className="absolute bottom-6 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
          <div className="flex items-end gap-5">
            <img
              src={vendor.logo || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200'}
              alt={vendor.storeName}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-slate-950 bg-slate-900 shadow-2xl shrink-0"
            />
            <div className="space-y-1 pb-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[11px] font-bold uppercase tracking-wider">
                <CheckCircle2 size={13} /> Verified ShopSphere Partner
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white">{vendor.storeName}</h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl line-clamp-2">{vendor.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-4 rounded-2xl shrink-0">
            <div>
              <div className="text-xs text-slate-400">Seller Rating</div>
              <div className="text-lg font-bold text-amber-400 flex items-center gap-1">
                <Star size={18} className="fill-amber-400" />
                <span>{vendor.rating || 4.8} / 5.0</span>
              </div>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <div className="text-xs text-slate-400">Listed Products</div>
              <div className="text-lg font-bold text-white">{products.length} Items</div>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor Products Catalog */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Package size={20} className="text-brand-400" />
            <span>Products by {vendor.storeName}</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">All items shipped directly by vendor</span>
        </div>

        {products.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
            This vendor currently has no active product listings.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((prod) => (
              <ProductCard key={prod._id} product={prod} onToast={onToast} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default VendorStorefrontPage;
