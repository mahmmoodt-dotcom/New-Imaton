import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Language, CartItem, Product, Category, Order, AppSettings, Theme } from './types';
import { translations } from './translations';
import { StorageService } from './store';

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

// Small per-viewer conveniences only — never anything the server needs back.
const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // private browsing / storage disabled — the app still works, it just
      // won't remember the choice across a refresh.
    }
  },
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
  pendingOrders: number;
  weakPassword: boolean;
  setWeakPassword: (v: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [lang, setLangState] = useState<Language>(() => storage.get('im_lang', 'ku' as Language));
  const [theme, setThemeState] = useState<Theme>(() => storage.get('im_theme', 'light' as Theme));
  const [cart, setCart] = useState<CartItem[]>(() => storage.get('im_cart', [] as CartItem[]));
  const [isLoggedIn, setIsLoggedInState] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [weakPassword, setWeakPassword] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    const initApp = async () => {
      try {
        const [authRes, settingsRes] = await Promise.allSettled([
          StorageService.getAuth(),
          StorageService.getSettings()
        ]);

        if (authRes.status === 'fulfilled') {
          setIsLoggedInState(authRes.value.isLoggedIn);
          setWeakPassword(authRes.value.weakPassword);
        }

        if (settingsRes.status === 'fulfilled' && settingsRes.value) {
          setSettings(settingsRes.value);
        } else {
          Logger.warn("Settings not found yet — the store is running unconfigured.");
        }

        if (authRes.status === 'rejected' && settingsRes.status === 'rejected') {
          throw new Error("Could not reach the store's server.");
        }

        setLoading(false);
      } catch (error: any) {
        Logger.error("Startup failed — server unreachable.", error);
        setGlobalError(error.message || "Could not connect to the server.");
        setLoading(false);
      }
    };
    initApp();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    storage.set('im_theme', theme);
  }, [theme]);

  useEffect(() => { storage.set('im_lang', lang); }, [lang]);
  useEffect(() => { storage.set('im_cart', cart); }, [cart]);

  // Lets the shop owner know a new order came in without having to sit on
  // the Orders page — polls only while signed in, from anywhere in admin.
  useEffect(() => {
    if (!isLoggedIn) {
      setPendingOrders(0);
      document.title = 'Imation - Computer & Electronics';
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const count = await StorageService.getPendingOrderCount();
        if (!cancelled) setPendingOrders(count);
      } catch (e) {
        Logger.warn("Pending order check failed", e);
      }
    };
    poll();
    const interval = setInterval(poll, 20000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isLoggedIn]);

  useEffect(() => {
    document.title = isLoggedIn && pendingOrders > 0
      ? `(${pendingOrders}) New Order${pendingOrders > 1 ? 's' : ''} — Imation Admin`
      : (isLoggedIn ? 'Imation Admin' : 'Imation - Computer & Electronics');
  }, [pendingOrders, isLoggedIn]);

  const setLang = (l: Language) => setLangState(l);
  const toggleTheme = () => setThemeState(prev => prev === 'light' ? 'dark' : 'light');

  const setIsLoggedIn = async (v: boolean) => {
    if (!v) {
      try {
        await StorageService.logout();
      } catch (e) {
        Logger.error("Logout request failed", e);
      }
      setWeakPassword(false);
    }
    setIsLoggedInState(v);
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
      Logger.info("Settings saved.");
    } catch (e: any) {
      Logger.error("Failed to save settings", e);
      setGlobalError(e.message || "Failed to save settings.");
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
        <p className="mt-8 text-gray-500 font-black uppercase tracking-[0.4em] animate-pulse text-xs">Loading...</p>
      </div>
    );
  }

  if (globalError && !settings) {
    return (
      <div className="min-h-screen bg-brand flex flex-col items-center justify-center p-10 text-white text-center">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-8">
          <span className="text-4xl font-black">!</span>
        </div>
        <h1 className="text-4xl font-black tracking-tighter mb-4">CONNECTION FAILED</h1>
        <p className="max-w-md font-bold opacity-80 mb-8">{globalError}</p>
        <button onClick={() => window.location.reload()} className="px-10 py-4 bg-white text-brand rounded-full font-black uppercase tracking-widest text-xs active:scale-95 transition-all">Retry Connection</button>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      lang, setLang, theme, toggleTheme, t, cart, addToCart, removeFromCart, clearCart,
      isLoggedIn, setIsLoggedIn, settings, updateSettings, isSyncing, globalError, setGlobalError,
      pendingOrders, weakPassword, setWeakPassword
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
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

// Uses <Link>, so it must live inside <Router> — rendering it from
// AppProvider (which wraps Router from the outside) crashes with
// "useContext(...) is null" because Link has no router context there.
const NewOrderBadge: React.FC = () => {
  const { isLoggedIn, pendingOrders } = useApp();
  if (!isLoggedIn || pendingOrders === 0) return null;
  return (
    <Link
      to="/admin/orders"
      className="fixed bottom-6 right-6 z-[1000] flex items-center gap-3 bg-brand text-white pl-5 pr-6 py-4 rounded-full shadow-2xl shadow-brand/40 font-black text-sm hover:scale-105 transition-all animate-bounce"
    >
      <Bell size={18} />
      {pendingOrders} New Order{pendingOrders > 1 ? 's' : ''}
    </Link>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <ScrollToTop />
        <NewOrderBadge />
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
