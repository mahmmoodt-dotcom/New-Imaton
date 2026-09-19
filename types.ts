
export type Language = 'en' | 'ar' | 'ku';
export type OrderStatus = 'Pending' | 'Delivering' | 'Delivered' | 'Canceled';
export type Theme = 'light' | 'dark';

export interface Category {
  id: string;
  name: Record<Language, string>;
  image: string;
}

export interface Product {
  id: string;
  name: Record<Language, string>;
  description: Record<Language, string>;
  price: number;
  discountPrice?: number;
  categoryId: string;
  image: string;
  isAvailable: boolean;
  createdAt: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
  product: Product;
}

export interface Order {
  id: string;
  invoiceNumber: number;
  trackingNumber: string;
  customerName: string;
  phoneNumber: string;
  city: string;
  address: string;
  note?: string;
  items: CartItem[];
  totalAmount: number;
  status: OrderStatus;
  deliveryPerson?: string;
  deliveryPhone?: string;
  createdAt: number;
}

export interface AppSettings {
  logo: string;
  heroImage: string;
  aboutImage: string;
  aboutText: Record<Language, string>;
  phone1: string;
  phone2: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  googleMapsUrl: string;
}

export interface AuthState {
  isLoggedIn: boolean;
  /** True while the account still uses an easily guessed password. */
  weakPassword: boolean;
}
