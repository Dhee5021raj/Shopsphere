const CategoryCard = ({ category, selectedCategory, onSelectCategory }) => {
  const isSelected = selectedCategory === category._id;

  return (
    <div
      onClick={() => onSelectCategory(category._id)}
      className={`group cursor-pointer relative overflow-hidden rounded-2xl p-4 transition-all duration-300 border ${
        isSelected
          ? 'bg-brand-600/20 border-brand-500 shadow-lg shadow-brand-500/20 ring-1 ring-brand-500'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform overflow-hidden">
          <img
            src={category.image}
            alt={category.name}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-slate-100 truncate group-hover:text-brand-400 transition-colors">
            {category.name}
          </h4>
          <p className="text-xs text-slate-400 truncate">{category.description || 'Explore products'}</p>
        </div>
      </div>
    </div>
  );
};

export default CategoryCard;
