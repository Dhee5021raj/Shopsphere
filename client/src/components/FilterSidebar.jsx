import React from 'react';
import { Filter, RotateCcw, Check, Star } from 'lucide-react';

const FilterSidebar = ({
  categories = [],
  vendors = [],
  filters,
  onFilterChange,
  onResetFilters
}) => {
  return (
    <aside className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
          <Filter size={18} className="text-brand-400" />
          <span>Refine Products</span>
        </div>
        <button
          onClick={onResetFilters}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-400 transition-colors"
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>
      </div>

      {/* Category Filter */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Category
        </h4>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          <button
            onClick={() => onFilterChange('category', 'all')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
              filters.category === 'all'
                ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                : 'text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <span>All Categories</span>
            {filters.category === 'all' && <Check size={14} />}
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => onFilterChange('category', cat._id)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                filters.category === cat._id
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <span>{cat.name}</span>
              {filters.category === cat._id && <Check size={14} />}
            </button>
          ))}
        </div>
      </div>

      {/* Vendor Filter */}
      {vendors.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Seller Store
          </h4>
          <select
            value={filters.vendor}
            onChange={(e) => onFilterChange('vendor', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-2.5 focus:border-brand-500 focus:outline-none"
          >
            <option value="">All Sellers</option>
            {vendors.map((v) => (
              <option key={v._id} value={v._id}>
                {v.storeName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Price Range Filter */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Price Range (₹)
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => onFilterChange('minPrice', e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-2.5 focus:border-brand-500 focus:outline-none"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => onFilterChange('maxPrice', e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-2.5 focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Rating Filter */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Minimum Rating
        </h4>
        <div className="space-y-1.5">
          {[4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => onFilterChange('minRating', filters.minRating === String(star) ? '' : String(star))}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                filters.minRating === String(star)
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="font-semibold">{star}</span>
                <Star size={13} className="fill-amber-400 text-amber-400" />
                <span>& above</span>
              </div>
              {filters.minRating === String(star) && <Check size={14} />}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Filter */}
      <div className="pt-2 border-t border-slate-800">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs font-semibold text-slate-300">In Stock Only</span>
          <input
            type="checkbox"
            checked={filters.inStock === 'true'}
            onChange={(e) => onFilterChange('inStock', e.target.checked ? 'true' : 'false')}
            className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-brand-600 focus:ring-brand-500"
          />
        </label>
      </div>
    </aside>
  );
};

export default FilterSidebar;
