import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Category, Language, Product } from '../types/store';
import { t } from '../data/translations';
import { SmartImage } from './SmartImage';

interface CategoriesPageProps {
  lang: Language;
  categories: Category[];
  products: Product[];
  onSelectCategory: (categoryId: string) => void;
}

export function CategoriesPage({
  lang,
  categories,
  products,
  onSelectCategory,
}: CategoriesPageProps) {
  const copy = t(lang);
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      <div className="border-b border-[#E2E7E0] pb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#142218]">
          {copy.categoriesSectionTitle}
        </h1>
        <p className="text-sm text-[#526056] mt-1.5">{copy.categoriesSectionSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const itemCount = products.filter((p) => p.categoryId === cat.id).length;
          const title = lang === 'ar' ? cat.nameAr : cat.nameEn;
          const desc = lang === 'ar' ? cat.descriptionAr : cat.descriptionEn;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className="group bg-white border border-[#E2E7E0] rounded-2xl overflow-hidden text-start flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0F5E36]/40 hover:shadow-md cursor-pointer"
            >
              <div className="aspect-[16/10] w-full bg-[#F1F4F0] overflow-hidden">
                <SmartImage
                  src={cat.image}
                  alt={title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-lg font-bold text-[#142218] group-hover:text-[#0F5E36] transition-colors">
                      {title}
                    </h2>
                    <span className="text-xs font-medium text-[#526056] tabular-nums shrink-0">
                      {itemCount} {copy.productsCountSuffix}
                    </span>
                  </div>
                  <p className="text-sm text-[#526056] mt-1.5 leading-relaxed">{desc}</p>
                </div>

                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F5E36] pt-2">
                  <span>{lang === 'ar' ? 'شوف القسم' : 'Browse aisle'}</span>
                  <ArrowIcon className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
