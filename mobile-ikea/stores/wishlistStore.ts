import { create } from 'zustand';
import api from '../services/api';

export interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  articleNumber: string;
  price: {
    amount: number;
    currency: string;
  };
  quantity: number;
  image?: string;
  variant?: string;
}

interface WishlistState {
  items: WishlistItem[];
  count: number;
  isLoading: boolean;
  
  fetchWishlist: () => Promise<void>;
  addItem: (item: Omit<WishlistItem, 'id'>) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  count: 0,
  isLoading: false,

  fetchWishlist: async () => {
    // For now, just use local state (no backend call)
    set({ isLoading: false });
  },

  addItem: async (item) => {
    try {
      // Generate a unique ID for the item
      const newItem: WishlistItem = {
        ...item,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      };
      
      // Add to local state
      set((state) => ({
        items: [...state.items, newItem],
        count: state.count + 1,
      }));
      
      // TODO: Once backend is ready, uncomment this:
      // await api.addToWishlist(item);
      // await get().fetchWishlist();
    } catch (error) {
      console.error('Failed to add item:', error);
      throw error;
    }
  },

  removeItem: async (itemId) => {
    try {
      // Remove from local state
      set((state) => ({
        items: state.items.filter((item) => item.id !== itemId),
        count: state.count - 1,
      }));
      
      // TODO: Once backend is ready, uncomment this:
      // await api.removeFromWishlist(itemId);
    } catch (error) {
      console.error('Failed to remove item:', error);
      throw error;
    }
  },

  updateQuantity: (itemId, quantity) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      ),
    }));
  },

  clearWishlist: () => {
    set({ items: [], count: 0 });
  },
}));
