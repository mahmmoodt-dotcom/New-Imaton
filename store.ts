
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Category, Product, Order, AppSettings, AuthState, OrderStatus, CartItem } from './types';
import { INITIAL_SETTINGS } from './constants';

// Environment variables for Supabase configuration. 
// We check multiple possible keys to ensure compatibility across different deployment environments.
const SUPABASE_URL = (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL)) || '';
const SUPABASE_ANON_KEY = (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY)) || '';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Singleton getter for Supabase client.
 * Does not throw immediately to prevent app-wide crashes on load.
 * Instead, it returns a client or throws a descriptive error when called.
 */
const getSupabase = (): SupabaseClient => {
  if (supabaseInstance) return supabaseInstance;
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[SUPABASE_CONFIG_ERROR] Connection parameters are missing. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    throw new Error('Supabase configuration missing. Please set your Supabase URL and Anon Key in the environment variables to enable persistence.');
  }

  try {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseInstance;
  } catch (e) {
    console.error('[SUPABASE_INIT_ERROR] Failed to initialize Supabase client:', e);
    throw new Error('Cloud database initialization failed. Check your network connection and configuration.');
  }
};

/**
 * Image Upload Utility
 * Converts Base64 to Blob and uploads to Supabase 'products' bucket.
 */
const uploadImage = async (base64: string): Promise<string> => {
  if (!base64 || !base64.startsWith('data:')) return base64; // Return as-is if already a URL

  const sb = getSupabase();
  try {
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const byteCharacters = atob(parts[1]);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: contentType });
    const fileName = `img_${Date.now()}_${Math.random().toString(36).substring(7)}.${contentType.split('/')[1]}`;

    const { data, error } = await sb.storage
      .from('products')
      .upload(fileName, blob, { contentType, upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = sb.storage.from('products').getPublicUrl(fileName);
    console.log(`[STORAGE] Upload success: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error('[STORAGE_ERROR] Image upload failed:', err);
    throw new Error('Failed to upload image to Cloud Storage.');
  }
};

export const StorageService = {
  // AUTH
  getAuth: async (): Promise<AuthState> => {
    try {
      const sb = getSupabase();
      const { data, error } = await sb.from('config').select('data').eq('key', 'auth').maybeSingle();
      if (error || !data) return { isLoggedIn: false };
      return data.data;
    } catch (e) {
      console.warn('[STORAGE_SERVICE] Falling back to default auth state due to missing config');
      return { isLoggedIn: false };
    }
  },
  setAuth: async (auth: AuthState): Promise<void> => {
    const sb = getSupabase();
    await sb.from('config').upsert({ key: 'auth', data: auth });
  },

  // CATEGORIES
  getCategories: async (): Promise<Category[]> => {
    const sb = getSupabase();
    const { data, error } = await sb.from('categories').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    
    return (data || []).map(cat => ({
      id: cat.id,
      name: { en: cat.name_en, ar: cat.name_ar, ku: cat.name_ku },
      image: cat.image
    }));
  },
  saveCategories: async (categories: Category[]): Promise<Category[]> => {
    const sb = getSupabase();
    const processed = await Promise.all(categories.map(async cat => ({
      id: cat.id,
      name_en: cat.name.en,
      name_ar: cat.name.ar,
      name_ku: cat.name.ku,
      image: await uploadImage(cat.image),
      created_at: new Date().toISOString()
    })));
    const { error } = await sb.from('categories').upsert(processed);
    if (error) throw error;
    return categories;
  },

  // PRODUCTS
  getProducts: async (): Promise<Product[]> => {
    const sb = getSupabase();
    const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(p => ({
      id: p.id,
      categoryId: p.category_id,
      name: { en: p.name_en, ar: p.name_ar, ku: p.name_ku },
      description: { 
        en: p.description_en || p.description, 
        ar: p.description_ar || p.description, 
        ku: p.description_ku || p.description 
      },
      price: p.price,
      discountPrice: p.has_discount ? p.discount : undefined,
      image: p.image,
      isAvailable: p.available,
      createdAt: new Date(p.created_at).getTime()
    }));
  },
  saveProducts: async (products: Product[]): Promise<Product[]> => {
    const sb = getSupabase();
    const processed = await Promise.all(products.map(async p => ({
      id: p.id,
      category_id: p.categoryId,
      name_en: p.name.en,
      name_ar: p.name.ar,
      name_ku: p.name.ku,
      description_en: p.description.en,
      description_ar: p.description.ar,
      description_ku: p.description.ku,
      description: p.description.en,
      price: p.price,
      discount: p.discountPrice || 0,
      has_discount: !!p.discountPrice,
      available: p.isAvailable,
      image: await uploadImage(p.image),
      created_at: new Date(p.createdAt).toISOString()
    })));
    const { error } = await sb.from('products').upsert(processed);
    if (error) throw error;
    return products;
  },

  // SETTINGS
  getSettings: async (): Promise<AppSettings> => {
    try {
      const sb = getSupabase();
      const { data, error } = await sb.from('config').select('data').eq('key', 'settings').maybeSingle();
      if (error || !data) return INITIAL_SETTINGS;
      return data.data;
    } catch (e) {
      console.warn('[STORAGE_SERVICE] Falling back to initial settings due to missing config');
      return INITIAL_SETTINGS;
    }
  },
  saveSettings: async (settings: AppSettings): Promise<void> => {
    const sb = getSupabase();
    const processedSettings = {
      ...settings,
      logo: await uploadImage(settings.logo),
      heroImage: await uploadImage(settings.heroImage),
      aboutImage: await uploadImage(settings.aboutImage)
    };
    const { error } = await sb.from('config').upsert({ key: 'settings', data: processedSettings });
    if (error) throw error;
  },

  // ORDERS
  getOrders: async (): Promise<Order[]> => {
    const sb = getSupabase();
    const { data: orders, error: ordersErr } = await sb.from('orders').select('*').order('created_at', { ascending: false });
    if (ordersErr) throw ordersErr;
    const { data: items, error: itemsErr } = await sb.from('order_items').select('*, products(*)');
    if (itemsErr) throw itemsErr;

    return (orders || []).map(o => {
      const orderItems = (items || []).filter(item => item.order_id === o.id);
      const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return {
        id: o.id,
        invoiceNumber: o.id,
        trackingNumber: o.tracking_number,
        customerName: o.customer_name,
        phoneNumber: o.phone,
        city: o.city,
        address: o.address,
        note: o.note,
        status: o.status as OrderStatus,
        deliveryPerson: o.delivery_name,
        deliveryPhone: o.delivery_phone,
        createdAt: new Date(o.created_at).getTime(),
        totalAmount,
        items: orderItems.map(item => ({
          productId: item.product_id,
          quantity: item.quantity,
          product: {
            id: item.products.id,
            name: { en: item.products.name_en, ar: item.products.name_ar, ku: item.products.name_ku },
            image: item.products.image,
            price: item.products.price,
            discountPrice: item.products.has_discount ? item.products.discount : undefined
          } as any
        }))
      };
    });
  },
  getOrderByTracking: async (trackingNo: string): Promise<Order | null> => {
    const sb = getSupabase();
    const { data: o, error } = await sb.from('orders').select('*').eq('tracking_number', trackingNo.toUpperCase()).maybeSingle();
    if (error || !o) return null;
    const { data: items } = await sb.from('order_items').select('*, products(*)').eq('order_id', o.id);
    const orderItems = items || [];
    const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return {
      id: o.id,
      invoiceNumber: o.id,
      trackingNumber: o.tracking_number,
      customerName: o.customer_name,
      phoneNumber: o.phone,
      city: o.city,
      address: o.address,
      note: o.note,
      status: o.status as OrderStatus,
      deliveryPerson: o.delivery_name,
      deliveryPhone: o.delivery_phone,
      createdAt: new Date(o.created_at).getTime(),
      totalAmount,
      items: orderItems.map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
        product: {
          id: item.products.id,
          name: { en: item.products.name_en, ar: item.products.name_ar, ku: item.products.name_ku },
          image: item.products.image,
          price: item.products.price,
          discountPrice: item.products.has_discount ? item.products.discount : undefined
        } as any
      }))
    };
  },
  updateOrderStatus: async (orderId: string, status: OrderStatus, deliveryInfo?: { person?: string, phone?: string }): Promise<Order> => {
    const sb = getSupabase();
    const updates: any = { status };
    if (deliveryInfo?.person) updates.delivery_name = deliveryInfo.person;
    if (deliveryInfo?.phone) updates.delivery_phone = deliveryInfo.phone;
    const { data, error } = await sb.from('orders').update(updates).eq('id', orderId).select().single();
    if (error) throw error;
    const full = await StorageService.getOrderByTracking(data.tracking_number);
    if (!full) throw new Error("Order not found after update");
    return full;
  },
  submitOrder: async (order: Order): Promise<Order> => {
    const sb = getSupabase();
    const year = new Date().getFullYear();
    const timestamp = new Date().toISOString();
    try {
      const { data: inserted, error: insertError } = await sb.from('orders').insert({
        customer_name: order.customerName,
        phone: order.phoneNumber,
        city: order.city,
        address: order.address,
        note: order.note,
        status: 'Pending',
        tracking_number: '', 
        created_at: timestamp
      }).select().single();
      if (insertError) throw insertError;
      const trackingNo = `IM-${year}-${inserted.id.toString().slice(-6).toUpperCase()}`;
      const { data: updated, error: updateError } = await sb.from('orders').update({ tracking_number: trackingNo }).eq('id', inserted.id).select().single();
      if (updateError) throw updateError;
      const itemInserts = order.items.map(item => ({
        order_id: inserted.id,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.product.discountPrice || item.product.price
      }));
      const { error: itemsError } = await sb.from('order_items').insert(itemInserts);
      if (itemsError) throw itemsError;
      return { ...order, id: updated.id, trackingNumber: trackingNo, createdAt: new Date(timestamp).getTime() };
    } catch (err) {
      throw err;
    }
  }
};
