
import React, { useMemo, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BarChart3, Package, Layers, ShoppingBag, Settings, LogOut, 
  ArrowUpRight, Clock, Truck, CheckCircle, XCircle, Loader2 
} from 'lucide-react';
import { useApp, Logger } from '../../App';
import { StorageService } from '../../store';
import { Order, Product, Category } from '../../types';

const AdminDashboard: React.FC = () => {
  const { setIsLoggedIn, t, settings } = useApp();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [prods, cats, ords] = await Promise.all([
          StorageService.getProducts(),
          StorageService.getCategories(),
          StorageService.getOrders()
        ]);
        setProducts(prods);
        setCategories(cats);
        setOrders(ords);
      } catch (err) {
        Logger.error("Failed to load dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === 'Pending').length,
    delivering: orders.filter(o => o.status === 'Delivering').length,
    delivered: orders.filter(o => o.status === 'Delivered').length,
    canceled: orders.filter(o => o.status === 'Canceled').length,
    revenue: orders.filter(o => o.status === 'Delivered').reduce((acc, curr) => acc + curr.totalAmount, 0)
  }), [orders]);

  const handleLogout = () => {
    StorageService.setAuth({ isLoggedIn: false });
    setIsLoggedIn(false);
    navigate('/admin/login');
  };

  const menuItems = [
    { name: t.categories, path: '/admin/categories', icon: <Layers />, color: 'bg-purple-500', count: categories.length },
    { name: t.products, path: '/admin/products', icon: <Package />, color: 'bg-brand', count: products.length },
    { name: t.orders, path: '/admin/orders', icon: <ShoppingBag />, color: 'bg-green-500', count: orders.length },
    { name: t.settings, path: '/admin/settings', icon: <Settings />, color: 'bg-gray-500' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center app-container">
        <Loader2 className="animate-spin text-brand" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen app-container flex transition-colors duration-500">
      <aside className="hidden lg:flex w-80 windowy-glass border-r border-white/10 flex-col sticky top-0 h-screen rounded-none">
        <div className="p-10 border-b border-white/5 flex items-center gap-4">
          <div className="w-14 h-10 bg-white/10 rounded-xl flex-shrink-0 p-1">
             <img src={settings.logo} className="w-full h-full object-contain" alt="Imation" />
          </div>
          <span className="font-black text-2xl tracking-tighter dark:text-white">IMATION</span>
        </div>
        <nav className="p-8 flex-grow space-y-3">
          <Link to="/admin" className="flex items-center gap-4 p-5 rounded-[1.5rem] bg-brand text-white font-black shadow-xl shadow-brand/20 transition-all">
            <BarChart3 size={20} />
            {t.dashboard}
          </Link>
          {menuItems.map(item => (
            <Link key={item.path} to={item.path} className="flex items-center gap-4 p-5 rounded-[1.5rem] text-gray-500 dark:text-gray-400 hover:bg-white/10 transition-all font-bold">
              {React.cloneElement(item.icon as React.ReactElement<any>, { size: 20 })}
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-8 border-t border-white/5">
          <button onClick={handleLogout} className="flex items-center gap-4 w-full p-5 rounded-[1.5rem] text-red-500 hover:bg-red-500/10 font-bold transition-all">
            <LogOut size={20} />
            {t.logout}
          </button>
        </div>
      </aside>

      <main className="flex-grow p-6 lg:p-16 overflow-y-auto no-scrollbar">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-16 gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black dark:text-white tracking-tight">{t.adminOverview}</h1>
            <p className="text-gray-500 font-medium">{t.welcomeBack}</p>
          </div>
          <Link to="/" className="px-10 py-5 windowy-glass rounded-[2rem] font-black text-sm dark:text-white transition-all hover:bg-white/20 shadow-none border-white/10">{t.viewShop}</Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
           <StatCard icon={<ShoppingBag size={24}/>} label={t.totalOrders} value={stats.total} color="bg-brand" />
           <StatCard icon={<Clock size={24}/>} label={t.pending} value={stats.pending} color="bg-orange-500" />
           <StatCard icon={<Truck size={24}/>} label={t.delivering} value={stats.delivering} color="bg-blue-600" />
           <StatCard icon={<CheckCircle size={24}/>} label={t.delivered} value={stats.delivered} color="bg-green-600" />
        </div>

        <h2 className="text-2xl font-black mb-8 dark:text-white tracking-tight">{t.quickManagement}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {menuItems.map(item => (
            <Link key={item.path} to={item.path} className="windowy-glass p-10 rounded-[4rem] group hover:scale-[1.02] transition-all shadow-none border-white/10">
               <div className={`${item.color} w-16 h-16 rounded-[2rem] flex items-center justify-center text-white mb-8 transform group-hover:rotate-6 transition-transform shadow-lg`}>
                 {item.icon}
               </div>
               <div className="flex justify-between items-end">
                  <div>
                    <h3 className="font-black text-xl dark:text-white tracking-tight">{item.name}</h3>
                    <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-1">{item.count ?? 0} {t.totalItems}</p>
                  </div>
                  <ArrowUpRight size={20} className="text-gray-300 group-hover:text-brand transition-colors" />
               </div>
            </Link>
          ))}
        </div>

        <div className="bg-gradient-to-br from-brand to-brand-dark p-12 lg:p-16 rounded-[4.5rem] text-white flex flex-col lg:flex-row justify-between items-center gap-12 shadow-2xl shadow-brand/30">
          <div className="space-y-4 text-center lg:text-left">
             <span className="text-white/60 font-black uppercase tracking-[0.3em] text-xs">{t.realizedRevenue}</span>
             <h2 className="text-6xl lg:text-8xl font-black tracking-tighter">{stats.revenue.toLocaleString()} <span className="text-3xl opacity-50">IQD</span></h2>
             <p className="text-white/40 font-bold">{t.delivered} {stats.delivered} {t.orders}.</p>
          </div>
          <div className="bg-white/10 p-10 rounded-[3rem] backdrop-blur-3xl">
             <BarChart3 size={96} className="text-white/30" />
          </div>
        </div>
      </main>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: number, color: string }> = ({ icon, label, value, color }) => (
  <div className="windowy-glass p-8 rounded-[3rem] flex items-center gap-6 transition-all shadow-none border-white/10">
    <div className={`${color} w-16 h-16 rounded-[2rem] flex items-center justify-center text-white shrink-0 shadow-lg`}>
      {icon}
    </div>
    <div>
      <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest block mb-1">{label}</span>
      <span className="text-4xl font-black dark:text-white tracking-tighter">{value}</span>
    </div>
  </div>
);

export default AdminDashboard;
