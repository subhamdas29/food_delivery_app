import React, { useState } from 'react';
import { Header } from '../components/Header';
import { MenuItemCard } from '../components/MenuItemCard';
import { CartSidebar } from '../components/CartSidebar';
import { RESTAURANT, MENU_ITEMS } from '../constants';
import { useCartStore } from '../store/cartStore';
import { Star, Clock, MapPin, ShoppingBag, X } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const totalCount = useCartStore((state) => state.getTotalCount());
  const subtotalPaise = useCartStore((state) => state.getSubtotalPaise());

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      {/* Top Navigation */}
      <Header onOpenCartMobile={() => setIsMobileCartOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left / Main Section: Restaurant Details & Menu Grid */}
          <section className="lg:col-span-8 space-y-6">
            
            {/* Restaurant Hero Card */}
            <div className="overflow-hidden rounded-3xl bg-white border border-gray-100 shadow-sm">
              <div className="relative h-48 sm:h-56 w-full bg-gray-200">
                <img
                  src={RESTAURANT.bannerImage}
                  alt={RESTAURANT.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                
                <div className="absolute bottom-4 left-6 right-6 text-white">
                  <span className="inline-block rounded-full bg-orange-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm mb-2">
                    {RESTAURANT.cuisine}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {RESTAURANT.name}
                  </h1>
                </div>
              </div>

              {/* Restaurant Stats */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white text-xs sm:text-sm">
                <div className="flex items-center gap-6 text-gray-600">
                  <div className="flex items-center gap-1.5 font-bold text-gray-900">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span>{RESTAURANT.rating}</span>
                    <span className="text-xs text-gray-400 font-normal">({RESTAURANT.ratingCount})</span>
                  </div>

                  <div className="flex items-center gap-1.5 font-medium text-gray-600">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span>{RESTAURANT.deliveryTime}</span>
                  </div>

                  <div className="flex items-center gap-1.5 font-medium text-gray-600">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{RESTAURANT.location}</span>
                  </div>
                </div>

                <div className="text-xs text-gray-400 font-mono">
                  ID: {RESTAURANT.restaurantId}
                </div>
              </div>
            </div>

            {/* Menu Header */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                  Recommended Menu
                </h2>
                <p className="text-xs text-gray-500">Freshly prepared authentic North Indian dishes</p>
              </div>
              <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                {MENU_ITEMS.length} Items Available
              </span>
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MENU_ITEMS.map((item) => (
                <MenuItemCard key={item.itemId} item={item} />
              ))}
            </div>

          </section>

          {/* Right Section: Persistent Cart Sidebar (Desktop) */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-20 h-[calc(100vh-6rem)]">
            <CartSidebar />
          </aside>

        </div>
      </main>

      {/* Floating Mobile Cart Trigger Bar (when items present in cart) */}
      {totalCount > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-30">
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full flex items-center justify-between rounded-2xl bg-orange-500 p-4 text-white shadow-xl shadow-orange-500/30 transition-transform active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 font-bold text-sm">
                {totalCount}
              </div>
              <div className="text-left">
                <p className="text-xs text-orange-100 font-medium">View Cart</p>
                <p className="text-sm font-bold font-mono">
                  ₹{((subtotalPaise + 3000) / 100).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold">
              <span>Checkout</span>
              <ShoppingBag className="h-4 w-4" />
            </div>
          </button>
        </div>
      )}

      {/* Mobile Cart Drawer Backdrop & Sheet */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-h-[85vh] rounded-t-3xl bg-white flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(false)}
              className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              aria-label="Close cart"
            >
              <X className="h-4 w-4" />
            </button>
            <CartSidebar onCloseMobile={() => setIsMobileCartOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
};
