import { Category, Product, Order, AppSettings, AuthState, OrderStatus } from './types';

/**
 * Talks to the project's own PHP + MySQL API (server/api/*.php) instead of
 * a third-party cloud service — no external account, no risk of the store
 * going offline because a free-tier project paused itself.
 *
 * Every function below keeps the exact same name and shape it had when this
 * file called Supabase directly, so no page component needed to change.
 */

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body (e.g. a 204) — leave data as null
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

const get = (path: string) => apiFetch(path);
const post = (path: string, body: unknown) =>
  apiFetch(path, { method: 'POST', body: JSON.stringify(body) });

export const StorageService = {
  // AUTH
  getAuth: async (): Promise<AuthState> => {
    const res = await get('/api/auth.php?action=me');
    return { isLoggedIn: !!res.admin, weakPassword: !!res.admin?.weakPassword };
  },
  login: async (username: string, password: string): Promise<{ id: number; username: string; weakPassword: boolean }> => {
    const res = await post('/api/auth.php?action=login', { username, password });
    return res.admin;
  },
  logout: async (): Promise<void> => {
    await post('/api/auth.php?action=logout', {});
  },
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await post('/api/auth.php?action=changePassword', { currentPassword, newPassword });
  },

  // CATEGORIES
  getCategories: async (): Promise<Category[]> => {
    return get('/api/catalog.php?resource=categories');
  },
  saveCategories: async (categories: Category[]): Promise<Category[]> => {
    return post('/api/catalog.php?resource=categories', categories);
  },

  // PRODUCTS
  getProducts: async (): Promise<Product[]> => {
    return get('/api/catalog.php?resource=products');
  },
  saveProducts: async (products: Product[]): Promise<Product[]> => {
    return post('/api/catalog.php?resource=products', products);
  },

  // SETTINGS
  getSettings: async (): Promise<AppSettings | null> => {
    return get('/api/settings.php');
  },
  saveSettings: async (settings: AppSettings): Promise<void> => {
    await post('/api/settings.php', settings);
  },

  // ORDERS
  getOrders: async (): Promise<Order[]> => {
    return get('/api/orders.php?action=list');
  },
  getPendingOrderCount: async (): Promise<number> => {
    const res = await get('/api/orders.php?action=count&status=Pending');
    return res.count;
  },
  getOrderByTracking: async (trackingNo: string): Promise<Order | null> => {
    const res = await get(`/api/orders.php?action=track&code=${encodeURIComponent(trackingNo.toUpperCase())}`);
    return res.order;
  },
  updateOrderStatus: async (orderId: string, status: OrderStatus, deliveryInfo?: { person?: string, phone?: string }): Promise<Order> => {
    return post('/api/orders.php?action=updateStatus', {
      orderId: Number(orderId),
      status,
      deliveryPerson: deliveryInfo?.person,
      deliveryPhone: deliveryInfo?.phone,
    });
  },
  submitOrder: async (order: Order): Promise<Order> => {
    return post('/api/orders.php?action=submit', {
      customerName: order.customerName,
      phoneNumber: order.phoneNumber,
      city: order.city,
      address: order.address,
      note: order.note,
      items: order.items.map(item => ({ productId: item.productId, quantity: item.quantity })),
    });
  },
};
