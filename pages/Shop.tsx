
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, SlidersHorizontal, ChevronDown, Loader2 } from 'lucide-react';
import { useApp, Logger } from '../App';
import { StorageService } from '../store';
import { ProductCard } from './Home';
import { Category, Product } from '../types';

const ShopPage: React.FC = () => {
  const { t, lang } = useApp();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState<'low' | 'high' | 'newest'>('newest');
  const [discountOnly, setDiscountOnly] = useState(false);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [cats, prods] = await Promise.all([
          StorageService.getCategories(),
          StorageService.getProducts()
        ]);
        setCategories(cats);
        setProducts(prods);
        Logger.info("Shop Page data synced from cloud.");
      } catch (err) {
        Logger.error("Failed to load shop data", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setSelectedCategory(cat);
  }, [searchParams]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = searchQuery === '' || 
        p.name[lang].toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.description[lang].toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const matchesDiscount = !discountOnly || (!!p.discountPrice && p.discountPrice < p.price);
      
      return matchesSearch && matchesCategory && matchesDiscount;
    }).sort((a, b) => {
      if (sortBy === 'low') return (a.discountPrice || a.price) - (b.discountPrice || b.price);
      if (sortBy === 'high') return (b.discountPrice || b.price) - (a.discountPrice || a.price);
      return b.createdAt - a.createdAt;
    });
  }, [products, searchQuery, selectedCategory, discountOnly, sortBy, lang]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center app-container">
        <Loader2 className="animate-spin text-brand" size={40} />
      </div>
    );
  }

  return (
    <div className="app-container transition-colors duration-500 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Sidebar */}
          <aside className="w-full lg:w-80 space-y-8 flex-shrink-0">
            <div className="windowy-glass p-8 rounded-[3.5rem] shadow-none">
              <h3 className="text-xl font-black mb-8 flex items-center gap-3 dark:text-white tracking-tight">
                <Filter size={20} className="text-brand" />
                {t.categories}
              </h3>
              <div className="space-y-2">
                <button 
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-6 py-4 rounded-2xl transition-all font-bold ${
                    selectedCategory === 'all' 
                      ? 'bg-brand text-white shadow-xl shadow-brand/20' 
                      : 'hover:bg-brand/5 dark:text-gray-300'
                  }`}
                >
                  {t.allProducts}
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left px-6 py-4 rounded-2xl transition-all font-bold ${
                      selectedCategory === cat.id 
                        ? 'bg-brand text-white shadow-xl shadow-brand/20' 
                        : 'hover:bg-brand/5 dark:text-gray-300'
                    }`}
                  >
                    {cat.name[lang]}
                  </button>
                ))}
              </div>
            </div>

            <div className="windowy-glass p-8 rounded-[3.5rem] shadow-none">
              <h3 className="text-xl font-black mb-6 dark:text-white tracking-tight">{t.specialDeals}</h3>
              <label className="flex items-center gap-4 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    checked={discountOnly}
                    onChange={() => setDiscountOnly(!discountOnly)}
                    className="sr-only"
                  />
                  <div className={`w-12 h-6 rounded-full transition-colors ${discountOnly ? 'bg-brand' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                  <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${discountOnly ? 'translate-x-6' : ''}`}></div>
                </div>
                <span className="font-bold text-gray-500 group-hover:text-brand transition-colors">
                  {t.discountedOnly}
                </span>
              </label>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-grow space-y-12">
            <div className="flex flex-col sm:flex-row gap-6 justify-between items-center">
              {/* Search */}
              <div className="relative w-full max-w-lg">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-brand" size={20} />
                <input 
                  type="text"
                  placeholder={t.search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-16 pr-8 py-5 windowy-glass rounded-[2.5rem] focus:ring-2 focus:ring-brand outline-none dark:text-white font-bold transition-all shadow-none"
                />
              </div>

              {/* Sorting */}
              <div className="relative group w-full sm:w-auto">
                <button className="w-full flex items-center justify-between gap-6 px-10 py-5 windowy-glass rounded-[2.5rem] font-black hover:bg-white/40 dark:hover:bg-white/5 transition-all shadow-none">
                  <div className="flex items-center gap-3">
                    <SlidersHorizontal size={20} className="text-brand" />
                    <span>{t.sortBy}</span>
                  </div>
                  <ChevronDown size={16} />
                </button>
                <div className="absolute right-0 mt-3 w-64 windowy-glass rounded-[2.5rem] shadow-2xl border-white/5 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-20 overflow-hidden">
                  <button onClick={() => setSortBy('newest')} className={`w-full text-left px-8 py-5 hover:bg-brand/10 transition-colors font-bold ${sortBy === 'newest' ? 'text-brand' : ''}`}>{t.newestFirst}</button>
                  <button onClick={() => setSortBy('low')} className={`w-full text-left px-8 py-5 hover:bg-brand/10 transition-colors font-bold ${sortBy === 'low' ? 'text-brand' : ''}`}>{t.lowToHigh}</button>
                  <button onClick={() => setSortBy('high')} className={`w-full text-left px-8 py-5 hover:bg-brand/10 transition-colors font-bold ${sortBy === 'high' ? 'text-brand' : ''}`}>{t.highToLow}</button>
                </div>
              </div>
            </div>

            {/* Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="py-40 text-center windowy-glass rounded-[4rem] border-2 border-dashed border-gray-200 dark:border-gray-800 shadow-none">
                <div className="w-24 h-24 bg-brand/5 rounded-full flex items-center justify-center mx-auto mb-8 text-brand">
                  <Search size={40} />
                </div>
                <p className="text-gray-500 font-black text-2xl mb-4">{t.noProductsFound}</p>
                <button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setDiscountOnly(false); }} className="text-brand font-black hover:underline uppercase tracking-widest text-xs">{t.clearFilters}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;
