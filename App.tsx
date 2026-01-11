
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Language, CartItem, Product, Category, Order, AppSettings, Theme } from './types';
import { translations } from './translations';
import { StorageService } from './store';

// Adding missing imports for components and pages used in the main App router
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

// Centralized Frontend Logger
export const Logger = {
  info: (msg: string, data?: any) => console.log(`%c[INFO] ${new Date().toLocaleTimeString()}: ${msg}`, 'color: #2563eb', data || ''),
  error: (msg: string, err?: any) => console.error(`%c[ERROR] ${new Date().toLocaleTimeString()}: ${msg}`, 'color: #dc2626', err || ''),
  warn: (msg: string, data?: any) => console.warn(`%c[WARN] ${new Date().toLocaleTimeString()}: ${msg}`, 'color: #d97706', data || ''),
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
  settings: AppSettings | null;
  updateSettings: (s: AppSettings) => void;
  isSyncing: boolean;
  globalError: string | null;
  setGlobalError: (err: string | null) => void;
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
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const t = translations[lang];

  useEffect(() => {
    const initApp = async () => {
      try {
        Logger.info("STRICT_MODE: Initiating Cloud Sync...");
        
        // Hydrate configuration and auth state purely from Supabase
        const [authRes, settingsRes] = await Promise.allSettled([
          StorageService.getAuth(),
          StorageService.getSettings()
        ]);
        
        if (authRes.status === 'fulfilled') {
          setIsLoggedInState(authRes.value.isLoggedIn);
        } else {
          throw new Error("Failed to authenticate with Supabase.");
        }
        
        if (settingsRes.status === 'fulfilled' && settingsRes.value) {
          setSettings(settingsRes.value);
        } else {
          Logger.warn("Supabase Config record 'settings' not found. App running in unconfigured state.");
        }

        Logger.info("STRICT_MODE: Cloud Hydration Success.");
        setLoading(false);
      } catch (error: any) {
        Logger.error("STRICT_MODE_FAILURE: App locked due to cloud connection error.", error);
        setGlobalError(error.message || "Cloud connection failed. Persistence is unavailable.");
        setLoading(false);
      }
    };
    initApp();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const setLang = (l: Language) => setLangState(l);
  const toggleTheme = () => setThemeState(prev => prev === 'light' ? 'dark' : 'light');

  const setIsLoggedIn = async (v: boolean) => {
    setIsLoggedInState(v);
    try {
      await StorageService.setAuth({ isLoggedIn: v });
    } catch (e) {
      Logger.error("Supabase Auth Sync Error", e);
    }
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

  const clearCart = () => setCart([]);

  const updateSettings = async (newSettings: AppSettings) => {
    setIsSyncing(true);
    setGlobalError(null);
    try {
      await StorageService.saveSettings(newSettings);
      setSettings(newSettings);
      Logger.info("STRICT_MODE: Settings committed to Supabase.");
    } catch (e: any) {
      Logger.error("STRICT_MODE_SYNC_FAILURE", e);
      setGlobalError(e.message || "Failed to commit settings to cloud.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f1115] flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-brand/20 rounded-full"></div>
          <div className="absolute inset-0 w-24 h-24 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="mt-8 text-gray-500 font-black uppercase tracking-[0.4em] animate-pulse text-xs">Connecting to Supabase Cloud...</p>
      </div>
    );
  }

  // Mandatory App Lock if no Supabase connection
  if (globalError && !settings) {
    return (
      <div className="min-h-screen bg-brand flex flex-col items-center justify-center p-10 text-white text-center">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-8">
          <span className="text-4xl font-black">!</span>
        </div>
        <h1 className="text-4xl font-black tracking-tighter mb-4">CLOUD_DISCONNECTED</h1>
        <p className="max-w-md font-bold opacity-80 mb-8">{globalError}</p>
        <button onClick={() => window.location.reload()} className="px-10 py-4 bg-white text-brand rounded-full font-black uppercase tracking-widest text-xs active:scale-95 transition-all">Retry Connection</button>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ 
      lang, setLang, theme, toggleTheme, t, cart, addToCart, removeFromCart, clearCart, 
      isLoggedIn, setIsLoggedIn, settings, updateSettings, isSyncing, globalError, setGlobalError
    }}>
      <div 
        dir={lang !== 'en' ? 'rtl' : 'ltr'}
        className={`${lang !== 'en' ? 'rtl font-arabic' : 'font-inter'} transition-colors duration-200 min-h-screen flex flex-col`}
      >
        {globalError && (
          <div className="bg-brand text-white py-3 px-6 text-center font-black text-[10px] uppercase tracking-[0.3em] fixed top-0 w-full z-[1000] flex justify-center items-center gap-6 animate-in slide-in-from-top shadow-xl">
            <span className="flex-grow">{globalError}</span>
            <button onClick={() => setGlobalError(null)} className="px-4 py-1 bg-white/20 rounded-full hover:bg-white/40 transition-all">Dismiss</button>
          </div>
        )}
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
  useEffect(() => window.scrollTo(0, 0), [pathname]);
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
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AppProvider>
  );
};

export default App;
