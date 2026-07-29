import React from 'react';
import { ShoppingBag, Utensils, Sparkles } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

interface HeaderProps {
  onOpenCartMobile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCartMobile }) => {
  const totalCount = useCartStore((state) => state.getTotalCount());

  return (
    <header className="sticky top-0 z-40 w-full border-b border-orange-100 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-md shadow-orange-500/20">
            <Utensils className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-gray-900">
                Food<span className="text-orange-500">Rush</span>
              </span>
              <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                <Sparkles className="mr-1 h-3 w-3" /> Live
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">Lightning Fast Delivery</p>
          </div>
        </div>

        {/* Right side cart counter button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenCartMobile}
            className="relative flex items-center gap-2 rounded-xl bg-orange-50 px-3.5 py-2 text-sm font-semibold text-orange-600 transition-all hover:bg-orange-100 active:scale-95"
            aria-label="View shopping cart"
          >
            <ShoppingBag className="h-5 w-5 text-orange-500" />
            <span className="hidden sm:inline">Cart</span>
            {totalCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white shadow-sm animate-pulse">
                {totalCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
