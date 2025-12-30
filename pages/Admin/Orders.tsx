
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Truck, CheckCircle, XCircle, User, Phone, MapPin, Package, FileText, Send, X, Loader2 } from 'lucide-react';
import { useApp, Logger } from '../../App';
import { StorageService } from '../../store';
import { Order, OrderStatus } from '../../types';

const OrdersAdmin: React.FC = () => {
  const { lang, t } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrderStatus>('Pending');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Local state for delivery assignment
  const [deliveryPerson, setDeliveryPerson] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const data = await StorageService.getOrders();
        setOrders(data || []);
      } catch (err) {
        Logger.error("Failed to load orders", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter(o => o.status === activeTab).sort((a, b) => b.createdAt - a.createdAt);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus, courier?: string, phone?: string) => {
    try {
      const updated = orders.map(o => {
        if (o.id === orderId) {
          return { 
            ...o, 
            status: newStatus, 
            deliveryPerson: courier || o.deliveryPerson,
            deliveryPhone: phone || o.deliveryPhone 
          };
        }
        return o;
      });
      await StorageService.saveOrders(updated);
      setOrders(updated);
      setSelectedOrder(null);
      setDeliveryPerson('');
      setDeliveryPhone('');
      Logger.info(`Order ${orderId} status changed to ${newStatus}`);
    } catch (err) {
      Logger.error(`Failed to update order status for ${orderId}`, err);
    }
  };

  const tabs: OrderStatus[] = ['Pending', 'Delivering', 'Delivered', 'Canceled'];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin text-brand" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-12 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700">
              <ArrowLeft size={20} className="dark:text-white" />
            </Link>
            <div>
              <h1 className="text-3xl font-black dark:text-white">Order Management</h1>
              <p className="text-gray-500">Track and fulfill customer orders</p>
            </div>
          </div>
        </div>

        <div className="flex bg-white dark:bg-gray-800 p-2 rounded-3xl border border-gray-100 dark:border-gray-700 mb-8 overflow-x-auto no-scrollbar transition-colors">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedOrder(null); }}
              className={`flex-1 min-w-[120px] px-6 py-4 rounded-2xl font-bold transition-all ${
                activeTab === tab 
                ? 'bg-brand text-white shadow-lg shadow-brand/20 dark:shadow-none' 
                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {tab} ({orders.filter(o => o.status === tab).length})
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Orders List */}
           <div className="space-y-4">
             {filteredOrders.length > 0 ? filteredOrders.map(order => (
               <div 
                 key={order.id} 
                 onClick={() => setSelectedOrder(order)}
                 className={`p-6 bg-white dark:bg-gray-800 rounded-3xl border cursor-pointer transition-all hover:shadow-lg ${
                   selectedOrder?.id === order.id ? 'border-brand ring-2 ring-brand/20 shadow-xl' : 'border-gray-100 dark:border-gray-700'
                 }`}
               >
                 <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">#{order.invoiceNumber}</span>
                      <h3 className="text-xl font-black mt-1 dark:text-white">{order.customerName}</h3>
                    </div>
                    <div className="text-right">
                       <span className="text-brand font-black text-lg">{order.totalAmount.toLocaleString()} IQD</span>
                       <p className="text-[10px] text-gray-400 mt-1">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                 </div>
                 <div className="flex gap-2 mt-4 text-xs text-gray-500">
                   <div className="flex items-center gap-1"><MapPin size={12}/> {order.city}</div>
                   <div className="flex items-center gap-1"><Package size={12}/> {order.items.length} items</div>
                 </div>
               </div>
             )) : (
               <div className="py-20 text-center bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-700">
                 <p className="text-gray-400 font-bold">No {activeTab.toLowerCase()} orders found.</p>
               </div>
             )}
           </div>

           {/* Order Detail Panel */}
           <div className="lg:sticky lg:top-24 h-fit">
             {selectedOrder ? (
               <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 overflow-hidden shadow-2xl animate-in slide-in-from-right duration-300 transition-colors">
                  <div className="p-8 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <h2 className="text-2xl font-black dark:text-white">Order Details</h2>
                    <span className={`px-4 py-2 rounded-xl font-bold text-sm ${
                      selectedOrder.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                      selectedOrder.status === 'Delivering' ? 'bg-blue-100 text-blue-700' :
                      selectedOrder.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>{selectedOrder.status}</span>
                  </div>
                  
                  <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <span className="text-[10px] uppercase font-bold text-gray-400">Customer</span>
                           <p className="font-bold dark:text-white">{selectedOrder.customerName}</p>
                           <p className="text-sm text-gray-500">{selectedOrder.phoneNumber}</p>
                        </div>
                        <div className="space-y-1 text-right">
                           <span className="text-[10px] uppercase font-bold text-gray-400">Location</span>
                           <p className="font-bold dark:text-white">{selectedOrder.city}</p>
                           <p className="text-sm text-gray-500">{selectedOrder.address}</p>
                        </div>
                     </div>

                     {selectedOrder.note && (
                       <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-2xl border border-yellow-100 dark:border-yellow-900/20">
                         <span className="text-[10px] uppercase font-bold text-yellow-600 mb-1 block">Customer Note</span>
                         <p className="text-sm dark:text-gray-300 italic">"{selectedOrder.note}"</p>
                       </div>
                     )}

                     <div className="space-y-3">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-2">Ordered Products</span>
                        {selectedOrder.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl transition-colors">
                             <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                                 <img src={item.product.image} className="w-full h-full object-cover" alt="" />
                               </div>
                               <div>
                                 <p className="text-sm font-bold dark:text-white">{item.product.name[lang]}</p>
                                 <p className="text-xs text-gray-500">{(item.product.discountPrice || item.product.price).toLocaleString()} IQD</p>
                               </div>
                             </div>
                             <span className="font-black">x{item.quantity}</span>
                          </div>
                        ))}
                     </div>

                     <div className="bg-brand p-6 rounded-3xl text-white flex justify-between items-center shadow-lg shadow-brand/20">
                        <span className="font-bold opacity-80">Total Amount</span>
                        <span className="text-2xl font-black">{selectedOrder.totalAmount.toLocaleString()} IQD</span>
                     </div>

                     {/* Action Controls */}
                     <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-700">
                        {selectedOrder.status === 'Pending' && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                             <div className="grid grid-cols-2 gap-4">
                                <input 
                                  placeholder="Courier Name"
                                  value={deliveryPerson}
                                  onChange={e => setDeliveryPerson(e.target.value)}
                                  className="px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-brand text-sm dark:text-white"
                                />
                                <input 
                                  placeholder="Courier Phone"
                                  value={deliveryPhone}
                                  onChange={e => setDeliveryPhone(e.target.value)}
                                  className="px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-brand text-sm dark:text-white"
                                />
                             </div>
                             <div className="flex gap-3">
                                <button 
                                  onClick={() => handleUpdateStatus(selectedOrder.id, 'Canceled')}
                                  className="flex-1 py-4 border border-red-200 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                                >
                                  <X size={18} /> Cancel
                                </button>
                                <button 
                                  disabled={!deliveryPerson}
                                  onClick={() => handleUpdateStatus(selectedOrder.id, 'Delivering', deliveryPerson, deliveryPhone)}
                                  className="flex-[2] py-4 bg-brand text-white rounded-2xl font-bold shadow-lg shadow-brand/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                                >
                                  <Send size={18} /> Ship Order
                                </button>
                             </div>
                          </div>
                        )}

                        {selectedOrder.status === 'Delivering' && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                             <div className="p-4 bg-brand/5 dark:bg-brand/10 rounded-2xl border border-brand/20 flex items-center justify-between">
                               <div>
                                  <span className="text-[10px] uppercase font-bold text-brand">Assigned Courier</span>
                                  <p className="font-bold dark:text-white">{selectedOrder.deliveryPerson}</p>
                                  {selectedOrder.deliveryPhone && <p className="text-xs text-gray-500">{selectedOrder.deliveryPhone}</p>}
                               </div>
                               <Truck className="text-brand opacity-20" size={32} />
                             </div>
                             <div className="flex gap-3">
                                <button 
                                  onClick={() => handleUpdateStatus(selectedOrder.id, 'Canceled')}
                                  className="flex-1 py-4 border border-red-200 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                                >
                                  <X size={18} /> Cancel
                                </button>
                                <button 
                                  onClick={() => handleUpdateStatus(selectedOrder.id, 'Delivered')}
                                  className="flex-[2] py-4 bg-green-600 text-white rounded-2xl font-bold shadow-lg shadow-green-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                  <CheckCircle size={18} /> Mark Delivered
                                </button>
                             </div>
                          </div>
                        )}
                        
                        {(selectedOrder.status === 'Delivered' || selectedOrder.status === 'Canceled') && (
                           <div className="text-center py-4">
                              <p className="text-gray-400 font-bold italic">Transaction finalized as {selectedOrder.status}.</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
             ) : (
               <div className="h-full min-h-[400px] flex items-center justify-center p-20 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-[2.5rem] bg-white dark:bg-gray-800 transition-colors">
                  <div className="text-center">
                    <FileText size={64} className="mx-auto text-gray-100 dark:text-gray-700 mb-6" />
                    <p className="text-gray-400 font-bold">Select an order from the list to view full details and manage status.</p>
                  </div>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersAdmin;
