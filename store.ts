
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Category, Product, Order, AppSettings, AuthState, OrderStatus, CartItem } from './types';
import { INITIAL_SETTINGS } from './constants';

/**
 * Robust environment variable retrieval.
 * Supports standard process.env and Vite's import.meta.env.
 */
const getEnv = (key: string): string => {
  try {
    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key] as string;
    }
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) {
      // @ts-ignore
      return import.meta.env[key] as string;
    }
  } catch (e) {}
  return '';
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');

let supabaseInstance: SupabaseClient | null = null;

/**
 * Singleton getter for Supabase client.
 * Returns null if configuration is missing instead of throwing,
 * allowing services to degrade gracefully.
 */
const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[SUPABASE_CONFIG] Environment variables missing. Persistence is disabled.');
    return null;
  }

  try {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseInstance;
  } catch (e) {
    console.error('[SUPABASE_INIT_ERROR]', e);
    return null;
  }
};

/**
 * Image Upload Utility
 * Uploads to Supabase Storage bucket 'products'.
 * Returns the public URL of the uploaded image.
 */
const uploadImage = async (base64: string): Promise<string> => {
  if (!base64 || !base64.startsWith('data:')) return base64;

  const sb = getSupabase();
  if (!sb) return base64; // Fallback to base64 if no cloud storage

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
    const extension = contentType.split('/')[1] || 'png';
    const fileName = `public/${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;

    const { data, error } = await sb.storage
      .from('products')
      .upload(fileName, blob, { contentType, upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = sb.storage.from('products').getPublicUrl(fileName);
    return publicUrl;
  } catch (err) {
    console.error('[STORAGE_UPLOAD_ERROR]', err);
    return base64; // Fail gracefully
  }
};

export const StorageService = {
  // AUTH
  getAuth: async (): Promise<AuthState> => {
    const sb = getSupabase();
    if (!sb) return { isLoggedIn: false };
    try {
      const { data, error } = await sb.from('config').select('data').eq('key', 'auth').maybeSingle();
      if (error) throw error;
      return data?.data || { isLoggedIn: false };
    } catch {
      return { isLoggedIn: false };
    }
  },
  setAuth: async (auth: AuthState): Promise<void> => {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from('config').upsert({ key: 'auth', data: auth });
    if (error) throw error;
  },

  // CATEGORIES
  getCategories: async (): Promise<Category[]> => {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      const { data, error } = await sb.from('categories').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(cat => ({
        id: cat.id,
        name: { en: cat.name_en, ar: cat.name_ar, ku: cat.name_ku },
        image: cat.image
      }));
    } catch {
      return [];
    }
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
    
    if (sb) {
      const { error } = await sb.from('categories').upsert(processed);
      if (error) throw error;
      return StorageService.getCategories();
    }
    
    return categories; // Return local if no SB
  },

  // PRODUCTS
  getProducts: async (): Promise<Product[]> => {
    const sb = getSupabase();
    if (!sb) return [];
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
      return [];
    }
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

    if (sb) {
      const { error } = await sb.from('products').upsert(processed);
      if (error) throw error;
      return StorageService.getProducts();
    }
    
    return products;
  },

  // SETTINGS
  getSettings: async (): Promise<AppSettings> => {
    const sb = getSupabase();
    if (!sb) return INITIAL_SETTINGS;
    try {
      const { data, error } = await sb.from('config').select('data').eq('key', 'settings').maybeSingle();
      if (error) throw error;
      return data?.data || INITIAL_SETTINGS;
    } catch {
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
    if (sb) {
      const { error } = await sb.from('config').upsert({ key: 'settings', data: processedSettings });
      if (error) throw error;
    }
  },

  // ORDERS
  getOrders: async (): Promise<Order[]> => {
    const sb = getSupabase();
    if (!sb) return [];
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
      return [];
    }
  },
  getOrderByTracking: async (trackingNo: string): Promise<Order | null> => {
    const sb = getSupabase();
    if (!sb) return null;
    try {
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
    } catch {
      return null;
    }
  },
  updateOrderStatus: async (orderId: string, status: OrderStatus, deliveryInfo?: { person?: string, phone?: string }): Promise<Order> => {
    const sb = getSupabase();
    if (!sb) throw new Error('Cloud persistence unavailable.');
    
    const updates: any = { status };
    if (deliveryInfo?.person) updates.delivery_name = deliveryInfo.person;
    if (deliveryInfo?.phone) updates.delivery_phone = deliveryInfo.phone;
    
    const { error } = await sb.from('orders').update(updates).eq('id', orderId);
    if (error) throw error;
    
    const refreshed = await StorageService.getOrderByTracking(orderId);
    if (!refreshed) throw new Error('Order not found after update');
    return refreshed;
  },
  submitOrder: async (order: Order): Promise<Order> => {
    const sb = getSupabase();
    if (!sb) throw new Error('Cloud persistence unavailable.');

    const year = new Date().getFullYear();
    const timestamp = new Date().toISOString();

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

    const finalOrder = await StorageService.getOrderByTracking(trackingNo);
    if (!finalOrder) throw new Error('Failed to retrieve submitted order');
    return finalOrder;
  }
};
