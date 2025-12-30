
import { Category, Product, Order, AppSettings, AuthState } from './types';
import { INITIAL_SETTINGS } from './constants';

// Automatically detect the API root based on the current window location
// This makes the app work perfectly whether deployed or running locally.
const API_BASE_URL = window.location.origin;

const apiRequest = async (endpoint: string, method: string = 'GET', body?: any) => {
  const localKey = `iq_tech_${endpoint.replace(/\//g, '_')}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (method === 'GET') localStorage.setItem(localKey, JSON.stringify(data));
      return data;
    }
  } catch (error) {
    console.warn(`Cloud Sync: Backend unreachable at /api${endpoint}. Switching to Local Mode.`);
  }

  // Fallback Logic (The "Offline-First" layer)
  if (method === 'GET') {
    const cached = localStorage.getItem(localKey);
    if (cached) return JSON.parse(cached);
    if (endpoint === '/settings') return INITIAL_SETTINGS;
    if (endpoint === '/auth') return { isLoggedIn: false };
    return [];
  } else {
    // For POST/saves, we update local storage so the UI feels fast
    localStorage.setItem(localKey, JSON.stringify(body));
    return body;
  }
};

export const StorageService = {
  getAuth: () => apiRequest('/auth'),
  setAuth: (auth: AuthState) => apiRequest('/auth', 'POST', auth),
  getCategories: () => apiRequest('/categories'),
  saveCategories: (categories: Category[]) => apiRequest('/categories', 'POST', categories),
  getProducts: () => apiRequest('/products'),
  saveProducts: (products: Product[]) => apiRequest('/products', 'POST', products),
  getOrders: () => apiRequest('/orders'),
  saveOrders: (orders: Order[]) => apiRequest('/orders', 'POST', orders),
  getSettings: () => apiRequest('/settings'),
  saveSettings: (settings: AppSettings) => apiRequest('/settings', 'POST', settings),
  
  uploadImage: async (base64File: string): Promise<string> => {
    // For MVP deployment, we store images as base64 in the JSON DB.
    // For high-traffic production, replace this with a Cloudinary upload.
    return base64File; 
  }
};
