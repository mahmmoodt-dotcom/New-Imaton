
import React, { useState, useEffect } from 'react';
import { Search, Package, Truck, CheckCircle, Clock, XCircle, Download, Loader2, AlertCircle, MapPin, User, ChevronRight } from 'lucide-react';
import { useApp, Logger } from '../App';
import { StorageService } from '../store';
import { Order, OrderStatus } from '../types';
import Invoice from '../components/Invoice';

const TrackingPage: React.FC = () => {
  const { t, lang, settings } = useApp();
  const [trackingNo, setTrackingNo] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNo.trim()) return;

    setError(null);
    setIsSearching(true);
    setHasSearched(false);
    
    const query = trackingNo.trim().toUpperCase();
    Logger.info(`Tracking Request: Attempting to fetch order ${query}`);

    try {
      const found = await StorageService.getOrderByTracking(query);
      if (found) {
        Logger.info(`Tracking Success: Found order ${found.id} for tracking ${query}`);
        setOrder(found);
      } else {
        Logger.warn(`Tracking Info: No order found for tracking ${query}`);
        setOrder(null);
      }
      setHasSearched(true);
    } catch (err: any) {
      Logger.error(`Tracking Failure: Error fetching tracking ${query}`, err);
      setError("Unable to connect to the tracking server. Please check your internet connection.");
    } finally {
      setIsSearching(false);
    }
  };

  const handlePrint = () => {
    if (!order) return;
    Logger.info(`Client Side Action: Printing invoice for order ${order.id}`);
    window.print();
  };

  const statusIcons: Record<OrderStatus, React.ReactNode> = {
    'Pending': <Clock className="text-yellow-500" size={48} />,
    'Delivering': <Truck className="text-brand" size={48} />,
    'Delivered': <CheckCircle className="text-green-500" size={48} />,
    'Canceled': <XCircle className="text-red-500" size={48} />
  };

  const statusColors: Record<OrderStatus, string> = {
    'Pending': 'bg-yellow-500',
    'Delivering': 'bg-brand',
    'Delivered': 'bg-green-500',
    'Canceled': 'bg-red-500'
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-20 no-print">
      <div className="text-center mb-16 animate-in fade-in duration-700">
        <h1 className="text-4xl lg:text-5xl font-black mb-4 dark:text-white tracking-tighter uppercase">{t.trackYourOrder}</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto font-medium">
          Monitor your tech delivery in real-time. Enter your tracking ID below to see exactly where your high-performance hardware is.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-2 lg:p-4 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-2xl mb-12 backdrop-blur-xl">
        <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-4 p-4">
          <div className="relative flex-grow">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              required
              type="text" 
              placeholder={t.enterTrackingNo}
              value={trackingNo}
              onChange={(e) => setTrackingNo(e.target.value)}
              className="w-full pl-16 pr-6 py-5 bg-gray-50 dark:bg-gray-900 border-none rounded-[1.5rem] focus:ring-4 focus:ring-brand/10 text-lg font-black uppercase tracking-[0.2em] dark:text-white placeholder:text-gray-400 placeholder:normal-case transition-all"
            />
          </div>
          <button 
            type="submit" 
            disabled={isSearching}
            className="px-12 py-5 bg-brand hover:bg-brand-dark text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-brand/20 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isSearching ? <Loader2 className="animate-spin" size={20} /> : 'Track Now'}
          </button>
        </form>
      </div>

      {error && (
        <div className="mb-12 p-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-[2rem] flex items-center gap-4 text-red-600 dark:text-red-400 font-bold animate-in shake duration-300">
          <AlertCircle size={24} />
          <p>{error}</p>
        </div>
      )}

      {hasSearched && order ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
          <div className="bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-700 p-8 lg:p-12 shadow-2xl">
            <div className="flex flex-col md:flex-row items-center gap-10 mb-12">
              <div className="relative">
                <div className={`absolute inset-0 ${statusColors[order.status]} opacity-20 blur-2xl rounded-full animate-pulse`}></div>
                <div className="w-28 h-28 bg-gray-50 dark:bg-gray-900 rounded-[2rem] flex items-center justify-center shrink-0 relative border border-gray-100 dark:border-gray-700">
                  {statusIcons[order.status]}
                </div>
              </div>
              <div className="text-center md:text-left flex-grow space-y-2">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-[0.3em]">{t.status}</span>
                <h2 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">
                  {t[order.status.toLowerCase() as keyof typeof t] || order.status}
                </h2>
                <div className="flex items-center justify-center md:justify-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                  <p className="text-gray-500 dark:text-gray-400 font-bold">Updated: {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <div className="flex flex-col items-center md:items-end gap-4 shrink-0">
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-3 px-8 py-4 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl active:scale-95"
                >
                  <Download size={18} />
                  {t.downloadInvoice}
                </button>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Order ID</p>
                  <p className="font-black dark:text-white">#{order.id.slice(-8).toUpperCase()}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700/50 space-y-6">
                <h3 className="font-black text-lg flex items-center gap-3 dark:text-white uppercase tracking-tight">
                  <Package size={22} className="text-brand" />
                  Package Contents
                </h3>
                <div className="space-y-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-50 dark:border-gray-700 transition-all hover:translate-x-1">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden shrink-0 border dark:border-gray-700">
                          <img src={item.product?.image} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div>
                          <p className="text-sm font-black dark:text-white truncate max-w-[150px]">{item.product?.name[lang] || item.product?.name?.en}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase">Unit Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  ))}
                </div>
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <span className="font-black text-gray-400 uppercase text-xs tracking-widest">Total Valuation</span>
                  <span className="text-2xl font-black text-brand tracking-tighter">{order.totalAmount.toLocaleString()} <small className="text-xs">IQD</small></span>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700/50 space-y-8">
                <h3 className="font-black text-lg flex items-center gap-3 dark:text-white uppercase tracking-tight">
                  <MapPin size={22} className="text-brand" />
                  Logistics Data
                </h3>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center shrink-0">
                      <User className="text-brand" size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest block">Recipient Name</span>
                      <p className="font-black dark:text-white text-lg tracking-tight">{order.customerName}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center shrink-0">
                      <MapPin className="text-brand" size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest block">Final Destination</span>
                      <p className="text-gray-600 dark:text-gray-300 font-bold leading-snug">{order.city}, {order.address}</p>
                    </div>
                  </div>
                  {order.deliveryPerson && (
                    <div className="p-6 bg-brand/5 dark:bg-brand/10 rounded-[2rem] border border-brand/10 flex items-center gap-5 animate-in slide-in-from-left duration-500">
                      <div className="w-14 h-14 bg-brand text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-brand/20">
                        <Truck size={28} />
                      </div>
                      <div>
                        <span className="text-[10px] text-brand font-black uppercase tracking-widest block">Assigned Courier</span>
                        <p className="font-black dark:text-white text-xl tracking-tight">{order.deliveryPerson}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="hidden">
             <Invoice order={order} settings={settings} lang={lang} />
          </div>
        </div>
      ) : hasSearched && (
        <div className="text-center py-24 bg-gray-50/50 dark:bg-gray-800/50 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-gray-700 transition-colors animate-in fade-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-500/10">
            <XCircle size={48} />
          </div>
          <h3 className="text-2xl font-black dark:text-white mb-2 tracking-tight">Order Not Located</h3>
          <p className="text-gray-500 dark:text-gray-400 font-bold mb-8">No records match tracking ID: <span className="text-brand font-black uppercase">{trackingNo}</span></p>
          <button 
            onClick={() => setHasSearched(false)}
            className="px-8 py-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-50 transition-all shadow-sm"
          >
            Try Another ID
          </button>
        </div>
      )}
    </div>
  );
};

export default TrackingPage;
