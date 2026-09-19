
import React, { useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, ShieldCheck, Truck, Loader2 } from 'lucide-react';
import { useApp, Logger } from '../App';
import { StorageService } from '../store';
import { Category, Product } from '../types';

const HomePage: React.FC = () => {
  const { t, lang, settings, addToCart } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [cats, prods] = await Promise.all([
          StorageService.getCategories(),
          StorageService.getProducts()
        ]);
        
        setCategories(cats.slice(0, 12));
        setFeaturedProducts(prods.filter(p => p.isAvailable).slice(0, 12));
        
        Logger.info("UI Render Success: Home Page data synced from Imation Cloud.");
      } catch (e) {
        Logger.error("Failed to load data on Home Page", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0f1115]">
        <Loader2 className="animate-spin text-brand" size={40} />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#0f1115] transition-colors duration-700">
      {/* Hero Section */}
      <section className="relative pt-10 pb-16 lg:pt-20 lg:pb-24 overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-brand/5 rounded-full blur-[140px] -ml-64 animate-float opacity-40 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-brand/10 rounded-full blur-[120px] -mr-64 animate-float opacity-30 pointer-events-none" style={{ animationDelay: '3s' }}></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="flex flex-col animate-text-entrance">
              <div className="mb-10 flex justify-start">
                <div className="p-4 windowy-glass rounded-[2rem] border-white/20 animate-logo-pulse">
                  <img
                    src={settings.logo}
                    alt="Imation Logo"
                    className="h-12 lg:h-16 w-auto object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-gray-900 dark:text-white">
                  High <br />
                  Performance <br />
                  <span className="text-brand">Tech</span>
                </h1>
                <p className="text-xl text-gray-500 dark:text-gray-400 max-w-lg leading-relaxed font-medium">
                  {t.welcomeDesc}
                </p>
              </div>
              
              <div className="flex flex-wrap gap-5 pt-12">
                <Link to="/shop" className="px-12 py-6 bg-brand hover:bg-brand-dark text-white rounded-[2.5rem] font-black shadow-2xl shadow-brand/30 transition-all flex items-center gap-3 group active:scale-95">
                  <span>{t.shop}</span>
                  <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                </Link>
                <Link to="/about" className="px-12 py-6 windowy-glass text-gray-900 dark:text-white rounded-[2.5rem] font-black hover:bg-white/60 dark:hover:bg-white/10 transition-all active:scale-95 border-white/20">
                  {t.about}
                </Link>
              </div>
            </div>

            <div className="relative group animate-hero-entrance">
              <div className="relative z-10 w-full rounded-[4rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] transition-transform duration-1000 group-hover:scale-[1.01] border-[10px] border-white/40 dark:border-white/5">
                <img 
                  src={settings.heroImage} 
                  alt="Modern Tech" 
                  className="w-full aspect-[4/3] object-cover transition-transform duration-1000 group-hover:scale-105"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://images.unsplash.com/photo-1547082299-de196ea013d6?q=80&w=1200";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="relative py-20 overflow-hidden bg-gray-50/50 dark:bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col items-center text-center mb-16 space-y-3">
            <h2 className="text-5xl font-black text-gray-900 dark:text-white tracking-tight">{t.categories}</h2>
            <div className="w-20 h-1.5 bg-brand rounded-full"></div>
            <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-xs pt-2">Explore our premium selection</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {categories.map((cat) => (
              <Link 
                key={cat.id} 
                to={`/shop?category=${cat.id}`}
                className="group relative h-96 rounded-[3.5rem] overflow-hidden windowy-glass border-white/30 dark:border-white/10 hover:shadow-2xl transition-all duration-700 hover:-translate-y-2 active:scale-98"
              >
                <img 
                  src={cat.image} 
                  alt={cat.name[lang]} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-95 group-hover:opacity-100" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                <div className="absolute bottom-12 left-12 right-12">
                  <h3 className="text-white text-4xl font-black mb-3 tracking-tight">{cat.name[lang]}</h3>
                  <div className="inline-flex items-center text-white/60 font-black text-xs uppercase tracking-widest group-hover:text-white transition-colors">
                    <span>Explore Collection</span>
                    <ArrowRight size={16} className="ml-2 group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col sm:flex-row justify-between items-end mb-20 gap-8">
          <div className="space-y-2">
            <h2 className="text-6xl font-black text-gray-900 dark:text-white tracking-tighter">{t.allProducts}</h2>
            <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-xs">Curated for top performance</p>
          </div>
          <Link to="/shop" className="group flex items-center gap-4 text-brand font-black px-10 py-5 windowy-glass rounded-[2rem] transition-all border-white/20 active:scale-95">
            <span>View Catalog</span>
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative py-12 bg-brand/[0.02] dark:bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <StatFeature 
              icon={<Truck size={36} />} 
              title="Fast Delivery" 
              desc="To all Iraq cities within 24-48h." 
              color="text-brand" 
            />
            <StatFeature 
              icon={<ShieldCheck size={36} />} 
              title="Iraqi Warranty" 
              desc="100% genuine products only." 
              color="text-green-600" 
            />
            <StatFeature 
              icon={<ShoppingBag size={36} />} 
              title="Easy COD" 
              desc="Pay when you receive items." 
              color="text-orange-600" 
            />
          </div>
        </div>
      </section>
    </div>
  );
};

