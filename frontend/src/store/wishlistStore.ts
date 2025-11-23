import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WishlistItem {
  id: string;
  productId: string;
  sku?: string;
  name?: string;
  price?: {
    amount: number;
    currency: string;
  };
  addedAt: string;
}

interface WishlistState {
  items: WishlistItem[];
  customerId: string;
  storeId: string;
  setCustomerId: (customerId: string) => void;
  setStoreId: (storeId: string) => void;
  setItems: (items: WishlistItem[]) => void;
  addItem: (item: WishlistItem) => void;
  removeItem: (itemId: string) => void;
  clearWishlist: () => void;
  isInWishlist: (productId: string) => boolean;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      customerId: '',
      storeId: '',
      
      setCustomerId: (customerId: string) => set({ customerId }),
      
      setStoreId: (storeId: string) => set({ storeId }),
      
      setItems: (items: WishlistItem[]) => set({ items }),
      
      addItem: (item: WishlistItem) => 
        set((state) => ({
          items: [...state.items, item],
        })),
      
      removeItem: (itemId: string) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        })),
      
      clearWishlist: () => set({ items: [] }),
      
      isInWishlist: (productId: string) => {
        const state = get();
        return state.items.some((item) => item.productId === productId);
      },
    }),
    {
      name: 'wishlist-storage',
    }
  )
);
