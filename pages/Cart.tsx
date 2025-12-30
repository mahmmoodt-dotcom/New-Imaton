
import React, { useState } from 'react';
import { ShoppingBag, Trash2, Plus, Minus, Download, CheckCircle2, Phone, MapPin, User, FileText, Loader2 } from 'lucide-react';
import { useApp, Logger } from '../App';
import { IRAQ_CITIES } from '../constants';
import { StorageService } from '../store';
import { Order } from '../types';

const CartPage: React.FC = () => {
  const { cart, removeFromCart, addToCart, t, lang, clearCart, settings } = useApp();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderComplete, setOrderComplete] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
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
    if (cart.length === 0) return;

    if (!formData.fullName || !formData.phoneNumber || !formData.address) {
      alert("Please fill all required fields");
      return;
    }
    if (!/^07[0-9]{9}$/.test(formData.phoneNumber)) {
      alert("Invalid phone number format. Use 07XXXXXXXXX");
      return;
    }

    try {
      setIsProcessing(true);
      const orders = await StorageService.getOrders();
      const nextInvoiceNo = orders.length > 0 ? Math.max(...orders.map(o => o.invoiceNumber)) + 1 : 1;
      const trackingNo = 'TRK' + Math.random().toString(36).substring(2, 9).toUpperCase();

      const newOrder: Order = {
        id: Date.now().toString(),
        invoiceNumber: nextInvoiceNo,
        trackingNumber: trackingNo,
        customerName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        city: formData.city,
        address: formData.address,
        note: formData.note,
        items: [...cart],
        totalAmount: subtotal,
        status: 'Pending',
        createdAt: Date.now()
      };

      await StorageService.saveOrders([...orders, newOrder]);
      setOrderComplete(newOrder);
      Logger.info(`Order placed successfully: Inv#${newOrder.invoiceNumber}`);
      clearCart();
    } catch (err) {
      Logger.error("Failed to place order", err);
      alert("Error placing order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (!orderComplete) return;
    Logger.info(`Admin/User requested invoice download: Inv#${orderComplete.invoiceNumber}`);
    const invoiceEl = document.getElementById('printable-invoice');
    if (invoiceEl) {
      const originalContent = document.body.innerHTML;
      document.body.innerHTML = invoiceEl.innerHTML;
      window.print();
      document.body.innerHTML = originalContent;
      window.location.reload(); 
    }
  };

  if (orderComplete) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-8 lg:p-12 text-center shadow-xl">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-bold mb-4">{t.orderSuccess}</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Thank you for your order. Our team will contact you shortly for delivery.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-400 uppercase font-bold block mb-1">{t.invoiceNo}</span>
              <span className="text-xl font-bold">#{orderComplete.invoiceNumber}</span>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-400 uppercase font-bold block mb-1">{t.trackingNo}</span>
              <span className="text-xl font-bold">{orderComplete.trackingNumber}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={handleDownloadInvoice}
              className="px-8 py-4 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            >
              <Download size={20} />
              {t.downloadInvoice}
            </button>
            <a 
              href={`https://wa.me/${settings.phone1}?text=Hello, I just placed an order. Invoice: #${orderComplete.invoiceNumber}. Tracking: ${orderComplete.trackingNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-green-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all"
            >
              <Phone size={20} />
              WhatsApp Confirmation
            </a>
          </div>

          {/* Hidden Printable Invoice */}
          <div id="printable-invoice" className="hidden p-10 text-left bg-white text-black font-sans">
            <div className="flex justify-between items-start mb-10 border-b-2 border-gray-200 pb-10">
              <div>
                <h1 className="text-5xl font-black text-brand mb-2">INVOICE</h1>
                <p className="text-lg font-bold">No: #{orderComplete.invoiceNumber}</p>
                <p className="text-gray-500">Date: {new Date(orderComplete.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <img src={settings.logo} className="h-16 ml-auto mb-4" alt="Imation" />
                <h2 className="text-2xl font-black">Imation Computer Shop</h2>
                <p className="font-bold">{settings.phone1}</p>
                <p className="text-sm text-gray-500">Baghdad, Iraq</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-20 mb-12">
              <div>
                <h3 className="text-xs font-black uppercase text-gray-400 mb-3">Customer Information</h3>
                <p className="text-xl font-bold mb-1">{orderComplete.customerName}</p>
                <p className="text-lg mb-1">{orderComplete.phoneNumber}</p>
                <p className="text-gray-600">{orderComplete.city}, {orderComplete.address}</p>
              </div>
              <div className="text-right">
                <h3 className="text-xs font-black uppercase text-gray-400 mb-3">Order Details</h3>
                <p className="font-bold">Tracking ID: <span className="text-brand">{orderComplete.trackingNumber}</span></p>
                <p className="font-bold">Payment Method: Cash on Delivery</p>
                {orderComplete.note && (
                   <div className="mt-4 text-left bg-gray-50 p-3 rounded-lg border italic text-sm">
                      <span className="font-black text-[10px] block not-italic uppercase text-gray-400">Customer Note</span>
                      {orderComplete.note}
                   </div>
                )}
              </div>
            </div>

            <table className="w-full mb-12 border-collapse">
              <thead>
                <tr className="border-b-4 border-black text-left">
                  <th className="py-4 font-black">Product</th>
                  <th className="py-4 text-center font-black">Quantity</th>
                  <th className="py-4 text-right font-black">Unit Price</th>
                  <th className="py-4 text-right font-black">Discount</th>
                  <th className="py-4 text-right font-black">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {orderComplete.items.map((item, idx) => {
                  const unitPrice = item.product.price;
                  const discountedPrice = item.product.discountPrice || unitPrice;
                  const discountAmount = unitPrice - discountedPrice;
                  const rowTotal = discountedPrice * item.quantity;
                  return (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-6">
                         <p className="font-bold">{item.product.name.en}</p>
                         <p className="text-xs text-gray-400">SKU: {item.product.id}</p>
                      </td>
                      <td className="py-6 text-center font-bold text-lg">{item.quantity}</td>
                      <td className="py-6 text-right">{unitPrice.toLocaleString()} IQD</td>
                      <td className="py-6 text-right text-red-500">-{discountAmount.toLocaleString()} IQD</td>
                      <td className="py-6 text-right font-bold">{rowTotal.toLocaleString()} IQD</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-80 space-y-4">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-bold">Subtotal</span>
                  <span>{orderComplete.totalAmount.toLocaleString()} IQD</span>
                </div>
                <div className="flex justify-between items-center text-lg">
                  <span className="font-bold">Shipping</span>
                  <span className="text-green-600 font-bold uppercase">Free</span>
                </div>
                <div className="flex justify-between items-center border-t-4 border-black pt-4">
                  <span className="text-3xl font-black">TOTAL</span>
                  <span className="text-3xl font-black text-brand">{orderComplete.totalAmount.toLocaleString()} IQD</span>
                </div>
              </div>
            </div>

            <div className="mt-24 pt-10 border-t border-gray-100 text-center">
              <p className="text-xl font-bold mb-2">Thank you for choosing Imation!</p>
              <p className="text-gray-400">For any inquiries, please call {settings.phone1} or {settings.phone2}</p>
            </div>
          </div>
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
        <h2 className="text-3xl font-bold mb-4">Your cart is empty</h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">Looks like you haven't added any gadgets yet. Explore our shop to find the best tech.</p>
        <button onClick={() => window.location.href = '#/shop'} className="px-8 py-4 bg-brand text-white rounded-2xl font-bold hover:bg-brand-dark transition-all">
          Explore Shop
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-extrabold mb-12 flex items-center gap-4">
        <ShoppingBag size={40} className="text-brand" />
        {t.cart}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        <div className="lg:col-span-2 space-y-6">
          {cart.map((item) => {
            const price = item.product.discountPrice || item.product.price;
            return (
              <div key={item.productId} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center gap-6 group hover:shadow-lg transition-all">
                <div className="w-full sm:w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-50 dark:bg-gray-900">
                  <img src={item.product.image} alt={item.product.name[lang]} className="w-full h-full object-cover" />
                </div>
                <div className="flex-grow space-y-1 text-center sm:text-left">
                  <h3 className="font-bold text-lg dark:text-white">{item.product.name[lang]}</h3>
                  <p className="text-gray-500 text-sm">Unit: {price.toLocaleString()} IQD</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                    <button 
                      onClick={() => removeFromCart(item.productId)}
                      className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-500"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-10 text-center font-bold dark:text-white">{item.quantity}</span>
                    <button 
                      onClick={() => addToCart(item.product)}
                      className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-500"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.productId)}
                    className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl space-y-8 sticky top-24 transition-colors">
          {!isCheckingOut ? (
            <>
              <h2 className="text-2xl font-bold dark:text-white">Summary</h2>
              <div className="space-y-4 border-b border-gray-100 dark:border-gray-700 pb-6">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>{subtotal.toLocaleString()} IQD</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Shipping</span>
                  <span className="text-green-600 font-bold">Standard</span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-xl font-bold dark:text-white">Total</span>
                <span className="text-2xl font-extrabold text-brand">{subtotal.toLocaleString()} IQD</span>
              </div>
              <button 
                onClick={() => setIsCheckingOut(true)}
                className="w-full py-4 bg-brand hover:bg-brand-dark text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-brand/20 dark:shadow-none"
              >
                {t.checkout}
              </button>
            </>
          ) : (
            <form onSubmit={handlePlaceOrder} className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 mb-4">
                <button type="button" onClick={() => setIsCheckingOut(false)} className="text-brand font-bold text-sm hover:underline">← Back</button>
                <h2 className="text-2xl font-bold dark:text-white">Customer Details</h2>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    required
                    type="text" 
                    placeholder={t.fullName}
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-brand dark:text-white"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    required
                    type="tel"
                    placeholder="07XXXXXXXXX"
                    pattern="07[0-9]{9}"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-brand dark:text-white"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select 
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-brand dark:text-white appearance-none"
                  >
                    {IRAQ_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-gray-400" size={18} />
                  <textarea 
                    required
                    placeholder={t.address}
                    rows={3}
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-brand dark:text-white"
                  />
                </div>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 text-gray-400" size={18} />
                  <textarea 
                    placeholder={t.note}
                    rows={2}
                    value={formData.note}
                    onChange={(e) => setFormData({...formData, note: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-brand dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                  <span className="font-bold text-lg dark:text-white">Total Due</span>
                  <span className="text-xl font-extrabold text-brand">{subtotal.toLocaleString()} IQD</span>
                </div>
                <button 
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-green-200 dark:shadow-none active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing && <Loader2 className="animate-spin" size={20} />}
                  {isProcessing ? 'Processing...' : t.placeOrder}
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
