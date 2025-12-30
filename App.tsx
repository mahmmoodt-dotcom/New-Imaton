
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Language, CartItem, Product, Category, Order, AppSettings, Theme } from './types';
import { translations } from './translations';
// FIX: Updated import to use StorageService instead of ApiService
import { StorageService } from './store';
import { INITIAL_SETTINGS } from './constants';

// FIX: Added missing imports for UI components and pages used in Routes
import Layout from './components/Layout';
import HomePage from './pages/Home';
import ShopPage from './pages/Shop';
import CartPage from './pages/Cart';
import TrackingPage from './pages/Tracking';
import AboutPage from './pages/About';
import AdminLogin from './pages/Admin/Login';
import AdminDashboard from './pages/Admin/Dashboard';
import CategoriesAdmin from './pages/Admin/Categories';
import ProductsAdmin from './pages/Admin/Products';
import OrdersAdmin from './pages/Admin/Orders';
import SettingsAdmin from './pages/Admin/Settings';

// Simple Logger Utility
export const Logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${new Date().toISOString()}: ${msg}`, data || ''),
  error: (msg: string, err?: any) => console.error(`[ERROR] ${new Date().toISOString()}: ${msg}`, err || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${new Date().toISOString()}: ${msg}`, data || ''),
};

interface AppContextType {
  lang: Language;
  setLang: (l: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
  t: any;
  cart: CartItem[];
  addToCart: (p: Product) => void;
  removeFromCart: (pId: string) => void;
  clearCart: () => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (v: boolean) => void;
  settings: AppSettings;
  updateSettings: (s: AppSettings) => void;
  isSyncing: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [lang, setLangState] = useState<Language>('en');
  const [theme, setThemeState] = useState<Theme>('light');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoggedIn, setIsLoggedInState] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [isSyncing, setIsSyncing] = useState(false);

  const t = translations[lang];

  // Initialize App from API
  useEffect(() => {
    const initApp = async () => {
      try {
        Logger.info("Connecting to Imation Cloud...");
        // FIX: Updated to use StorageService
        const [savedAuth, savedSettings] = await Promise.all([
          StorageService.getAuth(),
          StorageService.getSettings()
        ]);
        
        setIsLoggedInState(savedAuth.isLoggedIn);
        setSettings(savedSettings);
        
        // Load UI Prefs
        const savedLang = localStorage.getItem('iq_tech_lang') as Language;
        if (savedLang) setLangState(savedLang);
        
        const savedTheme = localStorage.getItem('iq_tech_theme') as Theme;
        if (savedTheme) setThemeState(savedTheme);

        const savedCart = localStorage.getItem('iq_tech_cart');
        if (savedCart) setCart(JSON.parse(savedCart));

        setLoading(false);
        Logger.info("Cloud synchronization complete.");
      } catch (error) {
        Logger.error("Failed to initialize app from cloud", error);
        setLoading(false);
      }
    };
    initApp();
  }, []);

  useEffect(() => {
    localStorage.setItem('iq_tech_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('iq_tech_theme', theme);
  }, [theme]);

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem('iq_tech_lang', l);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setThemeState(newTheme);
  };

  const setIsLoggedIn = async (v: boolean) => {
    setIsLoggedInState(v);
    // FIX: Updated to use StorageService
    await StorageService.setAuth({ isLoggedIn: v });
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId: product.id, quantity: 1, product }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const updateSettings = async (newSettings: AppSettings) => {
    setIsSyncing(true);
    setSettings(newSettings);
    // FIX: Updated to use StorageService
    await StorageService.saveSettings(newSettings);
    setIsSyncing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f1115] flex flex-col items-center justify-center space-y-8">
        <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-black uppercase tracking-[0.3em] animate-pulse">Imation Cloud Syncing...</p>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ 
      lang, setLang, theme, toggleTheme, t, cart, addToCart, removeFromCart, clearCart, 
      isLoggedIn, setIsLoggedIn, settings, updateSettings, isSyncing
    }}>
      <div 
        dir={lang !== 'en' ? 'rtl' : 'ltr'}
        className={`${lang !== 'en' ? 'rtl font-arabic' : 'font-inter'} transition-colors duration-200`}
      >
        {children}
      </div>
    </AppContext.Provider>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isLoggedIn } = useApp();
  return isLoggedIn ? children : <Navigate to="/admin/login" />;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Layout><HomePage /></Layout>} />
          <Route path="/shop" element={<Layout><ShopPage /></Layout>} />
          <Route path="/cart" element={<Layout><CartPage /></Layout>} />
          <Route path="/tracking" element={<Layout><TrackingPage /></Layout>} />
          <Route path="/about" element={<Layout><AboutPage /></Layout>} />
          
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/categories" element={<ProtectedRoute><CategoriesAdmin /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute><ProductsAdmin /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute><OrdersAdmin /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute><SettingsAdmin /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AppProvider>
  );
};

export default App;
