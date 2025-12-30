
import React, { useState } from 'react';
import { Search, Package, Truck, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useApp } from '../App';
import { StorageService } from '../store';
import { Order, OrderStatus } from '../types';

const TrackingPage: React.FC = () => {
  const { t, lang } = useApp();
  const [trackingNo, setTrackingNo] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    try {
      const allOrders = await StorageService.getOrders();
      const found = allOrders.find(o => o.trackingNumber === trackingNo.trim().toUpperCase());
      setOrder(found || null);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const statusIcons: Record<OrderStatus, React.ReactNode> = {
    'Pending': <Clock className="text-yellow-500" size={48} />,
    'Delivering': <Truck className="text-brand" size={48} />,
    'Delivered': <CheckCircle className="text-green-500" size={48} />,
    'Canceled': <XCircle className="text-red-500" size={48} />
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold mb-4">{t.trackYourOrder}</h1>
        <p className="text-gray-500 max-w-lg mx-auto">
          Enter the tracking number provided in your invoice to see the current status of your electronic delivery.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl mb-12">
        <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              required
              type="text" 
              placeholder={t.enterTrackingNo}
              value={trackingNo}
              onChange={(e) => setTrackingNo(e.target.value)}
              className="w-full pl-12 pr-4 py-5 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-brand text-lg font-bold uppercase tracking-widest"
            />
          </div>
          <button 
            type="submit" 
            disabled={isSearching}
            className="px-10 py-5 bg-brand hover:bg-brand-dark text-white rounded-2xl font-bold shadow-lg shadow-brand/20 dark:shadow-none transition-all active:scale-95 disabled:opacity-50"
          >
            {isSearching ? 'Tracking...' : 'Track Now'}
          </button>
        </form>
      </div>

      {hasSearched && order ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom duration-500">
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-10 flex flex-col md:flex-row items-center gap-10">
            <div className="w-24 h-24 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center shrink-0">
              {statusIcons[order.status]}
            </div>
            <div className="text-center md:text-left flex-grow">
              <span className="text-xs text-gray-400 uppercase font-bold tracking-widest">{t.status}</span>
              <h2 className="text-4xl font-black text-gray-900 dark:text-white mt-1">
                {t[order.status.toLowerCase() as keyof typeof t] || order.status}
              </h2>
              <p className="text-gray-500 mt-2">Update on {new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-center md:text-right shrink-0">
               <p className="text-lg font-bold text-brand mb-1">Invoice #{order.invoiceNumber}</p>
               <p className="text-gray-400 text-sm">Estimated delivery: 2-3 Days</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-3xl border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Package size={20} className="text-brand" />
                Order Details
              </h3>
              <ul className="space-y-3">
                {order.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between items-center bg-white dark:bg-gray-900 p-3 rounded-xl">
                    <span className="text-sm font-medium">{item.product.name[lang]}</span>
                    <span className="text-sm font-bold text-gray-500">x{item.quantity}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span className="font-bold">Total Amount</span>
                <span className="text-xl font-extrabold text-brand">{order.totalAmount.toLocaleString()} IQD</span>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-3xl border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg mb-4">Customer Info</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-gray-400 font-bold uppercase block">Recipient</span>
                  <p className="font-bold">{order.customerName}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-bold uppercase block">Address</span>
                  <p className="text-gray-600 dark:text-gray-400">{order.city}, {order.address}</p>
                </div>
                {order.deliveryPerson && (
                  <div>
                    <span className="text-xs text-gray-400 font-bold uppercase block">Courier</span>
                    <p className="font-bold text-green-600">{order.deliveryPerson}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : hasSearched && (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle size={32} />
          </div>
          <p className="text-gray-500 font-bold">No order found with tracking number: {trackingNo}</p>
          <p className="text-sm text-gray-400 mt-2">Please check your invoice for the correct number.</p>
        </div>
      )}
    </div>
  );
};

export default TrackingPage;
