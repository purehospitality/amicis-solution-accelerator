import { create } from 'zustand';
import api from '../services/api';
import { WishlistItem } from './wishlistStore';

interface CheckoutState {
  sessionId: string | null;
  qrToken: string | null;
  total: number;
  status: 'idle' | 'pending' | 'paid' | 'expired';
  isPolling: boolean;
  
  createSession: (storeId: string, customerId: string, items: WishlistItem[], discounts: any[]) => Promise<void>;
  pollStatus: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  reset: () => void;
}

let pollInterval: NodeJS.Timeout | null = null;

export const useCheckoutStore = create<CheckoutState>((set, get) => ({
  sessionId: null,
  qrToken: null,
  total: 0,
  status: 'idle',
  isPolling: false,

  createSession: async (storeId, customerId, items, discounts) => {
    try {
      const data = await api.createCheckoutSession({
        storeId,
        customerId,
        items,
        discounts,
      });
      
      set({
        sessionId: data.sessionId,
        qrToken: data.qrToken,
        total: data.total,
        status: 'pending',
      });
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      throw error;
    }
  },

  pollStatus: async () => {
    const { sessionId } = get();
    if (!sessionId) return;

    try {
      const data = await api.getCheckoutSessionStatus(sessionId);
      set({ status: data.status });

      if (data.status === 'paid' || data.status === 'expired') {
        get().stopPolling();
      }
    } catch (error) {
      console.error('Failed to poll status:', error);
    }
  },

  startPolling: () => {
    if (pollInterval) return;
    
    set({ isPolling: true });
    pollInterval = setInterval(() => {
      get().pollStatus();
    }, 2000); // Poll every 2 seconds
  },

  stopPolling: () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    set({ isPolling: false });
  },

  reset: () => {
    get().stopPolling();
    set({
      sessionId: null,
      qrToken: null,
      total: 0,
      status: 'idle',
      isPolling: false,
    });
  },
}));