const StatFeature: React.FC<{ icon: React.ReactNode, title: string, desc: string, color: string }> = ({ icon, title, desc, color }) => (
  <div className="p-14 windowy-glass rounded-[4rem] flex flex-col items-center text-center space-y-8 border-white/40 dark:border-white/10 hover:shadow-2xl transition-all duration-700 hover:-translate-y-3 group">
    <div className={`p-8 bg-white dark:bg-gray-800 rounded-[3rem] ${color} transition-transform group-hover:scale-110 shadow-xl ring-1 ring-black/5`}>
      {icon}
    </div>
    <div className="space-y-2">
      <h3 className="font-black text-3xl text-gray-900 dark:text-white tracking-tight">{title}</h3>
      <p className="text-gray-500 text-sm font-bold leading-relaxed">{desc}</p>
    </div>
  </div>
);

export const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { addToCart, lang, t } = useApp();
  const isDiscounted = product.discountPrice && product.discountPrice < product.price;

  return (
    <div className="windowy-glass rounded-[4rem] overflow-hidden group hover:shadow-2xl transition-all duration-700 border-white/50 dark:border-white/10 flex flex-col h-full hover:-translate-y-2">
      <div className="relative h-96 overflow-hidden bg-gray-50 dark:bg-gray-900/50">
        <img 
          src={product.image} 
          alt={product.name[lang]} 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
        />
        {isDiscounted && (
          <div className="absolute top-10 left-10 bg-brand text-white text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-widest shadow-2xl animate-neon-shimmer">
            Sale Event
          </div>
        )}
        {!product.isAvailable && (
          <div className="absolute inset-0 bg-white/60 dark:bg-black/80 flex items-center justify-center backdrop-blur-[12px] z-10">
            <span className="bg-gray-900 text-white px-10 py-5 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl">{t.outOfStock}</span>
          </div>
        )}
      </div>
      <div className="p-12 flex-grow flex flex-col space-y-8">
        <div className="h-28 space-y-3">
          <h3 className="font-black text-3xl line-clamp-1 text-gray-900 dark:text-white tracking-tight">{product.name[lang]}</h3>
          <p className="text-gray-500 text-sm font-bold line-clamp-2 leading-relaxed opacity-80">{product.description[lang]}</p>
        </div>
        <div className="mt-auto flex items-center justify-between pt-10 border-t border-gray-100 dark:border-white/5 transition-colors">
          <div className="flex flex-col">
            {isDiscounted ? (
              <>
                <span className="text-brand font-black text-4xl tracking-tighter">{product.discountPrice?.toLocaleString()} <small className="text-xs font-bold uppercase ml-1 opacity-60">IQD</small></span>
                <span className="text-gray-400 text-xs font-bold line-through ml-1">{product.price.toLocaleString()} IQD</span>
              </>
            ) : (
              <span className="text-gray-900 dark:text-white font-black text-4xl tracking-tighter">{product.price.toLocaleString()} <small className="text-xs font-bold uppercase ml-1 opacity-60">IQD</small></span>
            )}
          </div>
          <button 
            disabled={!product.isAvailable}
            onClick={() => addToCart(product)}
            className="p-7 bg-brand hover:bg-brand-dark disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-[2.5rem] shadow-2xl shadow-brand/40 transition-all active:scale-90"
            aria-label="Add to cart"
          >
            <ShoppingBag size={32} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
