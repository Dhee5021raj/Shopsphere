import React, { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';

const SearchBar = ({ onSearch, initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-4 text-slate-400" size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products across vendors (e.g. 'Laptop', 'Earbuds', 'Leather', 'Serum')..."
          className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl py-3.5 pl-12 pr-28 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 shadow-xl transition-all"
        />
        <div className="absolute right-2 flex items-center gap-2">
          <button
            type="submit"
            className="gradient-button text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5"
          >
            <Sparkles size={14} />
            <span>Search</span>
          </button>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2 px-3 text-[11px] text-slate-400">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Powered by <strong>MongoDB Text Index</strong> full-text search engine</span>
      </div>
    </form>
  );
};

export default SearchBar;
