
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Clock, Truck, CheckCircle, XCircle, User, Phone, 
  MapPin, Package, FileText, Send, X, Loader2, AlertCircle, 
  RefreshCw, Download, Printer 
} from 'lucide-react';
import { useApp, Logger } from '../../App';
import { StorageService } from '../../store';
import { Order, OrderStatus } from '../../types';
import Invoice from '../../components/Invoice';

const OrdersAdmin: React.FC = () => {
  const { lang, t, settings } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrderStatus>('Pending');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [deliveryPerson, setDeliveryPerson] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');

  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      
      const data = await StorageService.getOrders();
      setOrders(data || []);
      
      if (selectedOrder) {
        const updated = data.find((o: Order) => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    } catch (err) {
      Logger.error("Order sync failure", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredOrders = orders.filter(o => o.status === activeTab).sort((a, b) => b.createdAt - a.createdAt);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus, courier?: string, phone?: string) => {
    setError(null);

    // Validation for assignment
    if (newStatus === 'Delivering') {
      if (!courier?.trim()) {
        setError("Courier name is required to ship.");
        return;
      }
      if (phone && !/^07[0-9]{9}$/.test(phone.trim())) {
        setError("Enter a valid Iraqi phone number for the courier.");
        return;
      }
    }

    try {
      setIsUpdating(true);
      const updatedOrder = await StorageService.updateOrderStatus(orderId, newStatus, {
        person: courier,
        phone: phone
      });
      
      setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
      setSelectedOrder(updatedOrder);
      setDeliveryPerson('');
      setDeliveryPhone('');
      Logger.info(`Status Transition: ${orderId} -> ${newStatus}`);
    } catch (err: any) {
      setError(err.message || "Failed to update order status.");
      Logger.error(`Update failed for ${orderId}`, err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrint = () => {
    if (!selectedOrder) return;
    Logger.info(`Printing admin invoice for: ${selectedOrder.id}`);
    window.print();
  };

  const tabs: OrderStatus[] = ['Pending', 'Delivering', 'Delivered', 'Canceled'];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f1115]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
          <p className="font-black text-gray-500 uppercase tracking-widest text-xs">Loading Manifest...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-12 transition-colors duration-200">
      <div className="max-w-7xl mx-auto no-print">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm">
              <ArrowLeft size={20} className="dark:text-white" />
            </Link>
            <div>
              <h1 className="text-3xl font-black dark:text-white tracking-tight">{t.orders}</h1>
              <p className="text-gray-500 font-medium text-sm">{t.trackFulfill}</p>
            </div>
          </div>
          <button 
            onClick={() => fetchOrders()} 
            disabled={isRefreshing}
            className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-brand/5 transition-all shadow-sm"
          >
            <RefreshCw size={20} className={`text-brand ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex bg-white/50 dark:bg-gray-800/50 p-2 rounded-[2rem] border border-gray-100 dark:border-gray-700 mb-8 overflow-x-auto no-scrollbar backdrop-blur-xl">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedOrder(null); setError(null); }}
              className={`flex-1 min-w-[140px] px-6 py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] transition-all ${
                activeTab === tab 
                ? 'bg-brand text-white shadow-xl shadow-brand/30 scale-105' 
                : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab} <span className="ml-2 opacity-50">[{orders.filter(o => o.status === tab).length}]</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
           <div className="space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar pr-2">
             {filteredOrders.length > 0 ? filteredOrders.map(order => (
               <div 
                 key={order.id} 
                 onClick={() => { setSelectedOrder(order); setError(null); }}
                 className={`p-8 bg-white dark:bg-gray-800 rounded-[2.5rem] border cursor-pointer transition-all hover:shadow-2xl hover:-translate-y-1 ${
                   selectedOrder?.id === order.id ? 'border-brand ring-4 ring-brand/10 shadow-2xl' : 'border-gray-100 dark:border-gray-700 shadow-sm'
                 }`}
               >
                 <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">INVOICE #{order.id}</span>
                      <h3 className="text-2xl font-black mt-1 dark:text-white tracking-tight">{order.customerName}</h3>
                    </div>
                    <div className="text-right">
                       <span className="text-brand font-black text-xl tracking-tighter">{order.totalAmount.toLocaleString()} IQD</span>
                       <p className="text-[10px] text-gray-400 mt-1 uppercase font-black">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                 </div>
                 <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-50 dark:border-white/5">
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-full"><MapPin size={12}/> {order.city}</div>
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-full"><Package size={12}/> {order.items?.length || 0} Units</div>
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase text-brand bg-brand/5 px-3 py-1.5 rounded-full">ID: {order.trackingNumber}</div>
                 </div>
               </div>
             )) : (
               <div className="py-32 text-center bg-white/50 dark:bg-gray-800/50 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                 <Package size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-6" />
                 <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No orders in {activeTab}</p>
               </div>
             )}
           </div>

           <div className="lg:sticky lg:top-24 h-fit">
             {selectedOrder ? (
               <div className="bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-700 overflow-hidden shadow-2xl animate-in slide-in-from-right-10 duration-500">
                  <div className="p-8 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-black dark:text-white tracking-tighter uppercase">{t.customerDetails}</h2>
                      <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Validated Entry</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={handlePrint}
                        className="p-3 bg-white dark:bg-gray-700 text-gray-600 dark:text-white rounded-xl shadow-sm hover:text-brand transition-all"
                        title="Print Invoice"
                      >
                        <Printer size={20} />
                      </button>
                      <span className={`px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-sm ${
                        selectedOrder.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                        selectedOrder.status === 'Delivering' ? 'bg-blue-100 text-blue-700' :
                        selectedOrder.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>{selectedOrder.status}</span>
                    </div>
                  </div>
                  
                  <div className="p-10 space-y-10 max-h-[65vh] overflow-y-auto no-scrollbar">
                     {error && (
                       <div className="p-5 bg-brand text-white rounded-[2rem] flex items-center gap-4 font-black text-xs uppercase tracking-widest animate-in shake duration-300 shadow-xl shadow-brand/20">
                         <AlertCircle size={20} className="shrink-0" /> {error}
                       </div>
                     )}

                     <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-1">
                           <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest">{t.billedTo}</span>
                           <p className="font-black text-xl dark:text-white tracking-tight">{selectedOrder.customerName}</p>
                           <p className="text-sm font-bold text-gray-500">{selectedOrder.phoneNumber}</p>
                        </div>
                        <div className="space-y-1 text-right">
                           <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest">{t.address}</span>
                           <p className="font-black text-xl dark:text-white tracking-tight">{selectedOrder.city}</p>
                           <p className="text-sm font-bold text-gray-500 leading-tight">{selectedOrder.address}</p>
                        </div>
                     </div>

                     {selectedOrder.note && (
                       <div className="p-6 bg-yellow-50 dark:bg-yellow-900/10 rounded-[2rem] border border-yellow-100 dark:border-yellow-900/20">
                         <span className="text-[10px] uppercase font-black text-yellow-600 mb-2 block tracking-widest">{t.note}</span>
                         <p className="text-sm dark:text-gray-300 italic font-medium">"{selectedOrder.note}"</p>
                       </div>
                     )}

                     <div className="space-y-4">
                        <span className="text-[10px] uppercase font-black text-gray-400 block mb-2 tracking-widest">{t.item} Manifest</span>
                        {selectedOrder.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-5 rounded-[2rem] border border-gray-100 dark:border-white/5">
                             <div className="flex items-center gap-4">
                               <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 shadow-lg border-2 border-white dark:border-gray-800">
                                 <img src={item.product?.image} className="w-full h-full object-cover" alt="" />
                               </div>
                               <div>
                                 <p className="text-sm font-black dark:text-white tracking-tight truncate max-w-[150px]">{item.product?.name[lang] || item.product?.name?.en}</p>
                                 <p className="text-[10px] font-black text-gray-400 uppercase">{(item.product?.discountPrice || item.product?.price || 0).toLocaleString()} IQD</p>
                               </div>
                             </div>
                             <span className="font-black text-xl tracking-tighter">x{item.quantity}</span>
                          </div>
                        ))}
                     </div>

                     <div className="bg-brand p-10 rounded-[3rem] text-white flex justify-between items-center shadow-2xl shadow-brand/30">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase opacity-60 tracking-widest">{t.totalDue}</span>
                          <span className="text-4xl font-black tracking-tighter">{selectedOrder.totalAmount.toLocaleString()} IQD</span>
                        </div>
                        <CheckCircle size={40} className="opacity-20" />
                     </div>

                     <div className="space-y-4 pt-10 border-t border-gray-100 dark:border-white/5">
                        {isUpdating && (
                          <div className="flex items-center justify-center py-6 text-brand font-black text-xs uppercase tracking-[0.3em] animate-pulse">
                            <Loader2 className="animate-spin mr-3" size={20} />
                            Updating Cloud...
                          </div>
                        )}

                        {selectedOrder.status === 'Pending' && !isUpdating && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-[10px] uppercase font-black text-gray-400 ml-2 tracking-widest">{t.deliveryPerson}</label>
                                  <input 
                                    placeholder="Courier Name"
                                    value={deliveryPerson}
                                    onChange={e => setDeliveryPerson(e.target.value)}
                                    className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-[1.5rem] border-none focus:ring-4 focus:ring-brand/10 text-sm font-bold dark:text-white"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] uppercase font-black text-gray-400 ml-2 tracking-widest">{t.phoneNumber}</label>
                                  <input 
                                    placeholder="07XXXXXXXXX"
                                    value={deliveryPhone}
                                    onChange={e => setDeliveryPhone(e.target.value)}
                                    className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-[1.5rem] border-none focus:ring-4 focus:ring-brand/10 text-sm font-bold dark:text-white"
                                  />
                                </div>
                             </div>
                             <div className="flex gap-4">
                                <button 
                                  onClick={() => handleUpdateStatus(selectedOrder.id, 'Canceled')}
                                  className="flex-1 py-5 border-2 border-red-50 dark:border-red-900/10 text-red-500 rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-red-50 transition-all flex items-center justify-center gap-3"
                                >
                                  <XCircle size={18} /> {t.cancel}
                                </button>
                                <button 
                                  disabled={!deliveryPerson}
                                  onClick={() => handleUpdateStatus(selectedOrder.id, 'Delivering', deliveryPerson, deliveryPhone)}
                                  className="flex-[2] py-5 bg-brand text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-brand/30 flex items-center justify-center gap-3 disabled:opacity-50 transition-all active:scale-95"
                                >
                                  <Send size={18} /> {t.shipOrder}
                                </button>
                             </div>
                          </div>
                        )}

                        {selectedOrder.status === 'Delivering' && !isUpdating && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="p-8 bg-brand/5 dark:bg-brand/10 rounded-[2.5rem] border border-brand/10 flex items-center justify-between">
                               <div>
                                  <span className="text-[10px] uppercase font-black text-brand tracking-widest">{t.courier} Assigned</span>
                                  <p className="text-xl font-black dark:text-white tracking-tight mt-1">{selectedOrder.deliveryPerson}</p>
                                  {selectedOrder.deliveryPhone && <p className="text-sm font-bold text-gray-500 mt-1">{selectedOrder.deliveryPhone}</p>}
                               </div>
                               <div className="p-5 bg-brand text-white rounded-3xl">
                                 <Truck size={32} />
                               </div>
                             </div>
                             <div className="flex gap-4">
                                <button 
                                  onClick={() => handleUpdateStatus(selectedOrder.id, 'Canceled')}
                                  className="flex-1 py-5 border-2 border-red-50 dark:border-red-900/10 text-red-500 rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-red-50 transition-all"
                                >
                                  <XCircle size={18} /> {t.cancel}
                                </button>
                                <button 
                                  onClick={() => handleUpdateStatus(selectedOrder.id, 'Delivered')}
                                  className="flex-[2] py-5 bg-green-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
                                >
                                  <CheckCircle size={18} /> {t.transactionFinished}
                                </button>
                             </div>
                          </div>
                        )}
                        
                        {(selectedOrder.status === 'Delivered' || selectedOrder.status === 'Canceled') && !isUpdating && (
                           <div className="text-center py-10">
                              <div className="inline-block px-10 py-4 bg-gray-50 dark:bg-gray-900 rounded-full border border-gray-100 dark:border-white/5">
                                <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">Log Finalized: {selectedOrder.status}</p>
                              </div>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
             ) : (
               <div className="h-full min-h-[500px] flex items-center justify-center p-20 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[3rem] bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-900 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-gray-300 dark:text-gray-700">
                      <FileText size={48} />
                    </div>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-xs max-w-xs mx-auto">Select a manifest entry to perform administrative validation or status transition.</p>
                  </div>
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Hidden Invoice Template for Print */}
      {selectedOrder && (
        <div className="hidden">
           <Invoice order={selectedOrder} settings={settings} lang={lang} />
        </div>
      )}
    </div>
  );
};

export default OrdersAdmin;
