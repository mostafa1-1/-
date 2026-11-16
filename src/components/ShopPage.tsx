import { RotateCcw, Search } from 'lucide-react';
import type { Category, Language, Product, ProductSortOption } from '../types/store';
import { t } from '../data/translations';
import { filterAndSortProducts } from '../utils/storeLogic';
import { ProductCard } from './ProductCard';

interface ShopPageProps {
  lang: Language;
  categories: Category[];
  products: Product[];
  searchQuery: string;
  selectedCategoryId: string | null;
  onlyDiscounted: boolean;
  onlyAvailable: boolean;
  sortBy: ProductSortOption;
  onSearchChange: (q: string) => void;
  onCategoryChange: (categoryId: string | null) => void;
  onToggleDiscounted: (val: boolean) => void;
  onToggleAvailable: (val: boolean) => void;
  onSortChange: (sort: ProductSortOption) => void;
  onResetFilters: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onOpenProduct: (productId: string) => void;
  isOffersView?: boolean;
}

export function ShopPage({
  lang,
  categories,
  products,
  searchQuery,
  selectedCategoryId,
  onlyDiscounted,
  onlyAvailable,
  sortBy,
  onSearchChange,
  onCategoryChange,
  onToggleDiscounted,
  onToggleAvailable,
  onSortChange,
  onResetFilters,
  onAddToCart,
  onOpenProduct,
  isOffersView = false,
}: ShopPageProps) {
  const copy = t(lang);
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const filtered = filterAndSortProducts(products, {
    query: searchQuery,
    categoryId: selectedCategoryId,
    onlyDiscounted: isOffersView ? true : onlyDiscounted,
    onlyAvailable,
    sortBy,
  });

  const activeCategory = selectedCategoryId ? categoryMap.get(selectedCategoryId) : null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      {/* Page Header */}
      <div className="border-b border-[#E2E7E0] pb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#142218]">
          {isOffersView
            ? copy.browseOffers
            : activeCategory
            ? lang === 'ar'
              ? activeCategory.nameAr
              : activeCategory.nameEn
            : copy.shopTitle}
        </h1>
        <p className="text-sm text-[#526056] mt-1.5">
          {activeCategory
            ? lang === 'ar'
              ? activeCategory.descriptionAr
              : activeCategory.descriptionEn
            : copy.shopSubtitle}
        </p>
      </div>

      {/* Controls Bar: Search, Sort & Toggles */}
      <div className="bg-white border border-[#E2E7E0] rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-6 relative">
            <label htmlFor="shop-search" className="sr-only">
              {copy.searchPlaceholder}
            </label>
            <Search
              className="w-4 h-4 text-[#526056] absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="shop-search"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={copy.searchPlaceholder}
              className="w-full h-11 ps-10 pe-4 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm text-[#142218] placeholder:text-[#728075] focus:outline-none focus:border-[#0F5E36]"
            />
          </div>

          {/* Sort Select */}
          <div className="md:col-span-3">
            <label htmlFor="shop-sort" className="sr-only">
              {copy.sortFeatured}
            </label>
            <select
              id="shop-sort"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as ProductSortOption)}
              className="w-full h-11 px-3 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm text-[#142218] focus:outline-none focus:border-[#0F5E36] cursor-pointer"
            >
              <option value="featured">{copy.sortFeatured}</option>
              <option value="bestsellers">{copy.sortBestsellers}</option>
              <option value="price-asc">{copy.sortPriceAsc}</option>
              <option value="price-desc">{copy.sortPriceDesc}</option>
              <option value="newest">{copy.sortNewest}</option>
            </select>
          </div>

          {/* Quick Checkboxes */}
          <div className="md:col-span-3 flex items-center gap-4 px-2">
            {!isOffersView && (
              <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-[#142218] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyDiscounted}
                  onChange={(e) => onToggleDiscounted(e.target.checked)}
                  className="w-4 h-4 accent-[#0F5E36] rounded"
                />
                <span>{copy.onlyDiscounts}</span>
              </label>
            )}
            <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-[#142218] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => onToggleAvailable(e.target.checked)}
                className="w-4 h-4 accent-[#0F5E36] rounded"
              />
              <span>{copy.onlyAvailable}</span>
            </label>
          </div>
        </div>

        {/* Category Segmented Filter Buttons */}
        <div
          role="group"
          aria-label={copy.categoriesSectionTitle}
          className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#EEF2ED]"
        >
          <button
            type="button"
            onClick={() => onCategoryChange(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategoryId === null
                ? 'bg-[#0F5E36] text-white'
                : 'bg-[#F1F4F0] text-[#3D4B41] hover:bg-[#E4EAE2]'
            }`}
          >
            {copy.allCategories}
          </button>
          {categories.map((cat) => {
            const active = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#0F5E36] text-white'
                    : 'bg-[#F1F4F0] text-[#3D4B41] hover:bg-[#E4EAE2]'
                }`}
              >
                {lang === 'ar' ? cat.nameAr : cat.nameEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-[#526056]">
        <span className="tabular-nums">
          <strong className="text-[#142218]">{filtered.length}</strong> {copy.resultsCount}
        </span>
        {(searchQuery || selectedCategoryId || onlyDiscounted || onlyAvailable) && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 text-[#0F5E36] font-semibold hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{copy.resetFilters}</span>
          </button>
        )}
      </div>

      {/* Products Grid or Empty State */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E2E7E0] rounded-2xl p-12 text-center space-y-3">
          <h2 className="font-display text-xl font-bold text-[#142218]">
            {copy.noResultsTitle}
          </h2>
          <p className="text-sm text-[#526056] max-w-md mx-auto">{copy.noResultsDesc}</p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onResetFilters}
              className="px-5 py-2.5 rounded-lg bg-[#0F5E36] hover:bg-[#0B4A2A] text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {copy.resetFilters}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              category={categoryMap.get(product.categoryId)}
              lang={lang}
              onAddToCart={onAddToCart}
              onOpenProduct={onOpenProduct}
            />
          ))}
        </div>
      )}
    </section>
  );
}
