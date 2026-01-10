
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Category, Product, Order, AppSettings, AuthState, OrderStatus, CartItem } from './types';
import { INITIAL_SETTINGS } from './constants';

/**
 * Robust environment variable retrieval.
 * Supports standard process.env and Vite's import.meta.env.
 */
const getEnv = (key: string): string => {
  try {
    // Check process.env (common in Node/CRA/some esbuild configs)
    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key] as string;
    }
    // Check import.meta.env (Vite / modern ESM)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) {
      // @ts-ignore
      return import.meta.env[key] as string;
    }
  } catch (e) {
    // Silently fail if environments are locked down
  }
  return '';
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');

let supabaseInstance: SupabaseClient | null = null;
const isConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Singleton getter for Supabase client.
 * Returns null if parameters are missing, allowing services to degrade gracefully.
 */
const getSupabase = (): SupabaseClient | null => {
  if (!isConfigured) {
    return null;
  }
  if (supabaseInstance) return supabaseInstance;

  try {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseInstance;
  } catch (e) {
    console.error('[SUPABASE_INIT_ERROR] Check your cloud database configuration.', e);
    return null;
  }
};

/**
 * Local Fallback Persistence
 * Ensures the app remains functional in environments where Supabase is not yet configured.
 */
const getLocal = <T>(key: string, fallback: T): T => {
  try {
    const val = localStorage.getItem(`imation_local_${key}`);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

const setLocal = (key: string, data: any) => {
  try {
    localStorage.setItem(`imation_local_${key}`, JSON.stringify(data));
  } catch (e) {
    console.error('[LOCAL_STORAGE_ERROR] Unable to persist data locally.', e);
  }
};

/**
 * Image Upload Utility
 * Uploads to Supabase Storage if configured; otherwise maintains data as base64.
 */
const uploadImage = async (base64: string): Promise<string> => {
  if (!base64 || !base64.startsWith('data:')) return base64;

  const sb = getSupabase();
  if (!sb) {
    console.warn('[STORAGE] Cloud not configured. Using local data URI for media.');
    return base64; 
  }

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
    const extension = contentType.split('/')[1];
    const fileName = `img_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;

    const { error } = await sb.storage
      .from('products')
      .upload(fileName, blob, { contentType, upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = sb.storage.from('products').getPublicUrl(fileName);
    return publicUrl;
  } catch (err) {
    console.error('[STORAGE_ERROR] Cloud upload failed, falling back to local encoding:', err);
    return base64;
  }
};

export const StorageService = {
  getAuth: async (): Promise<AuthState> => {
    const sb = getSupabase();
    if (!sb) return getLocal('auth', { isLoggedIn: false });
    try {
      const { data, error } = await sb.from('config').select('data').eq('key', 'auth').maybeSingle();
      if (error || !data) return getLocal('auth', { isLoggedIn: false });
      return data.data;
    } catch {
      return getLocal('auth', { isLoggedIn: false });
    }
  },
  setAuth: async (auth: AuthState): Promise<void> => {
    setLocal('auth', auth);
    const sb = getSupabase();
    if (!sb) return;
    await sb.from('config').upsert({ key: 'auth', data: auth });
  },

  getCategories: async (): Promise<Category[]> => {
    const sb = getSupabase();
    if (!sb) return getLocal('categories', []);
    try {
      const { data, error } = await sb.from('categories').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(cat => ({
        id: cat.id,
        name: { en: cat.name_en, ar: cat.name_ar, ku: cat.name_ku },
        image: cat.image
      }));
    } catch {
      return getLocal('categories', []);
    }
  },
  saveCategories: async (categories: Category[]): Promise<Category[]> => {
    const processed = await Promise.all(categories.map(async cat => ({
      id: cat.id,
      name: cat.name,
      image: await uploadImage(cat.image)
    })));
    
    setLocal('categories', processed);
    const sb = getSupabase();
    if (!sb) return processed;

    const dbPayload = processed.map(cat => ({
      id: cat.id,
      name_en: cat.name.en,
      name_ar: cat.name.ar,
      name_ku: cat.name.ku,
      image: cat.image,
      created_at: new Date().toISOString()
    }));

    await sb.from('categories').upsert(dbPayload);
    return processed;
  },

  getProducts: async (): Promise<Product[]> => {
    const sb = getSupabase();
    if (!sb) return getLocal('products', []);
    try {
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
    } catch {
      return getLocal('products', []);
    }
  },
  saveProducts: async (products: Product[]): Promise<Product[]> => {
    const processed = await Promise.all(products.map(async p => ({
      ...p,
      image: await uploadImage(p.image)
    })));

    setLocal('products', processed);
    const sb = getSupabase();
    if (!sb) return processed;

    const dbPayload = processed.map(p => ({
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
      image: p.image,
      created_at: new Date(p.createdAt).toISOString()
    }));

    await sb.from('products').upsert(dbPayload);
    return processed;
  },

  getSettings: async (): Promise<AppSettings> => {
    const sb = getSupabase();
    if (!sb) return getLocal('settings', INITIAL_SETTINGS);
    try {
      const { data, error } = await sb.from('config').select('data').eq('key', 'settings').maybeSingle();
      if (error || !data) return getLocal('settings', INITIAL_SETTINGS);
      return data.data;
    } catch {
      return getLocal('settings', INITIAL_SETTINGS);
    }
  },
  saveSettings: async (settings: AppSettings): Promise<void> => {
    const processedSettings = {
      ...settings,
      logo: await uploadImage(settings.logo),
      heroImage: await uploadImage(settings.heroImage),
      aboutImage: await uploadImage(settings.aboutImage)
    };
    setLocal('settings', processedSettings);
    const sb = getSupabase();
    if (!sb) return;
    await sb.from('config').upsert({ key: 'settings', data: processedSettings });
  },

  getOrders: async (): Promise<Order[]> => {
    const sb = getSupabase();
    if (!sb) return getLocal('orders', []);
    try {
      const { data: orders, error: ordersErr } = await sb.from('orders').select('*').order('created_at', { ascending: false });
      if (ordersErr) throw ordersErr;
      const { data: items } = await sb.from('order_items').select('*, products(*)');

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
    } catch {
      return getLocal('orders', []);
    }
  },
  getOrderByTracking: async (trackingNo: string): Promise<Order | null> => {
    const sb = getSupabase();
    if (!sb) {
      const localOrders = getLocal<Order[]>('orders', []);
      return localOrders.find(o => o.trackingNumber === trackingNo.toUpperCase()) || null;
    }
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
    if (!sb) {
      const orders = getLocal<Order[]>('orders', []);
      const idx = orders.findIndex(o => o.id === orderId);
      if (idx !== -1) {
        orders[idx].status = status;
        if (deliveryInfo) {
          orders[idx].deliveryPerson = deliveryInfo.person;
          orders[idx].deliveryPhone = deliveryInfo.phone;
        }
        setLocal('orders', orders);
        // Fix: Added non-null assertion as idx is verified to be in bounds.
        return orders[idx]!;
      }
      throw new Error("Order not found");
    }
    const updates: any = { status };
    if (deliveryInfo?.person) updates.delivery_name = deliveryInfo.person;
    if (deliveryInfo?.phone) updates.delivery_phone = deliveryInfo.phone;
    await sb.from('orders').update(updates).eq('id', orderId);
    // Fix: Replaced lexical 'this' with explicit 'StorageService' reference to fix potential undefined context in arrow functions.
    return await StorageService.getOrderByTracking(orderId) as Order;
  },
  submitOrder: async (order: Order): Promise<Order> => {
    const year = new Date().getFullYear();
    const timestamp = new Date().toISOString();
    const sb = getSupabase();
    
    if (!sb) {
      const orders = getLocal<Order[]>('orders', []);
      const trackingNo = `IM-${year}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const finalized = { ...order, trackingNumber: trackingNo, createdAt: Date.now() };
      orders.push(finalized);
      setLocal('orders', orders);
      return finalized;
    }

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
      await sb.from('order_items').insert(itemInserts);
      return { ...order, id: updated.id, trackingNumber: trackingNo, createdAt: new Date(timestamp).getTime() };
    } catch (err) {
      throw err;
    }
  }
};
