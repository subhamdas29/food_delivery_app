import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, MapPin, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { placeOrder } from '../api/client';
import { RESTAURANT } from '../constants';

interface CartSidebarProps {
  onCloseMobile?: () => void;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({ onCloseMobile }) => {
  const navigate = useNavigate();
  const { items, deliveryAddress, updateQuantity, clearCart, setDeliveryAddress, getSubtotalPaise } = useCartStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const subtotalPaise = getSubtotalPaise();
  const subtotalRupees = subtotalPaise / 100;
  const deliveryFeePaise = items.length > 0 ? 3000 : 0; // ₹30 delivery fee
  const deliveryFeeRupees = deliveryFeePaise / 100;
  const totalRupees = (subtotalPaise + deliveryFeePaise) / 100;

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDeliveryAddress({ [name]: value });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || isLoading) return;

    if (!deliveryAddress.street.trim() || !deliveryAddress.city.trim() || !deliveryAddress.pincode.trim()) {
      setErrorMessage('Please fill in all delivery address fields.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const payload = {
        restaurantId: RESTAURANT.restaurantId,
        items: items.map((item) => ({
          itemId: item.itemId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        deliveryAddress: {
          street: deliveryAddress.street.trim(),
          city: deliveryAddress.city.trim(),
          pincode: deliveryAddress.pincode.trim(),
        },
        currency: 'INR',
      };

      const response = await placeOrder(payload);

      if (response && response.orderId) {
        // Clear cart state after successful acceptance
        clearCart();
        if (onCloseMobile) onCloseMobile();
        // Navigate to order tracking page
        navigate(`/orders/${response.orderId}`);
      } else {
        throw new Error('Invalid response received from order service.');
      }
    } catch (err: any) {
      console.error('Failed to place order:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to place order. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white shadow-xl lg:rounded-2xl border border-gray-100 overflow-hidden">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-6 py-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-orange-500" />
          <h2 className="text-base font-bold text-gray-900">Your Order</h2>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors"
          >
            Clear Cart
          </button>
        )}
      </div>

      {/* Cart Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Unable to place order</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-400 mb-3">
              <ShoppingCart className="h-8 w-8 stroke-[1.5]" />
            </div>
            <p className="text-sm font-semibold text-gray-800">Your cart is empty</p>
            <p className="mt-1 text-xs text-gray-400 max-w-[220px]">
              Add items from {RESTAURANT.name} menu to build your order.
            </p>
          </div>
        ) : (
          <>
            {/* Selected Items List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Items ({items.reduce((acc, item) => acc + item.quantity, 0)})
              </h3>
              {items.map((item) => (
                <div
                  key={item.itemId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      ₹{(item.unitPrice / 100).toFixed(2)} × {item.quantity}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.itemId, -1)}
                      className="p-1 text-gray-500 hover:text-orange-600 transition-colors"
                      aria-label="Decrease"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-bold font-mono">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.itemId, 1)}
                      className="p-1 text-gray-500 hover:text-orange-600 transition-colors"
                      aria-label="Increase"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <span className="w-16 text-right font-bold text-gray-900 font-mono text-xs">
                    ₹{((item.unitPrice * item.quantity) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Delivery Address Form */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                <MapPin className="h-3.5 w-3.5 text-orange-500" />
                Delivery Address
              </div>

              <form onSubmit={handlePlaceOrder} className="space-y-2.5">
                <div>
                  <label htmlFor="street" className="block text-[11px] font-medium text-gray-600 mb-1">
                    Street / Flat
                  </label>
                  <input
                    type="text"
                    id="street"
                    name="street"
                    value={deliveryAddress.street}
                    onChange={handleAddressChange}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    placeholder="e.g. 12 MG Road"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="city" className="block text-[11px] font-medium text-gray-600 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={deliveryAddress.city}
                      onChange={handleAddressChange}
                      required
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      placeholder="Kolkata"
                    />
                  </div>
                  <div>
                    <label htmlFor="pincode" className="block text-[11px] font-medium text-gray-600 mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      id="pincode"
                      name="pincode"
                      value={deliveryAddress.pincode}
                      onChange={handleAddressChange}
                      required
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                      placeholder="700001"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Bill Summary */}
            <div className="space-y-2 pt-3 border-t border-gray-100 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Item Total</span>
                <span className="font-mono">₹{subtotalRupees.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery Partner Fee</span>
                <span className="font-mono">₹{deliveryFeeRupees.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-gray-900 pt-2 border-t border-dashed border-gray-200">
                <span>To Pay</span>
                <span className="font-mono text-orange-600">₹{totalRupees.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer / Place Order Action */}
      {items.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-4">
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing Order...</span>
              </>
            ) : (
              <>
                <span>Place Order • ₹{totalRupees.toFixed(2)}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
