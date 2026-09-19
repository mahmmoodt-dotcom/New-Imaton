
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, Globe, User, Package, HelpCircle, Home, Search, Instagram, Facebook, Phone, Moon, Sun, Cloud, CloudOff } from 'lucide-react';
import { useApp, Logger } from '../App';
import { Language } from '../types';

const TikTokIcon = ({ size = 20 }: { size?: number }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="currentColor"
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.13-1.47-1.24-.87-2.21-2.12-2.68-3.47-.04 1.39-.01 2.78-.02 4.17v6.64c.03 1.17-.34 2.35-1.03 3.32-.69.97-1.72 1.72-2.88 2.05-1.16.33-2.42.34-3.56-.03-1.14-.37-2.09-1.2-2.66-2.22-.57-1.02-.75-2.23-.52-3.39.23-1.16.89-2.18 1.83-2.89.94-.71 2.15-1.07 3.33-1.01.27.01.54.04.8.08v4.02c-.31-.13-.65-.18-.99-.17-1.33.02-2.5.89-2.92 2.15-.42 1.26-.06 2.71.93 3.59 1 1 2.76 1 3.75 0 .99-.99 1.12-2.56.28-3.69V.02z"/>
  </svg>
);

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { lang, setLang, theme, toggleTheme, t, cart, settings, globalError, isSyncing } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const navLinks = [
    { name: t.home, path: '/', icon: <Home size={18} /> },
    { name: t.shop, path: '/shop', icon: <Package size={18} /> },
    { name: t.tracking, path: '/tracking', icon: <Search size={18} /> },
    { name: t.about, path: '/about', icon: <HelpCircle size={18} /> },
  ];

  useEffect(() => {
    setMobileMenuOpen(false);
    setLangMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        if (langMenuOpen) {
          setLangMenuOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [langMenuOpen]);

  const handleLanguageSelect = (newLang: Language) => {
    try {
      setLang(newLang);
      setLangMenuOpen(false);
    } catch (error) {
      Logger.error(`Failed to change language to ${newLang}`, error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col app-container transition-colors duration-500">
      {/* Navigation - iPhone Windowy Transparency */}
      <nav className="sticky top-0 z-[100] windowy-glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-18 items-center py-2">
            <Link to="/" className="flex items-center group">
              <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-brand to-brand-dark tracking-tighter">
                Imation
              </span>
              <div className="ml-3 hidden sm:flex items-center">
                {isSyncing ? (
                  <div className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse shadow-[0_0_8px_rgba(227,27,35,1)]"></div>
                ) : globalError ? (
                  <CloudOff size={12} className="text-gray-400" />
                ) : (
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,1)]"></div>
                )}
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link 
                  key={link.path} 
                  to={link.path} 
                  className={`flex items-center gap-1 font-bold transition-all relative py-2 ${
                    location.pathname === link.path ? 'text-brand' : 'text-gray-600 dark:text-gray-300 hover:text-brand'
                  }`}
                >
                  <span>{link.name}</span>
                  {location.pathname === link.path && (
                    <span className="absolute bottom-0 inset-x-0 h-0.5 bg-brand rounded-full"></span>
                  )}
                </Link>
              ))}
            </div>

            {/* Action Icons */}
            <div className="flex items-center gap-2 sm:gap-4">
              <button 
                onClick={toggleTheme}
                className="p-3 hover:bg-white/20 dark:hover:bg-white/10 rounded-2xl transition-all text-gray-600 dark:text-gray-300 active:scale-90"
                aria-label="Toggle Theme"
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>

              <div className="relative" ref={langRef}>
                <button 
                  onClick={() => setLangMenuOpen(!langMenuOpen)}
                  className={`p-3 hover:bg-white/20 dark:hover:bg-white/10 rounded-2xl transition-all flex items-center gap-2 text-gray-600 dark:text-gray-300 active:scale-90 ${langMenuOpen ? 'bg-white/20' : ''}`}
                >
                  <Globe size={20} />
                  <span className="text-xs uppercase font-black hidden sm:inline">{lang}</span>
                </button>
                <div 
                  className={`absolute right-0 mt-3 w-44 windowy-glass rounded-[2rem] shadow-2xl transition-all z-[60] overflow-hidden ${
                    langMenuOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2'
                  }`}
                >
                  {['en', 'ar', 'ku'].map((l) => (
                    <button 
                      key={l}
                      onClick={() => handleLanguageSelect(l as Language)} 
                      className={`w-full px-6 py-4 text-left hover:bg-brand/10 transition-colors font-bold ${lang === l ? 'text-brand' : ''} ${l !== 'en' ? 'text-right' : ''}`}
                    >
                      {l === 'en' ? 'English' : l === 'ar' ? 'العربية' : 'کوردی'}
                    </button>
                  ))}
                </div>
              </div>

              <Link to="/cart" className="p-3 hover:bg-white/20 dark:hover:bg-white/10 rounded-2xl transition-all relative text-gray-600 dark:text-gray-300 active:scale-90">
                <ShoppingCart size={20} />
                {cart.length > 0 && (
                  <span className="absolute top-1 right-1 bg-brand text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black shadow-md border-2 border-white dark:border-gray-900">
                    {cart.reduce((acc, curr) => acc + curr.quantity, 0)}
                  </span>
                )}
              </Link>

              <Link to="/admin" className="p-3 hover:bg-white/20 dark:hover:bg-white/10 rounded-2xl transition-all text-gray-600 dark:text-gray-300 active:scale-90">
                <User size={20} />
              </Link>

              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-3 hover:bg-white/20 dark:hover:bg-white/10 rounded-2xl text-gray-600 dark:text-gray-300 transition-all active:scale-95"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden windowy-glass border-t border-white/5 transition-all animate-in slide-in-from-top duration-300">
            <div className="px-4 py-6 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`block px-6 py-4 rounded-2xl text-base font-bold transition-all ${
                    location.pathname === link.path ? 'bg-brand/10 text-brand' : 'text-gray-700 dark:text-gray-200 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {link.icon}
                    <span>{link.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="app-container border-t border-gray-100 dark:border-gray-800 pt-8 pb-6 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2 space-y-6">
              <Link to="/" className="flex items-center gap-2">
                <span className="text-2xl font-black dark:text-white tracking-tighter">IMATION</span>
              </Link>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm font-medium leading-relaxed">
                {settings?.aboutText[lang] || 'Imation Iraq - Premium Tech Provider'}
              </p>
            </div>
            
            <div className="space-y-6">
              <h4 className="font-black dark:text-white uppercase tracking-widest text-xs opacity-50">{t.about}</h4>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400 font-bold">
                {settings?.phone1 && <li className="flex items-center gap-3"><Phone size={14} className="text-brand"/> {settings.phone1}</li>}
                {settings?.phone2 && <li className="flex items-center gap-3"><Phone size={14} className="text-brand"/> {settings.phone2}</li>}
                <li><Link to="/about" className="hover:text-brand transition-colors">{t.about}</Link></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="font-black dark:text-white uppercase tracking-widest text-xs opacity-50">{t.followUs}</h4>
              <div className="flex gap-3">
                {settings && [
                  { url: settings.instagram, icon: <Instagram size={20} /> },
                  { url: settings.facebook, icon: <Facebook size={20} /> },
                  { url: settings.tiktok, icon: <TikTokIcon size={20} /> },
                ].filter(s => s.url).map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="p-4 windowy-glass rounded-2xl hover:scale-110 hover:text-brand transition-all active:scale-95 shadow-none">
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 text-center text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">
            &copy; {new Date().getFullYear()} Imation Iraq. Designed for Performance.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
