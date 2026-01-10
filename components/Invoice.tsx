
import React from 'react';
import { Order, Language, AppSettings } from '../types';

interface InvoiceProps {
  order: Order;
  settings: AppSettings;
  lang: Language;
}

const Invoice: React.FC<InvoiceProps> = ({ order, settings, lang }) => {
  if (!order || !order.items || order.items.length === 0) {
    console.error("Invoice generation failed: Order data is incomplete or empty", order);
    return (
      <div id="print-area" className="p-10 text-center text-red-600 font-bold">
        Error: Unable to generate invoice. Order data is missing.
      </div>
    );
  }

  const subtotal = order.items.reduce((acc, item) => {
    const price = item.product?.discountPrice || item.product?.price || 0;
    return acc + (price * item.quantity);
  }, 0);

  return (
    <div id="print-area" className="p-12 bg-white text-black font-sans leading-relaxed border-none">
      <div className="flex justify-between items-start mb-12 border-b-4 border-gray-900 pb-10">
        <div>
          <h1 className="text-6xl font-black text-[#e31b23] mb-4 tracking-tighter">INVOICE</h1>
          <div className="space-y-1">
            <p className="text-xl font-black">Invoice #: <span className="text-gray-600 font-bold">{order.id}</span></p>
            <p className="text-lg font-bold">Tracking: <span className="text-[#e31b23] font-black">{order.trackingNumber}</span></p>
            <p className="text-gray-500 font-medium">Date: {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        <div className="text-right">
          <img 
            src={settings.logo} 
            className="h-20 ml-auto mb-6 object-contain" 
            alt="Imation Logo" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Imation_logo.svg/1024px-Imation_logo.svg.png";
            }}
          />
          <h2 className="text-3xl font-black tracking-tight">Imation Computer Shop</h2>
          <p className="font-bold text-gray-600">{settings.phone1}</p>
          {settings.phone2 && <p className="font-bold text-gray-600">{settings.phone2}</p>}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-20 mb-16">
        <div>
          <h3 className="text-sm font-black uppercase text-gray-400 mb-4 tracking-widest border-b border-gray-100 pb-2">Billed To</h3>
          <p className="text-2xl font-black mb-2">{order.customerName}</p>
          <p className="text-xl font-bold mb-2 text-gray-700">{order.phoneNumber}</p>
          <p className="text-lg font-medium text-gray-600 leading-snug">
            {order.city}<br />
            {order.address}
          </p>
          {order.note && (
            <div className="mt-6 p-5 bg-gray-50 border-l-4 border-[#e31b23] rounded-r-xl">
              <span className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Customer Note</span>
              <p className="text-sm italic font-medium">"{order.note}"</p>
            </div>
          )}
        </div>
        <div className="text-right flex flex-col justify-end pb-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-black uppercase text-gray-400 mb-2 tracking-widest">Payment Method</h3>
              <p className="text-xl font-black uppercase">Cash on Delivery</p>
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-gray-400 mb-2 tracking-widest">Shipment Status</h3>
              <p className="text-xl font-black uppercase text-[#e31b23]">{order.status}</p>
            </div>
          </div>
        </div>
      </div>

      <table className="w-full mb-16">
        <thead>
          <tr className="border-b-4 border-black text-left">
            <th className="py-5 font-black uppercase text-sm tracking-widest">Item Description</th>
            <th className="py-5 text-center font-black uppercase text-sm tracking-widest">Quantity</th>
            <th className="py-5 text-right font-black uppercase text-sm tracking-widest">Unit Price</th>
            <th className="py-5 text-right font-black uppercase text-sm tracking-widest">Subtotal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {order.items.map((item, idx) => {
            const unitPrice = item.product?.discountPrice || item.product?.price || 0;
            return (
              <tr key={idx} className="group">
                <td className="py-8 font-black text-lg">
                  {item.product?.name?.[lang] || item.product?.name?.['en'] || "Premium Tech Product"}
                  <p className="text-xs font-bold text-gray-400 uppercase mt-1">ID: {item.productId.slice(0, 8)}</p>
                </td>
                <td className="py-8 text-center text-xl font-bold">x{item.quantity}</td>
                <td className="py-8 text-right text-lg font-medium">{unitPrice.toLocaleString()} IQD</td>
                <td className="py-8 text-right font-black text-xl">
                  {(unitPrice * item.quantity).toLocaleString()} IQD
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-96 space-y-4">
          <div className="flex justify-between items-center text-gray-500 font-bold px-4">
            <span className="uppercase tracking-widest text-xs">Gross Subtotal</span>
            <span>{subtotal.toLocaleString()} IQD</span>
          </div>
          <div className="flex justify-between items-center text-green-600 font-bold px-4">
            <span className="uppercase tracking-widest text-xs">Delivery Charge</span>
            <span className="uppercase font-black">Free Shipping</span>
          </div>
          <div className="flex justify-between items-center text-4xl font-black bg-black text-white p-8 rounded-[2rem] shadow-2xl">
            <span className="tracking-tighter uppercase text-xl">Total Due</span>
            <span className="tracking-tighter">{order.totalAmount.toLocaleString()} IQD</span>
          </div>
        </div>
      </div>
      
      <div className="mt-32 pt-12 border-t border-gray-100 flex flex-col items-center gap-4">
        <div className="text-center">
          <p className="text-gray-400 text-xs font-black uppercase tracking-[0.4em] mb-4">
            Imation Iraq • Technology Redefined
          </p>
          <div className="flex justify-center gap-8 text-[10px] font-black uppercase text-gray-500">
            <span>Baghdad, Iraq</span>
            <span>Warranty Supported</span>
            <span>24/7 Support</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invoice;
