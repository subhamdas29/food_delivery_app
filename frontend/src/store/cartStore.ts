import { create } from 'zustand';
import { MenuItem, CartItem, DeliveryAddress } from '../types';
import { DEFAULT_ADDRESS } from '../constants';

interface CartState {
  items: CartItem[];
  deliveryAddress: DeliveryAddress;
  addItem: (item: MenuItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  setDeliveryAddress: (address: Partial<DeliveryAddress>) => void;
  
  // Computed helpers
  getTotalCount: () => number;
  getSubtotalPaise: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  deliveryAddress: DEFAULT_ADDRESS,

  addItem: (item) => {
    set((state) => {
      const existing = state.items.find((i) => i.itemId === item.itemId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.itemId === item.itemId ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: 1 }] };
    });
  },

  removeItem: (itemId) => {
    set((state) => ({
      items: state.items.filter((i) => i.itemId !== itemId),
    }));
  },

  updateQuantity: (itemId, delta) => {
    set((state) => {
      const updated = state.items
        .map((i) => {
          if (i.itemId === itemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter((i): i is CartItem => i !== null);

      return { items: updated };
    });
  },

  clearCart: () => {
    set({ items: [] });
  },

  setDeliveryAddress: (address) => {
    set((state) => ({
      deliveryAddress: { ...state.deliveryAddress, ...address },
    }));
  },

  getTotalCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getSubtotalPaise: () => {
    return get().items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  },
}));
