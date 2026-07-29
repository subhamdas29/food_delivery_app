import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { MenuItem } from '../types';
import { useCartStore } from '../store/cartStore';

interface MenuItemCardProps {
  item: MenuItem;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item }) => {
  const itemsInCart = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  const cartItem = itemsInCart.find((i) => i.itemId === item.itemId);
  const quantity = cartItem ? cartItem.quantity : 0;

  // Format price from paise to ₹ (25000 paise -> ₹250.00)
  const formattedPrice = (item.unitPrice / 100).toFixed(2);

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-orange-200">
      <div>
        {/* Header row: Veg/Non-Veg badge & Category */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                item.isVeg ? 'border-green-600' : 'border-red-600'
              }`}
              title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  item.isVeg ? 'bg-green-600' : 'bg-red-600'
                }`}
              />
            </span>
            {item.category && (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {item.category}
              </span>
            )}
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">
            ₹{formattedPrice}
          </span>
        </div>

        {/* Item Title & Description */}
        <h3 className="text-base font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
          {item.name}
        </h3>
        <p className="mt-1 text-xs text-gray-500 line-clamp-2 leading-relaxed">
          {item.description}
        </p>
      </div>

      {/* Action Footer */}
      <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-50">
        <span className="text-xs text-gray-400 font-mono">ID: {item.itemId}</span>

        {quantity === 0 ? (
          <button
            type="button"
            onClick={() => addItem(item)}
            className="flex items-center gap-1.5 rounded-xl border border-orange-500 bg-orange-50 px-4 py-1.5 text-xs font-bold text-orange-600 transition-all hover:bg-orange-500 hover:text-white active:scale-95 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            ADD
          </button>
        ) : (
          <div className="flex items-center rounded-xl bg-orange-500 text-white shadow-sm p-0.5">
            <button
              type="button"
              onClick={() => updateQuantity(item.itemId, -1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-orange-600 transition-colors active:scale-95"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-8 text-center text-xs font-bold font-mono">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => updateQuantity(item.itemId, 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-orange-600 transition-colors active:scale-95"
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
