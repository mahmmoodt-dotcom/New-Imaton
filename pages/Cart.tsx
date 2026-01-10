
import React, { useState } from 'react';
import { ShoppingBag, Trash2, Plus, Minus, Download, CheckCircle2, Phone, MapPin, User, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useApp, Logger } from '../App';
import { IRAQ_CITIES } from '../constants';
import { StorageService } from '../store';
import { Order } from '../types';
import Invoice from '../components/Invoice';

const CartPage: React.FC = () => {
  const { cart, removeFromCart, addToCart, t, lang, clearCart, settings } = useApp();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderComplete, setOrderComplete] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    city: IRAQ_CITIES[0],
    address: '',
    note: ''
  });

  const subtotal = cart.reduce((acc, item) => {
    const price = item.product.discountPrice || item.product.price;
    return acc + (price * item.quantity);
  }, 0);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (cart.length === 0) return;

    // Strict Validation
    if (!formData.fullName.trim() || !formData.phoneNumber.trim() || !formData.address.trim()) {
      setError("Please fill all required delivery details.");
      return;
    }

    // Iraqi Phone Pattern: 07XXXXXXXX (11 digits)
    const phoneRegex = /^07[0-9]{9}$/;
    if (!phoneRegex.test(formData.phoneNumber.trim())) {
      setError("Please enter a valid Iraqi phone number (e.g. 07701234567)");
      return;
    }

    try {
      setIsProcessing(true);
      Logger.info(`Order Submission Initialized for ${formData.fullName}`);
      
      const newOrderRequest: Partial<Order> = {
        id: `ORD${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(7).toUpperCase()}`,
        customerName: formData.fullName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        city: formData.city,
        address: formData.address.trim(),
        note: formData.note.trim(),
        items: [...cart],
        totalAmount: subtotal,
        status: 'Pending'
      };

      // Submit using the new 2-step verification logic in StorageService
      const finalizedOrder = await StorageService.submitOrder(newOrderRequest as Order);
      
      if (!finalizedOrder.trackingNumber) {
        throw new Error("Order was submitted but tracking number generation failed.");
      }

      setOrderComplete(finalizedOrder);
      Logger.info(`Transaction Success: Order #${finalizedOrder.id}, Tracking: ${finalizedOrder.trackingNumber}`);
      clearCart();
    } catch (err: any) {
      Logger.error("Order submission failure", err);
      setError(err.message || "Unable to submit order. Please check your internet connection and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (!orderComplete) return;
    Logger.info(`User Event: Triggering print for Invoice ${orderComplete.id}`);
    window.print();
  };

  if (orderComplete) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="bg-white dark:bg-gray-800 rounded-[3.5rem] border border-gray-100 dark:border-gray-700 p-10 lg:p-20 text-center shadow-2xl no-print animate-in zoom-in duration-500">
          <div className="w-28 h-28 bg-green-500 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-green-500/30 animate-bounce">
            <CheckCircle2 size={56} />
          </div>
          <h2 className="text-5xl font-black mb-6 dark:text-white tracking-tighter uppercase">{t.orderSuccess}</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-12 max-w-lg mx-auto font-bold text-lg">
            Your high-performance hardware request has been registered. Our team is preparing your package for shipment.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="p-8 bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 group hover:border-brand transition-colors">
              <span className="text-[10px] text-gray-400 uppercase font-black block mb-2 tracking-widest">{t.invoiceNo}</span>
              <span className="text-2xl font-black dark:text-white truncate block">#{orderComplete.id}</span>
            </div>
            <div className="p-8 bg-brand/5 dark:bg-brand/10 rounded-[2.5rem] border border-brand/20 group hover:bg-brand hover:text-white transition-all duration-300">
              <span className="text-[10px] text-brand group-hover:text-white/60 uppercase font-black block mb-2 tracking-widest">{t.trackingNo}</span>
              <span className="text-2xl font-black dark:text-white group-hover:text-white truncate block tracking-widest">{orderComplete.trackingNumber}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button 
              onClick={handleDownloadInvoice}
              className="px-10 py-5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl active:scale-95"
            >
              <Download size={20} />
              {t.downloadInvoice}
            </button>
            <a 
              href={`https://wa.me/${settings.phone1.replace(/\s+/g, '')}?text=Hello Imation team! I just placed an order. %0A%0AOrder ID: ${orderComplete.id}%0ATracking: ${orderComplete.trackingNumber}%0AName: ${orderComplete.customerName}%0A%0APlease confirm my order.`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-5 bg-green-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl active:scale-95 shadow-green-500/20"
            >
              <Phone size={20} />
              {t.whatsappConfirmation}
            </a>
          </div>
          
          <p className="mt-12 text-gray-400 font-black text-[10px] uppercase tracking-[0.3em]">
            Tip: Keep your tracking ID safe to monitor delivery status.
          </p>
        </div>

        <div className="hidden">
           <Invoice order={orderComplete} settings={settings} lang={lang} />
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-32 text-center">
        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-8">
          <ShoppingBag size={48} className="text-gray-400" />
        </div>
        <h2 className="text-3xl font-black mb-4 dark:text-white uppercase tracking-tighter">Your cart is empty</h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto font-medium">Upgrade your setup. Browse our latest high-performance arrivals.</p>
        <button onClick={() => window.location.hash = '#/shop'} className="px-10 py-5 bg-brand text-white rounded-2xl font-black shadow-xl shadow-brand/20 active:scale-95 transition-all">
          Browse Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-black mb-12 flex items-center gap-4 dark:text-white uppercase tracking-tighter">
        <ShoppingBag size={40} className="text-brand" />
        {t.cart}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        <div className="lg:col-span-2 space-y-6">
          {cart.map((item) => {
            const price = item.product.discountPrice || item.product.price;
            return (
              <div key={item.productId} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center gap-6 group hover:shadow-lg transition-all">
                <div className="w-full sm:w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700">
                  <img src={item.product.image} alt={item.product.name[lang]} className="w-full h-full object-cover" />
                </div>
                <div className="flex-grow space-y-1 text-center sm:text-left">
                  <h3 className="font-black text-lg dark:text-white line-clamp-1">{item.product.name[lang]}</h3>
                  <p className="text-gray-400 font-bold text-sm">Unit Price: {price.toLocaleString()} IQD</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                    <button onClick={() => removeFromCart(item.productId)} className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-500"><Minus size={16} /></button>
                    <span className="w-10 text-center font-black dark:text-white">{item.quantity}</span>
                    <button onClick={() => addToCart(item.product)} className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-500"><Plus size={16} /></button>
                  </div>
                  <button onClick={() => removeFromCart(item.productId)} className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"><Trash2 size={20} /></button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl space-y-8 sticky top-24 transition-colors">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-in shake duration-300">
              <AlertCircle size={20} className="shrink-0" /> {error}
            </div>
          )}

          {!isCheckingOut ? (
            <>
              <h2 className="text-2xl font-black dark:text-white tracking-tighter uppercase">Summary</h2>
              <div className="space-y-4 border-b border-gray-100 dark:border-gray-700 pb-6">
                <div className="flex justify-between text-gray-500 font-bold">
                  <span>Subtotal</span>
                  <span>{subtotal.toLocaleString()} IQD</span>
                </div>
                <div className="flex justify-between text-gray-500 font-bold">
                  <span>Delivery Cost</span>
                  <span className="text-green-600 font-black">FREE</span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-xl font-black dark:text-white">Total</span>
                <span className="text-2xl font-black text-brand tracking-tighter">{subtotal.toLocaleString()} IQD</span>
              </div>
              <button onClick={() => setIsCheckingOut(true)} className="w-full py-5 bg-brand hover:bg-brand-dark text-white rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-brand/20">
                Proceed to Checkout
              </button>
            </>
          ) : (
            <form onSubmit={handlePlaceOrder} className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 mb-4">
                <button type="button" onClick={() => setIsCheckingOut(false)} className="text-brand font-black text-sm hover:underline">← Go Back</button>
                <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Recipient Info</h2>
              </div>
              
              <div className="space-y-4">
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand transition-colors" size={18} />
                  <input required placeholder={t.fullName} value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-brand dark:text-white font-bold" />
                </div>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand transition-colors" size={18} />
                  <input required type="tel" placeholder="07XXXXXXXXX" pattern="07[0-9]{9}" value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-brand dark:text-white font-bold" />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-brand dark:text-white appearance-none font-bold">
                    {IRAQ_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-4 text-gray-400 group-focus-within:text-brand transition-colors" size={18} />
                  <textarea required placeholder={t.address} rows={2} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-brand dark:text-white font-bold" />
                </div>
                <div className="relative group">
                  <FileText className="absolute left-4 top-4 text-gray-400 group-focus-within:text-brand transition-colors" size={18} />
                  <textarea placeholder={t.note} rows={2} value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-brand dark:text-white font-bold" />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                  <span className="font-black text-lg dark:text-white">Final Total</span>
                  <span className="text-2xl font-black text-brand tracking-tighter">{subtotal.toLocaleString()} IQD</span>
                </div>
                <button type="submit" disabled={isProcessing} className="w-full py-5 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black transition-all shadow-xl shadow-green-200/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isProcessing ? <Loader2 className="animate-spin" size={24} /> : "Submit Order (COD)"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartPage;
